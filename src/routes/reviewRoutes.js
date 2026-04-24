const express = require('express');
const router = express.Router();
const { getProductReviews, createReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middlewares/auth');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', protect, createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
