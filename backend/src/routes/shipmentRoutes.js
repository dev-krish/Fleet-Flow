const express = require('express');
const router = express.Router();
const {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  assignShipment,
  updateShipmentStatus,
  addComment,
  deliverShipment,
  deleteShipment,
} = require('../controllers/shipmentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect); // Protect all routes here

router.route('/')
  .get(getShipments)
  .post(authorize('Admin', 'Dispatcher', 'Warehouse Manager'), createShipment);

router.route('/:id')
  .get(getShipmentById)
  .put(authorize('Admin', 'Dispatcher', 'Warehouse Manager'), updateShipment)
  .delete(authorize('Admin', 'Dispatcher'), deleteShipment);

router.put('/:id/assign', authorize('Admin', 'Dispatcher'), assignShipment);
router.put('/:id/status', updateShipmentStatus);
router.post('/:id/comments', addComment);
router.post('/:id/deliver', upload.single('image'), deliverShipment);

module.exports = router;
