import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is not defined');
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const connection = await mongoose.connect(uri, {
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 30),
        minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });
      console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
      return connection;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(16_000, 1000 * (2 ** (attempt - 1)));
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
};

export const assertTransactionSupport = async () => {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not connected.');
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName) {
    throw new Error('MongoDB replica set is required because claim, match, account, and category workflows use transactions.');
  }
  return hello.setName;
};

export const closeDB = async () => mongoose.disconnect();
export default connectDB;
