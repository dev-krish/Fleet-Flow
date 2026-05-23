const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Please add a vehicle number'],
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Semi-Truck', 'Box Truck', 'Cargo Van', 'Flatbed'],
      required: [true, 'Please add a vehicle type'],
    },
    capacity: {
      type: Number,
      required: [true, 'Please add cargo capacity in kg'],
    },
    fuelStatus: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    currentLocation: {
      lat: {
        type: Number,
        default: 34.0522, // Default to Los Angeles or custom center
      },
      lng: {
        type: Number,
        default: -118.2437,
      },
      address: {
        type: String,
        default: 'Main Warehouse Depot',
      },
    },
    maintenanceStatus: {
      type: String,
      enum: ['Satisfactory', 'Service Due', 'Under Repair'],
      default: 'Satisfactory',
    },
    availability: {
      type: Boolean,
      default: true,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', VehicleSchema);
