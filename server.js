const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Load env vars
dotenv.config();

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const brandRoutes = require('./src/routes/brandRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

// Connect to database
console.log('--- Initializing Backend Server ---');
connectDB().then(() => console.log('--- DB Initialization Attempt Complete ---'));

const app = express();
console.log('--- Express App Created ---');

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Build allowed origins list and a robust checker
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://gul-and-sons-auto-parts-frontend.vercel.app',
].filter(Boolean));

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser requests (curl, server-to-server)
  if (allowedOrigins.has(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname && hostname.endsWith('.vercel.app')) return true;
  } catch (e) {
    // ignore malformed origin
  }
  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    // Echo the request origin when present so browser receives an appropriate ACAO
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  // Let preflight requests short-circuit
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Keep the cors middleware for compatibility with some libs
app.use(cors({ origin: isAllowedOrigin, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize data (prevent NoSQL injection)
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files - serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Gull & Sons Auto Parts API is running!', timestamp: new Date() });
});

// Root endpoint for platform checks
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Gull & Sons Auto Parts API is running!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Warn if essential environment variables are missing (helps diagnose deploy issues)
const requiredEnvs = ['MONGO_URI', 'JWT_SECRET'];
requiredEnvs.forEach((k) => {
  if (!process.env[k]) console.warn(`WARN: environment variable ${k} is not set`);
});
if (require.main === module && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Gull & Sons Auto Parts Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api`);
  });

  // Initialize Socket.io only for the standalone server
  const { initializeSocket } = require('./src/socket');
  initializeSocket(server);

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
