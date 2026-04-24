const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', protect, authorize('admin'), upload.single('image'), createCategory);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
