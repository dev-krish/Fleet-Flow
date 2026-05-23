const Driver = require('../models/Driver');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/error');
const { logActivity } = require('../services/notificationService');

// @desc    Get all drivers with profiles
// @route   GET /api/drivers
// @access  Private
const getDrivers = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').drivers.getDrivers(req, res);
  const drivers = await Driver.find()
    .populate('user', 'name email phone avatar status')
    .populate('assignedVehicle', 'vehicleNumber type capacity fuelStatus');

  return sendSuccess(res, drivers, 'Drivers retrieved successfully');
});

// @desc    Update driver profile & status
// @route   PUT /api/drivers/:id
// @access  Private (Admin, Dispatcher, Driver)
const updateDriverStatus = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').drivers.updateDriverStatus(req, res);
  const { status, experience, licenseNumber } = req.body;

  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return sendError(res, 'Driver profile not found', 404);
  }

  // Restrict driver to only updating their own status
  if (req.user.role === 'Driver' && driver.user.toString() !== req.user._id.toString()) {
    return sendError(res, 'You are not authorized to update this driver profile', 403);
  }

  if (status) driver.status = status;
  if (experience !== undefined) driver.experience = experience;
  if (licenseNumber) driver.licenseNumber = licenseNumber;

  await driver.save();

  await logActivity({
    user: req.user._id,
    action: 'UPDATE_DRIVER_STATUS',
    details: `Updated driver status to ${status || driver.status} for driver ID ${driver._id}`,
    ipAddress: req.ip,
  });

  const updatedDriver = await Driver.findById(driver._id)
    .populate('user', 'name email phone avatar status')
    .populate('assignedVehicle', 'vehicleNumber type capacity');

  return sendSuccess(res, updatedDriver, 'Driver status updated successfully');
});

// @desc    Get active tasks for logged-in Driver
// @route   GET /api/drivers/tasks
// @access  Private (Driver)
const getDriverTasks = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').drivers.getDriverTasks(req, res);
  if (req.user.role !== 'Driver') {
    return sendError(res, 'Only Drivers can access task feeds', 403);
  }

  // Find shipments assigned to this driver that are not Delivered or Cancelled
  const activeTasks = await Shipment.find({
    driver: req.user._id,
    status: { $in: ['Assigned', 'In Transit', 'Delayed'] },
  })
    .populate('vehicle', 'vehicleNumber type capacity fuelStatus')
    .populate('warehouseManager', 'name email phone')
    .sort({ scheduledDeliveryDate: 1 });

  return sendSuccess(res, activeTasks, 'Active driver tasks retrieved successfully');
});

module.exports = {
  getDrivers,
  updateDriverStatus,
  getDriverTasks,
};
