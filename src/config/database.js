const mongoose = require("mongoose");
const { MONGODB_URI } = require("./serverConfig");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[MongoDB] Connected to AI Service Database (ecommerce_ai)");
  } catch (error) {
    console.error("[MongoDB Error] AI Service DB connection failed:", error.message);
    // Do not crash the entire process if AI database is temporarily unavailable
  }
};

module.exports = {
  connectDB,
};
