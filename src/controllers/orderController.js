const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

const DELIVERY_CHARGE = 150;
const TAX_RATE = 0;

// @desc    Place order
// @route   POST /api/orders
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = 'cod', notes } = req.body;

  if (!shippingAddress) throw new ApiError('Shipping address is required', 400);

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new ApiError('Your cart is empty', 400);

  // Validate stock and prepare items
  const orderItems = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) throw new ApiError(`Product ${product?.name} is no longer available`, 400);
    if (product.stock < item.quantity) throw new ApiError(`Insufficient stock for ${product.name}`, 400);

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || '',
      partNumber: product.partNumber || '',
      quantity: item.quantity,
      price: item.price,
    });

    // Decrement stock
    await Product.findByIdAndUpdate(product._id, {
      $inc: { stock: -item.quantity, totalSold: item.quantity },
    });
  }

  const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const totalAmount = subtotal + DELIVERY_CHARGE + tax;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    subtotal,
    deliveryCharges: DELIVERY_CHARGE,
    tax,
    totalAmount,
    notes,
    statusHistory: [{ status: 'pending', note: 'Order placed successfully' }],
  });

  // Clear cart
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  const populatedOrder = await Order.findById(order._id).populate('user', 'name email');
  res.status(201).json({ success: true, message: 'Order placed successfully!', order: populatedOrder });
});

// @desc    Get my orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    success: true,
    orders,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError('Order not found', 404);
  res.json({ success: true, order });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError('Order not found', 404);
  if (!['pending', 'processing'].includes(order.orderStatus)) {
    throw new ApiError('Order cannot be cancelled at this stage', 400);
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, totalSold: -item.quantity },
    });
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: req.body.reason || 'Cancelled by customer' });
  await order.save();

  res.json({ success: true, message: 'Order cancelled successfully', order });
});

module.exports = { placeOrder, getMyOrders, getOrder, cancelOrder };
