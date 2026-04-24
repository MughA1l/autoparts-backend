const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // If receiver is not specified, it is assumed to be an admin broadcast, but usually it's explicitly set.
    // For admin receiving, we can use a generic 'admin' target, but it's better to store the specific admin or customer.
    // Since any admin can reply, if a customer sends a message, we might set receiver as null or have a specific logic.
    // Actually, we'll use a `conversationId` or just `customer` field to easily group chats.
  },
  customer: {
    // This makes it extremely easy to fetch a specific customer's chat thread, regardless of which admin replied.
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  mediaType: {
    type: String,
    enum: ['none', 'image', 'video', 'audio'],
    default: 'none',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Index for faster queries
messageSchema.index({ customer: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
