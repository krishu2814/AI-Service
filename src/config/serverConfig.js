const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5018,
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce_ai",
  PRODUCT_SERVICE_URL:
    process.env.PRODUCT_SERVICE_URL || "http://localhost:5009",
  CART_SERVICE_URL:
    process.env.CART_SERVICE_URL || "http://localhost:5010",
  ORDER_SERVICE_URL:
    process.env.ORDER_SERVICE_URL || "http://localhost:5012",
  PAYMENT_SERVICE_URL:
    process.env.PAYMENT_SERVICE_URL || "http://localhost:5013",
  INVENTORY_SERVICE_URL:
    process.env.INVENTORY_SERVICE_URL || "http://localhost:5016",
  SECRET_TOKEN:
    process.env.SECRET_TOKEN ||
    process.env.JWT_SECRET ||
    "ecommerce_jwt_secret_dev_key",
};
