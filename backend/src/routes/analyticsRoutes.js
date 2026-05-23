const express = require('express');
const router = express.Router();
const { getKPIs, getChartData } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/kpis', getKPIs);
router.get('/charts', getChartData);

module.exports = router;
