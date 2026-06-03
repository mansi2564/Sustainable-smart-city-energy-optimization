const mongoose = require('mongoose');

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    // await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-city-energy', {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-city-energy', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize databases
const initializeDatabases = async () => {
  await connectMongoDB();
  return { mongoose };
};

module.exports = {
  connectMongoDB,
  initializeDatabases
};

