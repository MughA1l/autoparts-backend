const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  const user = await User.findById(req.user._id);
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) throw new ApiError('Email already in use', 400);
    user.email = email;
  }
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (req.file) {
    user.avatar = `/uploads/avatars/${req.file.filename}`;
  }

  const updated = await user.save();
  res.json({ success: true, message: 'Profile updated successfully', user: updated });
});

// @desc    Get all addresses
// @route   GET /api/users/addresses
// @access  Private
const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
});

// @desc    Add address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const newAddress = req.body;

  if (newAddress.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }
  if (user.addresses.length === 0) newAddress.isDefault = true;

  user.addresses.push(newAddress);
  await user.save();
  res.status(201).json({ success: true, message: 'Address added', addresses: user.addresses });
});

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.id);

  if (!address) throw new ApiError('Address not found', 404);

  if (req.body.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  Object.assign(address, req.body);
  await user.save();
  res.json({ success: true, message: 'Address updated', addresses: user.addresses });
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((addr) => addr._id.toString() !== req.params.id);
  await user.save();
  res.json({ success: true, message: 'Address deleted', addresses: user.addresses });
});

// @desc    Toggle wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const productId = req.params.productId;
  const index = user.wishlist.findIndex((id) => id.toString() === productId);

  let message;
  if (index === -1) {
    user.wishlist.push(productId);
    message = 'Added to wishlist';
  } else {
    user.wishlist.splice(index, 1);
    message = 'Removed from wishlist';
  }

  await user.save();
  res.json({ success: true, message, wishlist: user.wishlist });
});

// @desc    Get wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'name images price discountPrice slug ratings stock category brand',
    populate: [
      { path: 'category', select: 'name' },
      { path: 'brand', select: 'name' },
    ],
  });
  res.json({ success: true, wishlist: user.wishlist });
});

module.exports = { updateProfile, getAddresses, addAddress, updateAddress, deleteAddress, toggleWishlist, getWishlist };
