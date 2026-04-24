const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    select: 'name images price discountPrice stock slug partNumber isActive',
    populate: { path: 'brand', select: 'name' },
  });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  res.json({ success: true, cart });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError('Product not found', 404);
  if (!product.isActive) throw new ApiError('Product is not available', 400);
  if (product.stock < quantity) throw new ApiError(`Only ${product.stock} items in stock`, 400);

  const price = product.discountPrice > 0 ? product.discountPrice : product.price;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingItem = cart.items.find((item) => item.product.toString() === productId);

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) throw new ApiError(`Only ${product.stock} items available`, 400);
    existingItem.quantity = newQty;
    existingItem.price = price;
  } else {
    cart.items.push({ product: productId, quantity, price });
  }

  await cart.save();
  await cart.populate({
    path: 'items.product',
    select: 'name images price discountPrice stock slug partNumber',
  });

  res.json({ success: true, message: 'Added to cart', cart });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError('Cart not found', 404);

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError('Item not found in cart', 404);

  const product = await Product.findById(item.product);
  if (quantity > product.stock) throw new ApiError(`Only ${product.stock} items available`, 400);

  item.quantity = quantity;
  await cart.save();

  res.json({ success: true, message: 'Cart updated', cart });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError('Cart not found', 404);

  cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
  await cart.save();

  res.json({ success: true, message: 'Item removed from cart', cart });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
});

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
