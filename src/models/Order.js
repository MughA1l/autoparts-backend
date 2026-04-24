const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  partNumber: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'Pakistan' },
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online'],
    default: 'cod',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'dispatched', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    note: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  subtotal: { type: Number, required: true },
  deliveryCharges: { type: Number, default: 150 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  trackingId: { type: String, default: '' },
  courierName: { type: String, default: '' },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
  notes: { type: String, default: '' },
  invoiceUrl: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `AP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
