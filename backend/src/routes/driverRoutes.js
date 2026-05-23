const express = require('express');
const router = express.Router();
const { getDrivers, updateDriverStatus, getDriverTasks } = require('../controllers/driverController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getDrivers);
router.get('/tasks', getDriverTasks);
router.put('/:id', updateDriverStatus);

module.exports = router;
