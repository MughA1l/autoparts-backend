const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', getBrands);
router.post('/', protect, authorize('admin'), upload.single('logo'), createBrand);
router.put('/:id', protect, authorize('admin'), upload.single('logo'), updateBrand);
router.delete('/:id', protect, authorize('admin'), deleteBrand);

module.exports = router;
