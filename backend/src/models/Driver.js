const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Please add a license number'],
      unique: true,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Available', 'On Duty', 'Offline'],
      default: 'Offline',
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Driver', DriverSchema);
