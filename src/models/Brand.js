const mongoose = require('mongoose');
const slugify = require('slugify');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    unique: true,
  },
  slug: { type: String, unique: true },
  logo: { type: String, default: '' },
  country: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

brandSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Brand', brandSchema);
