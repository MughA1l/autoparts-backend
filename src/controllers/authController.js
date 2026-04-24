const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sendTokenResponse, generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const emailService = require('../services/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    throw new ApiError('Please provide name, email and password', 400);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError('Email already registered', 400);
  }

  const user = await User.create({ name, email, password, phone });
  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new ApiError('Your account has been blocked. Please contact support.', 403);
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (uses refresh token cookie)
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError('No refresh token', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    throw new ApiError('Invalid refresh token', 401);
  }

  const accessToken = generateAccessToken(user._id);
  res.json({ success: true, accessToken });
});

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError('No user found with this email', 404);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  try {
    // Attempt to send email
    await emailService.sendOTPEmail(user.email, user.name, otp);
    
    // In development mode, we want to show the OTP to the user for testing
    if (process.env.NODE_ENV === 'development') {
      return res.json({ 
        success: true, 
        message: `Dev Mode: Your OTP is ${otp}`,
        otp: otp
      });
    }
    
    res.json({ success: true, message: `OTP sent to ${user.email}` });
  } catch (err) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    if (process.env.NODE_ENV === 'development') {
      return res.json({ 
        success: true, 
        message: `Email failed. Dev Mode OTP is ${otp}`,
        otp: otp
      });
    }
    throw new ApiError('Email could not be sent. Please try again.', 500);
  }
});

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  console.log('[RESET PASSWORD] Received:', { email, otp, newPasswordLength: newPassword?.length });

  const dbUser = await User.findOne({ email });
  console.log('[RESET PASSWORD] DB User:', dbUser ? { email: dbUser.email, dbOtp: dbUser.resetPasswordOTP, expires: dbUser.resetPasswordOTPExpire, now: new Date() } : 'Not found');

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError('Invalid or expired OTP', 400);
  }

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. Please login.' });
});

// @desc    Change password (logged in user)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    throw new ApiError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name images price discountPrice slug');
  res.json({ success: true, user });
});

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, changePassword, getMe };
