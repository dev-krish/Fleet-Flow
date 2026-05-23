const express = require('express');
const router = express.Router();
const { getVehicles, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getVehicles)
  .post(authorize('Admin', 'Dispatcher'), createVehicle);

router.route('/:id')
  .put(authorize('Admin', 'Dispatcher'), updateVehicle)
  .delete(authorize('Admin'), deleteVehicle);

module.exports = router;
