import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';

const MONGO_OPTIONS = {
  dbName: env.mongo.dbName,
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    const conn = await mongoose.connect(env.mongo.uri, MONGO_OPTIONS);
    isConnected = true;

    logger.info(`MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected — attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    process.on('SIGINT', gracefulShutdown('SIGINT'));
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
  } catch (err) {
    logger.error('MongoDB initial connection failed', { error: err.message });
    process.exit(1);
  }
};

const gracefulShutdown = (signal) => async () => {
  try {
    await mongoose.connection.close();
    logger.info(`MongoDB connection closed via ${signal}`);
    process.exit(0);
  } catch (err) {
    logger.error(`Error closing MongoDB on ${signal}`, { error: err.message });
    process.exit(1);
  }
};

export const getConnectionStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host,
  name: mongoose.connection.name,
});

export default connectDB;
