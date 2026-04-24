const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

const getProductReviews = asyncHandler(async (req, res) => {
  let productId = req.params.productId;

  if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
    const Product = require('../models/Product');
    const product = await Product.findOne({ slug: productId });
    if (!product) return res.json({ success: true, reviews: [] });
    productId = product._id;
  }

  const reviews = await Review.find({ product: productId, isApproved: true })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment } = req.body;

  // Check if already reviewed
  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) throw new ApiError('You have already reviewed this product', 400);

  // Check verified purchase
  const order = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    orderStatus: 'delivered',
  });

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating,
    title,
    comment,
    isVerifiedPurchase: !!order,
  });

  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, message: 'Review submitted', review });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError('Review not found', 404);
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { getProductReviews, createReview, deleteReview };
