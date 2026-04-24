const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, forgotPassword, resetPassword, changePassword, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
