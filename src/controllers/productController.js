const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

// @desc    Get all products with filtering, search, pagination
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword, category, brand, minPrice, maxPrice,
    make, model, year, sort, page = 1, limit = 12,
    featured, inStock,
  } = req.query;

  const query = { isActive: true };

  // Keyword search
  if (keyword) {
    query.$text = { $search: keyword };
  }

  // Filters
  if (category) {
    const Category = require('../models/Category');
    const subCats = await Category.find({ parent: category });
    const catIds = [category, ...subCats.map(c => c._id.toString())];
    query.category = { $in: catIds };
  }
  if (brand) query.brand = brand;
  if (featured === 'true') query.isFeatured = true;
  if (inStock === 'true') query.stock = { $gt: 0 };

  // Price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Vehicle fitment filter
  if (make || model || year) {
    const fitmentQuery = {};
    if (make) fitmentQuery['fitments.make'] = { $regex: make, $options: 'i' };
    if (model) fitmentQuery['fitments.model'] = { $regex: model, $options: 'i' };
    if (year) {
      fitmentQuery['fitments.yearFrom'] = { $lte: Number(year) };
      fitmentQuery['fitments.yearTo'] = { $gte: Number(year) };
    }
    Object.assign(query, fitmentQuery);
  }

  // Sorting
  let sortObj = { createdAt: -1 };
  if (sort === 'price_asc') sortObj = { price: 1 };
  else if (sort === 'price_desc') sortObj = { price: -1 };
  else if (sort === 'popular') sortObj = { totalSold: -1 };
  else if (sort === 'rating') sortObj = { 'ratings.average': -1 };
  else if (sort === 'newest') sortObj = { createdAt: -1 };

  // Text score sorting
  if (keyword) sortObj = { score: { $meta: 'textScore' }, ...sortObj };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  require('fs').appendFileSync('product_query.log', JSON.stringify({
    time: new Date(),
    queryFromFrontend: req.query,
    mongoQuery: query
  }) + '\\n');

  const [products, total] = await Promise.all([
    Product.find(query)
      .select(keyword ? { score: { $meta: 'textScore' } } : {})
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('brand', 'name logo'),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slug: req.params.id }],
    isActive: true,
  })
    .populate('category', 'name slug')
    .populate('brand', 'name logo');

  if (!product) throw new ApiError('Product not found', 404);
  res.json({ success: true, product });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .limit(8)
    .populate('category', 'name')
    .populate('brand', 'name logo');
  res.json({ success: true, products });
});

// @desc    Get top selling products
// @route   GET /api/products/top-selling
// @access  Public
const getTopSellingProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .sort({ totalSold: -1 })
    .limit(8)
    .populate('category', 'name')
    .populate('brand', 'name logo');
  res.json({ success: true, products });
});

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slug: req.params.id }],
    isActive: true,
  });
  if (!product) throw new ApiError('Product not found', 404);

  const related = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(6)
    .populate('category', 'name')
    .populate('brand', 'name logo');

  res.json({ success: true, products: related });
});

// @desc    Get vehicle makes/models/years for filter
// @route   GET /api/products/vehicles
// @access  Public
const getVehicleOptions = asyncHandler(async (req, res) => {
  const { make, model } = req.query;

  const pipeline = [];

  if (make) {
    pipeline.push({ $match: { 'fitments.make': { $regex: make, $options: 'i' } } });
  }

  pipeline.push({ $unwind: '$fitments' });

  if (make) {
    pipeline.push({ $match: { 'fitments.make': { $regex: make, $options: 'i' } } });
  }
  if (model) {
    pipeline.push({ $match: { 'fitments.model': { $regex: model, $options: 'i' } } });
  }

  const makes = await Product.distinct('fitments.make');
  const models = make
    ? await Product.distinct('fitments.model', { 'fitments.make': { $regex: make, $options: 'i' } })
    : [];
  const years = [];

  if (make && model) {
    const result = await Product.aggregate([
      { $unwind: '$fitments' },
      {
        $match: {
          'fitments.make': { $regex: make, $options: 'i' },
          'fitments.model': { $regex: model, $options: 'i' },
        },
      },
      {
        $group: {
          _id: null,
          minYear: { $min: '$fitments.yearFrom' },
          maxYear: { $max: '$fitments.yearTo' },
        },
      },
    ]);

    if (result.length > 0) {
      for (let y = result[0].minYear; y <= result[0].maxYear; y++) {
        years.push(y);
      }
    }
  }

  res.json({ success: true, makes: makes.sort(), models: models.sort(), years });
});

// Admin CRUD
const createProduct = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.files && req.files.length > 0) {
    data.images = req.files.map((f) => `/uploads/products/${f.filename}`);
  }
  if (typeof data.fitments === 'string') data.fitments = JSON.parse(data.fitments);
  if (typeof data.specifications === 'string') data.specifications = JSON.parse(data.specifications);
  if (typeof data.tags === 'string') data.tags = JSON.parse(data.tags);

  const product = await Product.create(data);
  res.status(201).json({ success: true, message: 'Product created successfully', product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.files && req.files.length > 0) {
    data.images = req.files.map((f) => `/uploads/products/${f.filename}`);
  }
  if (typeof data.fitments === 'string') data.fitments = JSON.parse(data.fitments);
  if (typeof data.specifications === 'string') data.specifications = JSON.parse(data.specifications);

  const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!product) throw new ApiError('Product not found', 404);
  res.json({ success: true, message: 'Product updated successfully', product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!product) throw new ApiError('Product not found', 404);
  res.json({ success: true, message: 'Product deleted successfully' });
});

module.exports = {
  getProducts, getProduct, getFeaturedProducts, getTopSellingProducts,
  getRelatedProducts, getVehicleOptions, createProduct, updateProduct, deleteProduct,
};
