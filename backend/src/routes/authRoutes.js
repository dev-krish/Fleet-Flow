const express = require('express');
const router = express.Router();
const { register, login, logout, refresh, getMe, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/google-login', googleLogin);
router.get('/me', protect, getMe);

module.exports = router;
