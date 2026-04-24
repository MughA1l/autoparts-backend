const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, getOrder, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

router.post('/', protect, placeOrder);
router.get('/my', protect, getMyOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
