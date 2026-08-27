const axios = require("axios");
const {
  PRODUCT_SERVICE_URL,
  INVENTORY_SERVICE_URL,
  CART_SERVICE_URL,
  ORDER_SERVICE_URL,
  PAYMENT_SERVICE_URL,
} = require("../config/serverConfig");
const { getCorrelationId } = require("../middleware/correlation-middleware");

class ToolExecutor {
  constructor(timeout = 5000) {
    this.timeout = timeout;
  }

  _getHeaders(token) {
    const correlationId = getCorrelationId();
    const headers = {
      "Content-Type": "application/json",
      "x-correlation-id": correlationId || `corr-${Date.now()}`,
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }
    return headers;
  }

  async searchProducts(args = {}) {
    try {
      const { query, category, minPrice, maxPrice, limit = 10 } = args;
      const params = {};
      if (query) params.search = query;
      if (category) params.category = category;
      if (minPrice !== undefined && !isNaN(minPrice)) params.minPrice = minPrice;
      if (maxPrice !== undefined && !isNaN(maxPrice)) params.maxPrice = maxPrice;
      if (limit) params.limit = limit;

      const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1`, {
        params,
        headers: this._getHeaders(),
        timeout: this.timeout,
      });

      const products = response.data?.data || [];
      return {
        success: true,
        status: "SUCCESS",
        count: products.length,
        products: products.map((p) => ({
          id: p._id || p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          brand: p.brand || "",
          inStock: (p.stock || 0) > 0,
          stock: p.stock || 0,
          rating: p.rating || 4.5,
        })),
      };
    } catch (error) {
      console.warn("[Tool searchProducts error]:", error.message);
      return {
        success: false,
        status: "SERVICE_UNAVAILABLE",
        error: "Product service is temporarily unreachable or returning errors.",
        products: [],
      };
    }
  }

  async getProduct(args = {}) {
    try {
      const { productId } = args;
      if (!productId) {
        return { success: false, status: "INVALID_ARGS", error: "productId parameter is required" };
      }

      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/v1/${productId}`,
        {
          headers: this._getHeaders(),
          timeout: this.timeout,
        },
      );

      const p = response.data?.data;
      if (!p) {
        return { success: false, status: "NOT_FOUND", error: "Product not found" };
      }

      return {
        success: true,
        status: "SUCCESS",
        product: {
          id: p._id || p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          brand: p.brand || "",
          stock: p.stock || 0,
          rating: p.rating || 0,
        },
      };
    } catch (error) {
      console.warn(`[Tool getProduct error for ${args.productId}]:`, error.message);
      return {
        success: false,
        status: error.response?.status === 404 ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
        error: error.response?.data?.message || "Product information unavailable",
      };
    }
  }

  async getInventory(args = {}) {
    try {
      const { productId } = args;
      if (!productId) {
        return { success: false, status: "INVALID_ARGS", error: "productId parameter is required" };
      }

      const response = await axios.get(
        `${INVENTORY_SERVICE_URL}/api/v1/inventory/${productId}`,
        {
          headers: this._getHeaders(),
          timeout: this.timeout,
        },
      );

      const inv = response.data?.data;
      if (!inv) {
        return {
          success: true,
          status: "SUCCESS",
          productId,
          availableQuantity: 0,
          inStock: false,
          message: "No warehouse inventory record found for this product.",
        };
      }

      const quantity = inv.quantity !== undefined ? inv.quantity : (inv.totalQuantity || 0);
      const reservedQuantity = inv.reservedQuantity || 0;
      const availableQuantity =
        inv.availableQuantity !== undefined
          ? inv.availableQuantity
          : Math.max(0, quantity - reservedQuantity);

      return {
        success: true,
        status: "SUCCESS",
        productId: inv.productId || productId,
        quantity,
        availableQuantity,
        reservedQuantity,
        inStock: availableQuantity > 0,
      };
    } catch (error) {
      console.warn(`[Tool getInventory error for ${args.productId}]:`, error.message);
      return {
        success: false,
        status: "SERVICE_UNAVAILABLE",
        error: "Warehouse inventory lookup temporarily unavailable.",
      };
    }
  }

  async getCart(args = {}, context = {}) {
    try {
      const token = context.token;
      if (!token) {
        return {
          success: false,
          status: "UNAUTHORIZED",
          error: "Guest user. Authentication token required to view user shopping cart.",
        };
      }

      const response = await axios.get(`${CART_SERVICE_URL}/api/v1`, {
        headers: this._getHeaders(token),
        timeout: this.timeout,
      });

      const cart = response.data?.data;
      return {
        success: true,
        status: "SUCCESS",
        cart: cart || { items: [] },
      };
    } catch (error) {
      console.warn("[Tool getCart error]:", error.message);
      return {
        success: false,
        status: error.response?.status === 401 ? "UNAUTHORIZED" : "SERVICE_UNAVAILABLE",
        error: error.response?.data?.message || "Shopping cart lookup unavailable",
      };
    }
  }

  async getUserOrders(args = {}, context = {}) {
    try {
      const token = context.token;
      if (!token) {
        return {
          success: false,
          status: "UNAUTHORIZED",
          error: "Guest user. Authentication token required to view order history.",
        };
      }

      const response = await axios.get(`${ORDER_SERVICE_URL}/api/v1`, {
        headers: this._getHeaders(token),
        timeout: this.timeout,
      });

      const orders = response.data?.data || [];
      const limit = args.limit || 5;

      return {
        success: true,
        status: "SUCCESS",
        count: orders.length,
        orders: orders.slice(0, limit).map((o) => ({
          orderId: o._id || o.id,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          totalAmount: o.totalAmount,
          itemCount: o.items?.length || 0,
          createdAt: o.createdAt,
        })),
      };
    } catch (error) {
      console.warn("[Tool getUserOrders error]:", error.message);
      return {
        success: false,
        status: error.response?.status === 401 ? "UNAUTHORIZED" : "SERVICE_UNAVAILABLE",
        error: error.response?.data?.message || "Order history lookup unavailable",
      };
    }
  }

  async getOrderDetails(args = {}, context = {}) {
    try {
      const { orderId } = args;
      const token = context.token;
      if (!orderId) {
        return { success: false, status: "INVALID_ARGS", error: "orderId parameter is required" };
      }
      if (!token) {
        return {
          success: false,
          status: "UNAUTHORIZED",
          error: "Guest user. Authentication token required to view specific order details.",
        };
      }

      const response = await axios.get(`${ORDER_SERVICE_URL}/api/v1/${orderId}`, {
        headers: this._getHeaders(token),
        timeout: this.timeout,
      });

      const order = response.data?.data;
      if (!order) {
        return { success: false, status: "NOT_FOUND", error: `Order ${orderId} not found` };
      }

      return {
        success: true,
        status: "SUCCESS",
        order: {
          orderId: order._id || order.id,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount || 0,
          couponCode: order.couponCode || null,
          items: order.items || [],
          createdAt: order.createdAt,
        },
      };
    } catch (error) {
      console.warn(`[Tool getOrderDetails error for ${args.orderId}]:`, error.message);
      return {
        success: false,
        status: error.response?.status === 404 ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
        error: error.response?.data?.message || "Order details lookup unavailable",
      };
    }
  }

  async getPaymentDetails(args = {}, context = {}) {
    try {
      const { paymentId } = args;
      const token = context.token;
      if (!paymentId) {
        return { success: false, status: "INVALID_ARGS", error: "paymentId parameter is required" };
      }

      const response = await axios.get(`${PAYMENT_SERVICE_URL}/api/v1/${paymentId}`, {
        headers: this._getHeaders(token),
        timeout: this.timeout,
      });

      const payment = response.data?.data;
      return {
        success: true,
        status: "SUCCESS",
        payment: payment || null,
      };
    } catch (error) {
      console.warn(`[Tool getPaymentDetails error for ${args.paymentId}]:`, error.message);
      return {
        success: false,
        status: "SERVICE_UNAVAILABLE",
        error: error.response?.data?.message || "Payment verification unavailable",
      };
    }
  }
}

module.exports = ToolExecutor;
