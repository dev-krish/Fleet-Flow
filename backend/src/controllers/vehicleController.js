const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/error');
const { dispatchNotification, logActivity } = require('../services/notificationService');

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
const getVehicles = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').vehicles.getVehicles(req, res);
  const { availability, maintenanceStatus, type } = req.query;
  const filter = {};

  if (availability !== undefined) {
    filter.availability = availability === 'true';
  }
  if (maintenanceStatus) {
    filter.maintenanceStatus = maintenanceStatus;
  }
  if (type) {
    filter.type = type;
  }

  const vehicles = await Vehicle.find(filter)
    .populate('assignedDriver', 'name email phone avatar')
    .sort({ createdAt: -1 });

  return sendSuccess(res, vehicles, 'Vehicles retrieved successfully');
});

// @desc    Create a vehicle
// @route   POST /api/vehicles
// @access  Private (Admin, Dispatcher)
const createVehicle = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').vehicles.createVehicle(req, res);
  const { vehicleNumber, type, capacity, fuelStatus, maintenanceStatus } = req.body;

  if (!vehicleNumber || !type || !capacity) {
    return sendError(res, 'Vehicle number, type, and cargo capacity are required', 400);
  }

  // Check unique
  const exists = await Vehicle.findOne({ vehicleNumber });
  if (exists) {
    return sendError(res, `Vehicle with number ${vehicleNumber} already exists`, 400);
  }

  const vehicle = await Vehicle.create({
    vehicleNumber,
    type,
    capacity,
    fuelStatus: fuelStatus || 100,
    maintenanceStatus: maintenanceStatus || 'Satisfactory',
    availability: true,
  });

  await logActivity({
    user: req.user._id,
    action: 'CREATE_VEHICLE',
    details: `Registered vehicle asset: ${vehicleNumber}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, vehicle, 'Vehicle registered successfully', 201);
});

// @desc    Update vehicle details & maintenance
// @route   PUT /api/vehicles/:id
// @access  Private (Admin, Dispatcher)
const updateVehicle = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').vehicles.updateVehicle(req, res);
  const { type, capacity, fuelStatus, maintenanceStatus, availability } = req.body;

  let vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return sendError(res, 'Vehicle not found', 404);
  }

  if (type) vehicle.type = type;
  if (capacity) vehicle.capacity = capacity;
  if (fuelStatus !== undefined) vehicle.fuelStatus = fuelStatus;
  if (availability !== undefined) vehicle.availability = availability;

  if (maintenanceStatus) {
    vehicle.maintenanceStatus = maintenanceStatus;
    
    // Trigger lifecycle checks
    if (maintenanceStatus === 'Under Repair' || maintenanceStatus === 'Service Due') {
      vehicle.availability = false;
      
      // If maintenance status is under repair, release driver
      if (maintenanceStatus === 'Under Repair' && vehicle.assignedDriver) {
        const driverId = vehicle.assignedDriver;
        
        await Driver.findOneAndUpdate(
          { user: driverId },
          { status: 'Available', assignedVehicle: null }
        );
        
        vehicle.assignedDriver = null;

        await dispatchNotification({
          recipient: driverId,
          title: 'Vehicle Maintenance Recall',
          message: `Your assigned vehicle ${vehicle.vehicleNumber} is recalled for repairs. You are now unassigned.`,
          type: 'MAINTENANCE_DUE',
        });
      }

      await dispatchNotification({
        recipientRole: 'Admin',
        title: 'Vehicle Maintenance Needed',
        message: `Vehicle ${vehicle.vehicleNumber} has maintenance status: ${maintenanceStatus}.`,
        type: 'MAINTENANCE_DUE',
        metadata: { vehicleId: vehicle._id },
      });
    } else if (maintenanceStatus === 'Satisfactory' && !vehicle.assignedDriver) {
      // Re-enable availability if satisfactory and driver is free
      vehicle.availability = true;
    }
  }

  await vehicle.save();

  await logActivity({
    user: req.user._id,
    action: 'UPDATE_VEHICLE',
    details: `Updated vehicle details for ${vehicle.vehicleNumber}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, vehicle, 'Vehicle updated successfully');
});

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin)
const deleteVehicle = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').vehicles.deleteVehicle(req, res);
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return sendError(res, 'Vehicle not found', 404);
  }

  if (!vehicle.availability) {
    return sendError(res, 'Cannot delete a vehicle currently in active use', 400);
  }

  // Release assigned drivers if any
  if (vehicle.assignedDriver) {
    await Driver.findOneAndUpdate({ user: vehicle.assignedDriver }, { assignedVehicle: null, status: 'Available' });
  }

  await Vehicle.findByIdAndDelete(req.params.id);

  await logActivity({
    user: req.user._id,
    action: 'DELETE_VEHICLE',
    details: `Removed vehicle asset: ${vehicle.vehicleNumber}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, null, 'Vehicle deleted successfully');
});

module.exports = {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
