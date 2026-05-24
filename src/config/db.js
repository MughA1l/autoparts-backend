const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('WARN: MONGO_URI is not set; skipping MongoDB connection');
    return null;
  }

  const globalForMongoose = globalThis;

  if (globalForMongoose.__mongooseConnection) {
    return globalForMongoose.__mongooseConnection;
  }

  if (!globalForMongoose.__mongoosePromise) {
    console.log('📡 Starting new MongoDB connection attempt...');
    globalForMongoose.__mongoosePromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
      })
      .then((conn) => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        console.error(`❌ MongoDB Connection Error Trace: ${error.stack || error.message}`);
        globalForMongoose.__mongoosePromise = null;
        return null;
      });
  }

  // Use a race to ensure we don't hang the entire function if mongoose.connect hangs indefinitely
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Mongoose connection promise timed out')), 6000)
  );

  try {
    globalForMongoose.__mongooseConnection = await Promise.race([
      globalForMongoose.__mongoosePromise,
      timeoutPromise
    ]);
  } catch (err) {
    console.warn(`⚠️ connectDB race failed: ${err.message}`);
    // We don't null out __mongoosePromise here because it might still succeed later in another invocation
  }

  return globalForMongoose.__mongooseConnection;
};

module.exports = connectDB;
