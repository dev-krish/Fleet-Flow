const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetflow', {
      serverSelectionTimeoutMS: 3000 // 3 seconds timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.isMockDB = false;
  } catch (error) {
    console.warn(`\n=============================================================`);
    console.warn(`MONGODB CONNECTION WARNING: ${error.message}`);
    console.warn(`FALLING BACK TO LOCAL IN-MEMORY JSON DATABASE (mockDb.js)`);
    console.warn(`=============================================================\n`);
    global.isMockDB = true;
  }
};

module.exports = connectDB;
