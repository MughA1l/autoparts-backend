const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

let io;

// Store online users
// Maps userId to socketId (could be multiple if multiple tabs)
const userSockets = new Map();

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join specific rooms
    socket.join(userId); // Join own room
    if (socket.user.role === 'admin') {
      socket.join('admin_room'); // Admins join this to listen to all incoming
    }

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { text, mediaUrl, mediaType, receiverId, customerId } = data;
        
        // Save to DB
        const message = await Message.create({
          sender: userId,
          receiver: receiverId || null,
          customer: customerId || userId, // If sent by customer, customer is themselves.
          text,
          mediaUrl,
          mediaType,
        });

        await message.populate('sender', 'name avatar role');

        // Emit to the customer's room
        io.to(message.customer.toString()).emit('receive_message', message);
        
        // Emit to admin room
        io.to('admin_room').emit('receive_message', message);
      } catch (err) {
        console.error('Socket send_message error:', err);
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ customerId, isTyping }) => {
      if (socket.user.role === 'admin') {
        socket.to(customerId).emit('typing', { senderId: userId, isTyping });
      } else {
        socket.to('admin_room').emit('typing', { customerId: userId, isTyping });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { initializeSocket, getIO };
