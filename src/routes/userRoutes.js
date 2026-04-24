const express = require('express');
const router = express.Router();
const { updateProfile, getAddresses, addAddress, updateAddress, deleteAddress, toggleWishlist, getWishlist } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, toggleWishlist);

module.exports = router;
