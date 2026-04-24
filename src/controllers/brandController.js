const asyncHandler = require('express-async-handler');
const Brand = require('../models/Brand');
const ApiError = require('../utils/ApiError');

const getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, brands });
});

const createBrand = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.file) data.logo = `/uploads/products/${req.file.filename}`;
  const brand = await Brand.create(data);
  res.status(201).json({ success: true, message: 'Brand created', brand });
});

const updateBrand = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.file) data.logo = `/uploads/products/${req.file.filename}`;
  const brand = await Brand.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!brand) throw new ApiError('Brand not found', 404);
  res.json({ success: true, message: 'Brand updated', brand });
});

const deleteBrand = asyncHandler(async (req, res) => {
  await Brand.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Brand deleted' });
});

module.exports = { getBrands, createBrand, updateBrand, deleteBrand };
