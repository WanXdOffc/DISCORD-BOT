import mongoose from 'mongoose';
import config from '../../config.js';
import logger from '../utils/logger.js';

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) {
    logger.info('📦 Using existing database connection');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(config.database.uri, {
      ...config.database.options,
      dbName: 'hosei_bot',
    });

    isConnected = true;
    
    logger.info(`📦 MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database Name: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Mongoose disconnected from DB');
      isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🛑 Mongoose connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

export default connectDatabase;