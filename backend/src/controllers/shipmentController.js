const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/error');
const { dispatchNotification, logActivity } = require('../services/notificationService');

// Route points interpolator
const generateRoutePoints = (from, to, pointsCount = 10) => {
  const points = [];
  for (let i = 0; i <= pointsCount; i++) {
    const ratio = i / pointsCount;
    const lat = from.lat + (to.lat - from.lat) * ratio;
    const lng = from.lng + (to.lng - from.lng) * ratio;
    points.push({ lat, lng });
  }
  return points;
};

// @desc    Get all shipments with filters
// @route   GET /api/shipments
// @access  Private
const getShipments = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.getShipments(req, res);
  const { status, priority, search, driver, vehicle, limit = 50, page = 1 } = req.query;

  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (driver) query.driver = driver;
  if (vehicle) query.vehicle = vehicle;

  if (search) {
    query.$or = [
      { shipmentId: { $regex: search, $options: 'i' } },
      { 'origin.name': { $regex: search, $options: 'i' } },
      { 'destination.name': { $regex: search, $options: 'i' } },
    ];
  }

  // If driver user logs in, restrict to their shipments unless admin/dispatcher
  if (req.user.role === 'Driver') {
    query.driver = req.user._id;
  }

  const count = await Shipment.countDocuments(query);
  const skip = (page - 1) * limit;

  const shipments = await Shipment.find(query)
    .populate('driver', 'name email phone avatar')
    .populate('vehicle', 'vehicleNumber type capacity fuelStatus')
    .populate('warehouseManager', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return sendSuccess(
    res,
    {
      shipments,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / limit),
      },
    },
    'Shipments retrieved successfully'
  );
});

// @desc    Get single shipment by ID
// @route   GET /api/shipments/:id
// @access  Private
const getShipmentById = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.getShipmentById(req, res);
  const shipment = await Shipment.findById(req.params.id)
    .populate('driver', 'name email phone avatar')
    .populate('vehicle', 'vehicleNumber type capacity fuelStatus maintenanceStatus currentLocation')
    .populate('warehouseManager', 'name email')
    .populate('statusHistory.updatedBy', 'name role')
    .populate('comments.user', 'name role avatar');

  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  // Restrict Driver reading others
  if (req.user.role === 'Driver' && shipment.driver && shipment.driver._id.toString() !== req.user._id.toString()) {
    return sendError(res, 'Access denied to this shipment', 403);
  }

  return sendSuccess(res, shipment, 'Shipment retrieved successfully');
});

// @desc    Create a new shipment
// @route   POST /api/shipments
// @access  Private (Admin, Dispatcher, Warehouse Manager)
const createShipment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.createShipment(req, res);
  const { origin, destination, scheduledDeliveryDate, priority, dimensions, routeCoordinates } = req.body;

  if (!origin || !destination || !scheduledDeliveryDate) {
    return sendError(res, 'Origin, destination, and scheduled delivery date are required', 400);
  }

  // Auto-generate shipment ID
  const count = await Shipment.countDocuments();
  const shipmentId = `FF-${10001 + count}`;

  // Interpolate route points if not provided
  let route = routeCoordinates;
  if (!route || route.length === 0) {
    route = generateRoutePoints(origin, destination, 15);
  }

  const shipment = await Shipment.create({
    shipmentId,
    origin,
    destination,
    scheduledDeliveryDate,
    priority: priority || 'Medium',
    dimensions: dimensions || {},
    routeCoordinates: route,
    currentCoordinates: { lat: origin.lat, lng: origin.lng },
    warehouseManager: req.user._id,
  });

  await logActivity({
    user: req.user._id,
    action: 'CREATE_SHIPMENT',
    details: `Created shipment ${shipmentId} from ${origin.name} to ${destination.name}`,
    ipAddress: req.ip,
  });

  await dispatchNotification({
    recipientRole: 'Dispatcher',
    title: 'New Shipment Created',
    message: `Shipment ${shipmentId} is ready for dispatch assignment.`,
    type: 'SYSTEM_ALERT',
    metadata: { shipmentId: shipment._id },
  });

  return sendSuccess(res, shipment, 'Shipment created successfully', 201);
});

// @desc    Update shipment details
// @route   PUT /api/shipments/:id
// @access  Private (Admin, Dispatcher, Warehouse Manager)
const updateShipment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.updateShipment(req, res);
  const { origin, destination, scheduledDeliveryDate, priority, dimensions } = req.body;

  let shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  if (shipment.status !== 'Pending' && shipment.status !== 'Assigned') {
    return sendError(res, 'Cannot edit shipment details after dispatch', 400);
  }

  if (origin) shipment.origin = origin;
  if (destination) shipment.destination = destination;
  if (scheduledDeliveryDate) shipment.scheduledDeliveryDate = scheduledDeliveryDate;
  if (priority) shipment.priority = priority;
  if (dimensions) shipment.dimensions = dimensions;

  // Re-generate route coordinates if origin/destination changed
  if (origin || destination) {
    shipment.routeCoordinates = generateRoutePoints(shipment.origin, shipment.destination, 15);
    shipment.currentCoordinates = { lat: shipment.origin.lat, lng: shipment.origin.lng };
  }

  await shipment.save();

  await logActivity({
    user: req.user._id,
    action: 'UPDATE_SHIPMENT',
    details: `Updated shipment details for ${shipment.shipmentId}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, shipment, 'Shipment updated successfully');
});

// @desc    Assign vehicle and driver to shipment
// @route   PUT /api/shipments/:id/assign
// @access  Private (Admin, Dispatcher)
const assignShipment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.assignShipment(req, res);
  const { vehicleId, driverId } = req.body;

  if (!vehicleId || !driverId) {
    return sendError(res, 'Please provide both vehicleId and driverId', 400);
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  if (shipment.status !== 'Pending' && shipment.status !== 'Assigned') {
    return sendError(res, `Cannot assign vehicle/driver to shipment in state: ${shipment.status}`, 400);
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return sendError(res, 'Vehicle not found', 404);
  }

  if (!vehicle.availability && vehicle.assignedDriver?.toString() !== driverId) {
    return sendError(res, 'Vehicle is currently unavailable or assigned to another driver', 400);
  }

  const driverUser = await User.findById(driverId);
  if (!driverUser || driverUser.role !== 'Driver') {
    return sendError(res, 'Driver user not found or invalid role', 404);
  }

  const driverProfile = await Driver.findOne({ user: driverId });
  if (!driverProfile) {
    return sendError(res, 'Driver profile record not found', 404);
  }

  // Pre-release old vehicle if driver had one
  if (driverProfile.assignedVehicle && driverProfile.assignedVehicle.toString() !== vehicleId) {
    await Vehicle.findByIdAndUpdate(driverProfile.assignedVehicle, { availability: true, assignedDriver: null });
  }

  // Pre-release old driver if vehicle had one
  if (vehicle.assignedDriver && vehicle.assignedDriver.toString() !== driverId) {
    await Driver.findOneAndUpdate({ user: vehicle.assignedDriver }, { status: 'Available', assignedVehicle: null });
  }

  // Update vehicle
  vehicle.availability = false;
  vehicle.assignedDriver = driverId;
  await vehicle.save();

  // Update driver profile
  driverProfile.status = 'On Duty';
  driverProfile.assignedVehicle = vehicleId;
  await driverProfile.save();

  // Update shipment
  shipment.vehicle = vehicleId;
  shipment.driver = driverId;
  shipment.status = 'Assigned';
  shipment.statusHistory.push({
    status: 'Assigned',
    updatedBy: req.user._id,
    reason: `Assigned Vehicle ${vehicle.vehicleNumber} and Driver ${driverUser.name}`,
  });

  await shipment.save();

  // Audit Logs & Notifications
  await logActivity({
    user: req.user._id,
    action: 'ASSIGN_SHIPMENT',
    details: `Assigned shipment ${shipment.shipmentId} to driver ${driverUser.name} & vehicle ${vehicle.vehicleNumber}`,
    ipAddress: req.ip,
  });

  await dispatchNotification({
    recipient: driverId,
    recipientRole: 'Driver',
    title: 'New Dispatch Assigned',
    message: `You have been assigned to Shipment ${shipment.shipmentId} from ${shipment.origin.name}.`,
    type: 'SHIPMENT_ASSIGNED',
    metadata: { shipmentId: shipment._id },
  });

  return sendSuccess(res, shipment, 'Vehicle and Driver assigned successfully');
});

// @desc    Update shipment status with comment
// @route   PUT /api/shipments/:id/status
// @access  Private (Admin, Dispatcher, Driver)
const updateShipmentStatus = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.updateShipmentStatus(req, res);
  const { status, reason } = req.body;

  if (!status) {
    return sendError(res, 'Please provide a status', 400);
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  // Restrict driver from setting illegal statuses
  if (req.user.role === 'Driver') {
    if (shipment.driver?.toString() !== req.user._id.toString()) {
      return sendError(res, 'You are not the driver assigned to this shipment', 403);
    }
    if (!['In Transit', 'Delayed', 'Delivered'].includes(status)) {
      return sendError(res, 'Drivers can only set In Transit, Delayed, or Delivered status', 400);
    }
  }

  shipment.status = status;
  shipment.statusHistory.push({
    status,
    updatedBy: req.user._id,
    reason: reason || `Status updated to ${status}`,
  });

  // Handle Lifecycle triggers
  if (status === 'Delivered') {
    shipment.actualDeliveryTime = Date.now();
    
    // Release vehicle
    if (shipment.vehicle) {
      await Vehicle.findByIdAndUpdate(shipment.vehicle, {
        availability: true,
        currentLocation: {
          lat: shipment.destination.lat,
          lng: shipment.destination.lng,
          address: shipment.destination.address,
        },
      });
    }

    // Release driver
    if (shipment.driver) {
      await Driver.findOneAndUpdate(
        { user: shipment.driver },
        { status: 'Available', assignedVehicle: null }
      );
    }
    
    await dispatchNotification({
      recipientRole: 'Warehouse Manager',
      title: 'Shipment Delivered',
      message: `Shipment ${shipment.shipmentId} has been successfully delivered.`,
      type: 'SHIPMENT_DELIVERED',
      metadata: { shipmentId: shipment._id },
    });
  } else if (status === 'Delayed') {
    await dispatchNotification({
      recipientRole: 'Dispatcher',
      title: 'Shipment Delayed Alert',
      message: `Shipment ${shipment.shipmentId} has been delayed. Reason: ${reason || 'N/A'}`,
      type: 'SHIPMENT_DELAYED',
      metadata: { shipmentId: shipment._id },
    });
  }

  await shipment.save();

  await logActivity({
    user: req.user._id,
    action: 'UPDATE_STATUS',
    details: `Updated shipment ${shipment.shipmentId} status to ${status}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, shipment, 'Status updated successfully');
});

// @desc    Add discussion comment to shipment timeline
// @route   POST /api/shipments/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.addComment(req, res);
  const { comment } = req.body;
  if (!comment) {
    return sendError(res, 'Please provide a comment', 400);
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  shipment.comments.push({
    user: req.user._id,
    comment,
  });

  await shipment.save();

  const populated = await Shipment.findById(shipment._id)
    .populate('comments.user', 'name role avatar');

  return sendSuccess(res, populated.comments, 'Comment added successfully');
});

// @desc    Upload Proof of Delivery and mark delivered
// @route   POST /api/shipments/:id/deliver
// @access  Private (Driver, Admin, Dispatcher)
const deliverShipment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.deliverShipment(req, res);
  const { signedBy } = req.body;

  if (!req.file) {
    return sendError(res, 'Please upload a proof of delivery image', 400);
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  if (req.user.role === 'Driver' && shipment.driver?.toString() !== req.user._id.toString()) {
    return sendError(res, 'Access denied', 403);
  }

  shipment.status = 'Delivered';
  shipment.actualDeliveryTime = Date.now();
  shipment.proofOfDelivery = {
    imageUrl: `/uploads/${req.file.filename}`,
    signedBy: signedBy || 'Unsigned',
    timestamp: Date.now(),
  };

  shipment.statusHistory.push({
    status: 'Delivered',
    updatedBy: req.user._id,
    reason: `Delivered with Pod. Signed by: ${signedBy || 'Unsigned'}`,
  });

  // Release vehicle
  if (shipment.vehicle) {
    await Vehicle.findByIdAndUpdate(shipment.vehicle, {
      availability: true,
      currentLocation: {
        lat: shipment.destination.lat,
        lng: shipment.destination.lng,
        address: shipment.destination.address,
      },
    });
  }

  // Release driver
  if (shipment.driver) {
    await Driver.findOneAndUpdate(
      { user: shipment.driver },
      { status: 'Available', assignedVehicle: null }
    );
    await Vehicle.updateMany({ assignedDriver: shipment.driver }, { assignedDriver: null });
  }

  await shipment.save();

  await logActivity({
    user: req.user._id,
    action: 'DELIVER_SHIPMENT',
    details: `Delivered shipment ${shipment.shipmentId} with proof of delivery.`,
    ipAddress: req.ip,
  });

  await dispatchNotification({
    recipientRole: 'Warehouse Manager',
    title: 'Delivery Completed',
    message: `Shipment ${shipment.shipmentId} delivered to ${shipment.destination.name}.`,
    type: 'SHIPMENT_DELIVERED',
    metadata: { shipmentId: shipment._id },
  });

  return sendSuccess(res, shipment, 'Shipment delivered successfully');
});

// @desc    Delete shipment
// @route   DELETE /api/shipments/:id
// @access  Private (Admin, Dispatcher)
const deleteShipment = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').shipments.deleteShipment(req, res);
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return sendError(res, 'Shipment not found', 404);
  }

  if (shipment.status !== 'Pending' && shipment.status !== 'Cancelled') {
    return sendError(res, 'Cannot delete an active shipment. Cancel it first.', 400);
  }

  // Release driver & vehicle if assigned
  if (shipment.vehicle) {
    await Vehicle.findByIdAndUpdate(shipment.vehicle, { availability: true });
  }
  if (shipment.driver) {
    await Driver.findOneAndUpdate({ user: shipment.driver }, { status: 'Available' });
  }

  await Shipment.findByIdAndDelete(req.params.id);

  await logActivity({
    user: req.user._id,
    action: 'DELETE_SHIPMENT',
    details: `Deleted shipment record ${shipment.shipmentId}`,
    ipAddress: req.ip,
  });

  return sendSuccess(res, null, 'Shipment deleted successfully');
});

module.exports = {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  assignShipment,
  updateShipmentStatus,
  addComment,
  deliverShipment,
  deleteShipment,
};
