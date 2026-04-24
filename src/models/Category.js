const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
  },
  slug: { type: String, unique: true },
  description: { type: String, maxlength: [300, 'Description cannot exceed 300 characters'] },
  image: { type: String, default: '' },
  icon: { type: String, default: '🔧' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

// Generate slug before saving
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
