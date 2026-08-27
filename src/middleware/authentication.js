const jwt = require("jsonwebtoken");
const { SECRET_TOKEN } = require("../config/serverConfig");

const AuthenticUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        data: {},
        message: "Authorization token is missing",
        error: "Unauthorized",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decoded = jwt.verify(token, SECRET_TOKEN);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: {},
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

const OptionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
      try {
        const decoded = jwt.verify(token, SECRET_TOKEN);
        req.user = decoded;
      } catch (e) {
        req.user = { id: "anonymous_user", role: "customer" };
      }
    } else {
      req.user = { id: "anonymous_user", role: "customer" };
    }
    next();
  } catch (error) {
    req.user = { id: "anonymous_user", role: "customer" };
    next();
  }
};

module.exports = AuthenticUser;
module.exports.AuthenticUser = AuthenticUser;
module.exports.OptionalAuth = OptionalAuth;
