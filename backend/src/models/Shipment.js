const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String },
});

const StatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'In Transit', 'Delayed', 'Delivered', 'Cancelled'],
    required: true,
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, default: '' },
});

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const CoordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
});

const ShipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    origin: {
      type: LocationSchema,
      required: true,
    },
    destination: {
      type: LocationSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Transit', 'Delayed', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    warehouseManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledDeliveryDate: {
      type: Date,
      required: true,
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },
    dimensions: {
      weight: { type: Number }, // in kg
      volume: { type: Number }, // in cubic meters
    },
    proofOfDelivery: {
      imageUrl: { type: String, default: null },
      signedBy: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    statusHistory: [StatusHistorySchema],
    comments: [CommentSchema],
    routeCoordinates: [CoordinateSchema], // Array of coordinates forming the journey path
    currentCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure statusHistory is populated and initial currentCoordinates is set to origin
ShipmentSchema.pre('save', function (next) {
  if (this.isNew) {
    if (this.statusHistory.length === 0) {
      this.statusHistory.push({
        status: this.status,
        updatedBy: this.warehouseManager,
        reason: 'Shipment created',
      });
    }
    if (!this.currentCoordinates || !this.currentCoordinates.lat) {
      this.currentCoordinates = {
        lat: this.origin.lat,
        lng: this.origin.lng,
      };
    }
  }
  next();
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
