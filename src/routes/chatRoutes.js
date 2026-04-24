const express = require('express');
const router = express.Router();
const { getChatHistory, getConversations, uploadChatMedia } = require('../controllers/chatController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Admin gets all active conversations
router.get('/conversations', protect, authorize('admin'), getConversations);

// Upload media
router.post('/upload', protect, upload.single('media'), uploadChatMedia);

// Get chat history for a customer (Admin or the customer themselves)
router.get('/:customerId', protect, getChatHistory);

module.exports = router;
