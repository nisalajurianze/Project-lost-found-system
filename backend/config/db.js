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
      const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
      
      if (!uri) {
        throw new Error('MONGO_URI is not defined in environment variables');
      }

      const conn = await mongoose.connect(uri, {
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

      // Drop old incorrect studentId index if it exists (so mongoose can recreate it as sparse)
      try {
        await conn.connection.db.collection('users').dropIndex('studentId_1');
        console.log('✅ Dropped old studentId_1 index');
      } catch (err) {
        // Ignore if index doesn't exist
      }

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
