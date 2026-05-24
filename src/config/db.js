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
    globalForMongoose.__mongoosePromise = mongoose
      .connect(process.env.MONGO_URI)
      .then((conn) => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        globalForMongoose.__mongoosePromise = null;
        return null;
      });
  }

  globalForMongoose.__mongooseConnection = await globalForMongoose.__mongoosePromise;
  return globalForMongoose.__mongooseConnection;
};

module.exports = connectDB;
