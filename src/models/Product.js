const mongoose = require('mongoose');
const slugify = require('slugify');

const fitmentSchema = new mongoose.Schema({
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  yearFrom: { type: Number, required: true },
  yearTo: { type: Number, required: true },
  engineType: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  slug: { type: String, unique: true },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [3000, 'Description cannot exceed 3000 characters'],
  },
  shortDescription: { type: String, maxlength: [300, 'Short description too long'] },
  partNumber: { type: String, trim: true, index: true },
  oemNumber: { type: String, trim: true, index: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  discountPrice: {
    type: Number,
    default: 0,
    min: [0, 'Discount price cannot be negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  images: [{ type: String }],
  fitments: [fitmentSchema],
  specifications: [{
    key: String,
    value: String,
  }],
  tags: [String],
  weight: { type: Number, default: 0 }, // in kg
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished'],
    default: 'new',
  },
  warranty: { type: String, default: '' },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  totalSold: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtuals
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice > 0 ? this.discountPrice : this.price;
});

productSchema.virtual('discountPercent').get(function () {
  if (this.discountPrice > 0 && this.discountPrice < this.price) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Text index for search
productSchema.index({
  name: 'text',
  description: 'text',
  partNumber: 'text',
  oemNumber: 'text',
  tags: 'text',
});

productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });

// Generate slug before saving
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
