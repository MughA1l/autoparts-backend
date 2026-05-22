const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');

const normalizeCategoryName = (name = '') => name.trim();

const buildCategorySlug = (name = '') => slugify(normalizeCategoryName(name), { lower: true, strict: true });

const getCategories = asyncHandler(async (req, res) => {
  const { tree } = req.query;

  if (tree === 'true') {
    const parents = await Category.find({ parent: null, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .populate({ path: 'subcategories', match: { isActive: true }, select: 'name slug icon' });
    return res.json({ success: true, categories: parents });
  }

  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate('parent', 'name slug');
  res.json({ success: true, categories });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    $or: [{ _id: req.params.id }, { slug: req.params.id }],
  }).populate('parent', 'name slug');
  if (!category) throw new ApiError('Category not found', 404);
  res.json({ success: true, category });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.name) {
    data.name = normalizeCategoryName(data.name);
    data.slug = buildCategorySlug(data.name);
  }

  const existingCategory = data.name
    ? await Category.findOne({
        $or: [
          { slug: data.slug },
          { name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      })
    : null;

  if (existingCategory) {
    if (existingCategory.isActive) {
      throw new ApiError('Category already exists', 400);
    }

    const restoredCategory = await Category.findByIdAndUpdate(
      existingCategory._id,
      { ...data, isActive: true },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, message: 'Category restored', category: restoredCategory });
  }

  const category = await Category.create(data);
  res.status(201).json({ success: true, message: 'Category created', category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.name) {
    data.name = normalizeCategoryName(data.name);
    data.slug = buildCategorySlug(data.name);
  }

  const currentCategory = await Category.findById(req.params.id);
  if (!currentCategory) throw new ApiError('Category not found', 404);

  if (data.name) {
    const duplicateCategory = await Category.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { slug: data.slug },
        { name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    });
    if (duplicateCategory) {
      throw new ApiError('Category already exists', 400);
    }
  }

  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!category) throw new ApiError('Category not found', 404);
  res.json({ success: true, message: 'Category updated', category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
