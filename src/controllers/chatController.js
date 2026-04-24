const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get chat history for a customer
// @route   GET /api/chat/:customerId
// @access  Private (Customer or Admin)
const getChatHistory = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  // Verify access: Admin can view any, Customer can only view their own
  if (req.user.role !== 'admin' && req.user._id.toString() !== customerId) {
    res.status(403);
    throw new Error('Not authorized to view this chat');
  }

  const messages = await Message.find({ customer: customerId })
    .populate('sender', 'name avatar role')
    .sort({ createdAt: 1 });

  res.json({ success: true, messages });
});

// @desc    Get list of all active conversations
// @route   GET /api/chat/conversations
// @access  Private/Admin
const getConversations = asyncHandler(async (req, res) => {
  // Aggregate to find the latest message per customer
  const latestMessages = await Message.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$customer',
        lastMessage: { $first: '$$ROOT' },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  await Message.populate(latestMessages, {
    path: '_id',
    model: 'User',
    select: 'name avatar email',
  });

  const conversations = latestMessages.map(item => ({
    customer: item._id,
    lastMessage: item.lastMessage,
  }));

  res.json({ success: true, conversations });
});

// @desc    Upload media for chat
// @route   POST /api/chat/upload
// @access  Private
const uploadChatMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  // File is saved in /uploads/chat directory via multer
  const mediaUrl = `/uploads/chat/${req.file.filename}`;
  
  // Determine mediaType based on mimetype
  let mediaType = 'none';
  if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
  else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
  else if (req.file.mimetype.startsWith('audio/')) mediaType = 'audio';

  res.json({
    success: true,
    mediaUrl,
    mediaType,
  });
});

module.exports = {
  getChatHistory,
  getConversations,
  uploadChatMedia,
};
