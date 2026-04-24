const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, getFeaturedProducts, getTopSellingProducts,
  getRelatedProducts, getVehicleOptions, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/top-selling', getTopSellingProducts);
router.get('/vehicles', getVehicleOptions);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);
router.post('/', protect, authorize('admin'), upload.array('images', 8), createProduct);
router.put('/:id', protect, authorize('admin'), upload.array('images', 8), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
