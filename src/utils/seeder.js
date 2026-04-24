const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Product = require('../models/Product');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');
};

const categories = [
  { name: 'Engine Parts', icon: '⚙️', description: 'All engine components and parts' },
  { name: 'Brakes & Suspension', icon: '🛞', description: 'Brake pads, rotors, shocks and suspension' },
  { name: 'Electrical & Lighting', icon: '💡', description: 'Batteries, alternators, lights and wiring' },
  { name: 'Filters', icon: '🔄', description: 'Oil, air, fuel and cabin filters' },
  { name: 'Body & Exterior', icon: '🚗', description: 'Bumpers, mirrors, and body panels' },
  { name: 'Cooling System', icon: '❄️', description: 'Radiators, coolants and thermostats' },
  { name: 'Transmission', icon: '🔧', description: 'Gearbox, clutch and drivetrain parts' },
  { name: 'Exhaust System', icon: '💨', description: 'Mufflers, pipes and catalytic converters' },
];

const subCategories = [
  { name: 'Spark Plugs', icon: '⚡', parentName: 'Engine Parts' },
  { name: 'Pistons & Rings', icon: '🔩', parentName: 'Engine Parts' },
  { name: 'Timing Belts', icon: '⏱️', parentName: 'Engine Parts' },
  { name: 'Brake Pads', icon: '🛑', parentName: 'Brakes & Suspension' },
  { name: 'Brake Rotors', icon: '⭕', parentName: 'Brakes & Suspension' },
  { name: 'Shock Absorbers', icon: '🔩', parentName: 'Brakes & Suspension' },
  { name: 'Car Batteries', icon: '🔋', parentName: 'Electrical & Lighting' },
  { name: 'Headlights', icon: '🔦', parentName: 'Electrical & Lighting' },
  { name: 'Air Filters', icon: '🌬️', parentName: 'Filters' },
  { name: 'Oil Filters', icon: '🛢️', parentName: 'Filters' },
];

const brands = [
  { name: 'Toyota Genuine', country: 'Japan' },
  { name: 'Bosch', country: 'Germany' },
  { name: 'NGK', country: 'Japan' },
  { name: 'Denso', country: 'Japan' },
  { name: 'Monroe', country: 'USA' },
  { name: 'Mann Filter', country: 'Germany' },
  { name: 'Brembo', country: 'Italy' },
  { name: 'Gates', country: 'USA' },
  { name: 'Exide', country: 'Pakistan' },
  { name: 'Suzuki Genuine', country: 'Japan' },
];

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@autoparts.com',
      password: 'admin123',
      role: 'admin',
      phone: '03001234567',
    });
    console.log(`   ✅ Admin: admin@autoparts.com / admin123`);

    // Create demo customer
    await User.create({
      name: 'Ali Khan',
      email: 'customer@autoparts.com',
      password: 'customer123',
      role: 'customer',
      phone: '03009876543',
    });
    console.log(`   ✅ Customer: customer@autoparts.com / customer123`);

    // Create categories
    console.log('📂 Creating categories...');
    const createdCategories = await Category.create(categories);
    const categoryMap = {};
    createdCategories.forEach((c) => (categoryMap[c.name] = c._id));

    // Create subcategories
    for (const sub of subCategories) {
      const parentId = categoryMap[sub.parentName];
      const created = await Category.create({ name: sub.name, icon: sub.icon, parent: parentId });
      categoryMap[sub.name] = created._id;
    }
    console.log(`   ✅ ${categories.length + subCategories.length} categories created`);

    // Create brands
    console.log('🏷️  Creating brands...');
    const createdBrands = await Brand.create(brands);
    const brandMap = {};
    createdBrands.forEach((b) => (brandMap[b.name] = b._id));
    console.log(`   ✅ ${brands.length} brands created`);

    // Create products
    console.log('📦 Creating products...');
    const products = [
      {
        name: 'NGK Iridium Spark Plugs Set (4pcs)',
        description: 'Premium iridium spark plugs for superior ignition performance. Provides better fuel efficiency and longer lifespan compared to standard plugs. Compatible with most Japanese and Korean vehicles.',
        shortDescription: 'Premium iridium spark plugs - 4 piece set for superior performance',
        partNumber: 'NGK-BCPR6EIX-4',
        oemNumber: '90919-01253',
        category: categoryMap['Spark Plugs'],
        brand: brandMap['NGK'],
        price: 2800,
        discountPrice: 2400,
        stock: 45,
        isFeatured: true,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2008, yearTo: 2022 },
          { make: 'Toyota', model: 'Camry', yearFrom: 2010, yearTo: 2022 },
          { make: 'Toyota', model: 'Yaris', yearFrom: 2012, yearTo: 2022 },
        ],
        specifications: [
          { key: 'Material', value: 'Iridium' },
          { key: 'Thread Size', value: '14mm' },
          { key: 'Gap', value: '1.1mm' },
          { key: 'Quantity', value: '4 pieces' },
        ],
        tags: ['spark plug', 'ignition', 'iridium', 'ngk', 'toyota'],
      },
      {
        name: 'Bosch Disc Brake Pads - Front Axle',
        description: 'High-performance ceramic brake pads with low dust formula. Provides excellent stopping power and quiet braking. Comes with hardware kit included.',
        shortDescription: 'Ceramic brake pads with low dust - front axle set',
        partNumber: 'BP-0986494341',
        oemNumber: '04465-02310',
        category: categoryMap['Brake Pads'],
        brand: brandMap['Bosch'],
        price: 3500,
        discountPrice: 0,
        stock: 30,
        isFeatured: true,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2014, yearTo: 2021 },
          { make: 'Toyota', model: 'Camry', yearFrom: 2012, yearTo: 2021 },
        ],
        specifications: [
          { key: 'Material', value: 'Ceramic' },
          { key: 'Position', value: 'Front Axle' },
          { key: 'Dust Level', value: 'Low' },
          { key: 'Hardware Kit', value: 'Included' },
        ],
        tags: ['brake pads', 'ceramic', 'bosch', 'front brakes'],
      },
      {
        name: 'Mann Filter Air Filter Element C26168',
        description: 'OEM quality air filter that ensures maximum engine protection by trapping dust and particles. Improves engine performance and fuel efficiency.',
        shortDescription: 'OEM quality engine air filter for maximum protection',
        partNumber: 'C26168',
        oemNumber: '17801-0D060',
        category: categoryMap['Air Filters'],
        brand: brandMap['Mann Filter'],
        price: 1200,
        discountPrice: 980,
        stock: 60,
        isFeatured: false,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2015, yearTo: 2022 },
          { make: 'Toyota', model: 'Yaris', yearFrom: 2012, yearTo: 2020 },
        ],
        specifications: [
          { key: 'Filter Type', value: 'Dry paper' },
          { key: 'Shape', value: 'Panel' },
          { key: 'Height', value: '33mm' },
        ],
        tags: ['air filter', 'engine filter', 'mann', 'toyota'],
      },
      {
        name: 'Monroe Shock Absorber - Front Right',
        description: 'Gas-filled shock absorber provides superior ride quality and handling. Monroe\'s Reflex technology responds to any road condition. OE quality replacement.',
        shortDescription: 'Gas-filled front shock absorber - right side',
        partNumber: 'MR80765',
        oemNumber: '48510-12820',
        category: categoryMap['Shock Absorbers'],
        brand: brandMap['Monroe'],
        price: 6500,
        discountPrice: 5800,
        stock: 15,
        isFeatured: true,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2002, yearTo: 2014 },
          { make: 'Toyota', model: 'Vios', yearFrom: 2003, yearTo: 2013 },
        ],
        specifications: [
          { key: 'Type', value: 'Gas Pressurized' },
          { key: 'Position', value: 'Front Right' },
          { key: 'Mount Type', value: 'Top Mount Included' },
        ],
        tags: ['shock absorber', 'suspension', 'monroe', 'front'],
      },
      {
        name: 'Denso Oil Filter 260340-0730',
        description: 'Premium Denso oil filter with anti-drain back valve. Keeps engine oil clean by trapping contaminants. Extended drain interval capability.',
        shortDescription: 'Premium oil filter with anti-drain back valve',
        partNumber: '260340-0730',
        oemNumber: '90915-YZZD3',
        category: categoryMap['Oil Filters'],
        brand: brandMap['Denso'],
        price: 850,
        discountPrice: 0,
        stock: 100,
        isFeatured: false,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2008, yearTo: 2023 },
          { make: 'Toyota', model: 'Camry', yearFrom: 2010, yearTo: 2023 },
          { make: 'Toyota', model: 'Prius', yearFrom: 2010, yearTo: 2020 },
          { make: 'Suzuki', model: 'Swift', yearFrom: 2010, yearTo: 2022 },
        ],
        specifications: [
          { key: 'Thread Size', value: 'M20 x 1.5' },
          { key: 'Height', value: '79.2mm' },
          { key: 'Bypass Valve', value: 'Yes' },
        ],
        tags: ['oil filter', 'denso', 'engine oil', 'filtration'],
      },
      {
        name: 'Gates Timing Belt Kit Complete Set',
        description: 'Complete timing belt kit includes timing belt, tensioner and idler pulleys. All components are precision engineered for perfect synchronization.',
        shortDescription: 'Complete timing belt replacement kit with tensioner',
        partNumber: 'TCK295',
        oemNumber: '13568-09010',
        category: categoryMap['Timing Belts'],
        brand: brandMap['Gates'],
        price: 8500,
        discountPrice: 7200,
        stock: 12,
        isFeatured: true,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2002, yearTo: 2008, engineType: '3ZZ-FE' },
          { make: 'Toyota', model: 'Avensis', yearFrom: 2003, yearTo: 2008 },
        ],
        specifications: [
          { key: 'Contents', value: 'Belt + Tensioner + Idler' },
          { key: 'Belt Length', value: '111 Teeth' },
          { key: 'Width', value: '25mm' },
        ],
        tags: ['timing belt', 'kit', 'gates', 'engine timing'],
      },
      {
        name: 'Exide MF60 Car Battery 12V 60Ah',
        description: 'Maintenance-free sealed lead-acid battery with superior cold cranking amps. Perfect for Pakistani climate. 18 months warranty.',
        shortDescription: 'Maintenance-free car battery 12V 60Ah - 18 months warranty',
        partNumber: 'EX-MF60L',
        category: categoryMap['Car Batteries'],
        brand: brandMap['Exide'],
        price: 14500,
        discountPrice: 13000,
        stock: 20,
        isFeatured: true,
        images: [],
        fitments: [
          { make: 'Toyota', model: 'Corolla', yearFrom: 2000, yearTo: 2023 },
          { make: 'Honda', model: 'Civic', yearFrom: 2000, yearTo: 2023 },
          { make: 'Suzuki', model: 'Swift', yearFrom: 2005, yearTo: 2023 },
        ],
        specifications: [
          { key: 'Voltage', value: '12V' },
          { key: 'Capacity', value: '60Ah' },
          { key: 'CCA', value: '550A' },
          { key: 'Warranty', value: '18 Months' },
          { key: 'Type', value: 'Maintenance Free' },
        ],
        tags: ['battery', 'car battery', 'exide', '12v', 'maintenance free'],
      },
      {
        name: 'Suzuki Alto Brake Pads Set (Front)',
        description: 'Genuine quality front brake pads for Suzuki Alto. Direct OEM fitment with exact specifications. Excellent heat dissipation and durability.',
        shortDescription: 'Front brake pads for Suzuki Alto - OEM fitment',
        partNumber: 'SZ-BP-0001',
        oemNumber: '55810-76G00',
        category: categoryMap['Brake Pads'],
        brand: brandMap['Suzuki Genuine'],
        price: 1800,
        discountPrice: 0,
        stock: 40,
        isFeatured: false,
        images: [],
        fitments: [
          { make: 'Suzuki', model: 'Alto', yearFrom: 2010, yearTo: 2022 },
          { make: 'Suzuki', model: 'Wagon R', yearFrom: 2014, yearTo: 2022 },
        ],
        specifications: [
          { key: 'Position', value: 'Front' },
          { key: 'Pieces', value: '4 per set' },
          { key: 'Material', value: 'Semi-metallic' },
        ],
        tags: ['brake pads', 'suzuki', 'alto', 'front brakes'],
      },
    ];

    await Product.create(products);
    console.log(`   ✅ ${products.length} products created`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Admin Login:    admin@autoparts.com / admin123');
    console.log('📧 Customer Login: customer@autoparts.com / customer123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedData();
