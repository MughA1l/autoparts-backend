const express = require('express');
const router = express.Router();
const {
  getAllOrders, updateOrderStatus, getOrderAdmin,
  getAllUsers, toggleBlockUser,
  getDashboardStats, getSalesChart, getTopProducts, getOrderStatusStats,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('admin')];

// Orders
router.get('/orders', ...adminOnly, getAllOrders);
router.get('/orders/:id', ...adminOnly, getOrderAdmin);
router.put('/orders/:id/status', ...adminOnly, updateOrderStatus);

// Users
router.get('/users', ...adminOnly, getAllUsers);
router.put('/users/:id/toggle-block', ...adminOnly, toggleBlockUser);

// Analytics
router.get('/analytics/dashboard', ...adminOnly, getDashboardStats);
router.get('/analytics/sales', ...adminOnly, getSalesChart);
router.get('/analytics/top-products', ...adminOnly, getTopProducts);
router.get('/analytics/orders-status', ...adminOnly, getOrderStatusStats);

module.exports = router;
