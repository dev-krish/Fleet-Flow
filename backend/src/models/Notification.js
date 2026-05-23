const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null means broadcast to a role or all
    },
    recipientRole: {
      type: String,
      enum: ['Admin', 'Dispatcher', 'Driver', 'Warehouse Manager', 'All'],
      default: 'All',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['SHIPMENT_ASSIGNED', 'SHIPMENT_DELAYED', 'SHIPMENT_DELIVERED', 'MAINTENANCE_DUE', 'SYSTEM_ALERT'],
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
