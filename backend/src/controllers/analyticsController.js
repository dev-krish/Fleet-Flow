const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/error');

// @desc    Get KPI summaries
// @route   GET /api/analytics/kpis
// @access  Private
const getKPIs = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').analytics.getKPIs(req, res);
  const totalShipments = await Shipment.countDocuments();
  const pendingShipments = await Shipment.countDocuments({ status: 'Pending' });
  const assignedShipments = await Shipment.countDocuments({ status: 'Assigned' });
  const transitShipments = await Shipment.countDocuments({ status: 'In Transit' });
  const delayedShipments = await Shipment.countDocuments({ status: 'Delayed' });
  const deliveredShipments = await Shipment.countDocuments({ status: 'Delivered' });
  const cancelledShipments = await Shipment.countDocuments({ status: 'Cancelled' });

  const totalVehicles = await Vehicle.countDocuments();
  const maintenanceVehicles = await Vehicle.countDocuments({
    maintenanceStatus: { $in: ['Service Due', 'Under Repair'] },
  });
  const activeVehicles = await Vehicle.countDocuments({ availability: false });

  const totalDrivers = await Driver.countDocuments();
  const onDutyDrivers = await Driver.countDocuments({ status: 'On Duty' });
  const availableDrivers = await Driver.countDocuments({ status: 'Available' });

  // Calculate delivery success rate: Delivered / (Total - Cancelled - Pending)
  const denominator = totalShipments - cancelledShipments - pendingShipments;
  const successRate = denominator > 0 ? Math.round((deliveredShipments / denominator) * 100) : 0;

  return sendSuccess(res, {
    shipments: {
      total: totalShipments,
      pending: pendingShipments,
      assigned: assignedShipments,
      inTransit: transitShipments,
      delayed: delayedShipments,
      delivered: deliveredShipments,
      cancelled: cancelledShipments,
      successRate,
    },
    vehicles: {
      total: totalVehicles,
      active: activeVehicles,
      inMaintenance: maintenanceVehicles,
    },
    drivers: {
      total: totalDrivers,
      onDuty: onDutyDrivers,
      available: availableDrivers,
    },
  });
});

// @desc    Get data for charts and timelines
// @route   GET /api/analytics/charts
// @access  Private
const getChartData = asyncHandler(async (req, res) => {
  if (global.isMockDB) return require('../utils/mockDb').analytics.getChartData(req, res);
  // 1. Shipment Status split
  const statusSplit = await Shipment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // 2. Shipment Priority split
  const prioritySplit = await Shipment.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  // 3. Deliveries over time (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const deliveriesOverTime = await Shipment.aggregate([
    {
      $match: {
        status: 'Delivered',
        actualDeliveryTime: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$actualDeliveryTime' } },
        deliveries: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 4. Vehicle Type distribution and availability
  const vehicleSplit = await Vehicle.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        available: { $sum: { $cond: [{ $eq: ['$availability', true] }, 1, 0] } },
      },
    },
  ]);

  // 5. Recent notifications
  let notificationsQuery = {};
  if (req.user.role === 'Driver') {
    notificationsQuery = {
      $or: [
        { recipient: req.user._id },
        { recipientRole: 'Driver' },
        { recipientRole: 'All' },
      ],
    };
  } else if (req.user.role === 'Dispatcher') {
    notificationsQuery = {
      $or: [
        { recipient: req.user._id },
        { recipientRole: 'Dispatcher' },
        { recipientRole: 'All' },
      ],
    };
  } else if (req.user.role === 'Warehouse Manager') {
    notificationsQuery = {
      $or: [
        { recipient: req.user._id },
        { recipientRole: 'Warehouse Manager' },
        { recipientRole: 'All' },
      ],
    };
  }

  const notifications = await Notification.find(notificationsQuery)
    .sort({ createdAt: -1 })
    .limit(10);

  // 6. Recent activity logs (for audit log timeline)
  const activities = await ActivityLog.find()
    .populate('user', 'name role email avatar')
    .sort({ createdAt: -1 })
    .limit(15);

  return sendSuccess(res, {
    statusSplit,
    prioritySplit,
    deliveriesOverTime,
    vehicleSplit,
    notifications,
    activities,
  });
});

module.exports = {
  getKPIs,
  getChartData,
};
