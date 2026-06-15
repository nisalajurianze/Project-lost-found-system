// ============================================
// MongoDB Connection Configuration
// Uses Mongoose with connection pooling & error handling
// ============================================

import mongoose from 'mongoose';

/**
 * Connect to MongoDB with retry logic and optimal settings.
 * Exits the process after 5 failed connection attempts.
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        // Connection pool settings
        maxPoolSize: 50,
        minPoolSize: 5,
        // Timeouts
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Buffering
        bufferCommands: false,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

      // Connection event listeners for monitoring
      mongoose.connection.on('error', (err) => {
        console.error(`❌ MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully.');
      });

      return conn;
    } catch (error) {
      retries += 1;
      console.error(
        `❌ MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (retries >= MAX_RETRIES) {
        console.error('💀 Max retries reached. Exiting process...');
        process.exit(1);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const waitTime = Math.pow(2, retries) * 1000;
      console.log(`⏳ Retrying in ${waitTime / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};

export default connectDB;
