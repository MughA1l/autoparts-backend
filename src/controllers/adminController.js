const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

// ==================== ORDER MANAGEMENT ====================

// @desc    Get all orders (Admin)
// @route   GET /api/admin/orders
// @access  Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const query = {};
  if (status) query.orderStatus = status;
  if (search) query.orderNumber = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email phone'),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true, orders,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, note, trackingId, courierName } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError('Order not found', 404);

  const validTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['dispatched', 'cancelled'],
    dispatched: ['delivered', 'returned'],
    delivered: ['returned'],
    cancelled: [],
    returned: [],
  };

  if (!validTransitions[order.orderStatus]?.includes(orderStatus)) {
    throw new ApiError(`Cannot transition from ${order.orderStatus} to ${orderStatus}`, 400);
  }

  order.orderStatus = orderStatus;
  order.statusHistory.push({ status: orderStatus, note: note || '', updatedBy: req.user._id });
  if (trackingId) order.trackingId = trackingId;
  if (courierName) order.courierName = courierName;
  if (orderStatus === 'delivered') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'paid'; // COD - mark as paid on delivery
  }

  await order.save();
  res.json({ success: true, message: 'Order status updated', order });
});

// @desc    Get single order (Admin)
// @route   GET /api/admin/orders/:id
// @access  Admin
const getOrderAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new ApiError('Order not found', 404);
  res.json({ success: true, order });
});

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  if (role) query.role = role;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-password'),
    User.countDocuments(query),
  ]);

  res.json({
    success: true, users,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc    Block/Unblock user
// @route   PUT /api/admin/users/:id/toggle-block
// @access  Admin
const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError('User not found', 404);
  if (user.role === 'admin') throw new ApiError('Cannot block an admin', 403);

  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully`, user });
});

// ==================== ANALYTICS ====================

// @desc    Get dashboard stats
// @route   GET /api/admin/analytics/dashboard
// @access  Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalRevenue, monthRevenue, lastMonthRevenue,
    totalOrders, pendingOrders, totalUsers,
    totalProducts, recentOrders,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: 'pending' }),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ isActive: true }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
  ]);

  const totalRev = totalRevenue[0]?.total || 0;
  const monthRev = monthRevenue[0]?.total || 0;
  const lastMonthRev = lastMonthRevenue[0]?.total || 0;
  const monthGrowth = lastMonthRev > 0 ? (((monthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    stats: {
      totalRevenue: totalRev,
      monthRevenue: monthRev,
      monthGrowth: parseFloat(monthGrowth),
      totalOrders,
      pendingOrders,
      totalUsers,
      totalProducts,
    },
    recentOrders,
  });
});

// @desc    Get sales chart data (last 30 days)
// @route   GET /api/admin/analytics/sales
// @access  Admin
const getSalesChart = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const salesData = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, orderStatus: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, salesData });
});

// @desc    Get top selling products
// @route   GET /api/admin/analytics/top-products
// @access  Admin
const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Product.find({ isActive: true })
    .sort({ totalSold: -1 })
    .limit(10)
    .populate('category', 'name')
    .populate('brand', 'name')
    .select('name images totalSold price stock partNumber');

  res.json({ success: true, topProducts });
});

// @desc    Get order status distribution
// @route   GET /api/admin/analytics/orders-status
// @access  Admin
const getOrderStatusStats = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
  ]);
  res.json({ success: true, stats });
});

module.exports = {
  getAllOrders, updateOrderStatus, getOrderAdmin,
  getAllUsers, toggleBlockUser,
  getDashboardStats, getSalesChart, getTopProducts, getOrderStatusStats,
};
