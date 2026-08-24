const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Search product catalog by keywords, category, and price range. Returns a list of matching products.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords, brand, or product title (e.g. 'gaming laptop', 'headphones').",
          },
          category: {
            type: "string",
            description: "Product category filter (e.g. 'Electronics', 'Laptops', 'Audio').",
          },
          minPrice: {
            type: "number",
            description: "Minimum price in dollars.",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars.",
          },
          limit: {
            type: "number",
            description: "Maximum number of products to return (default: 10).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProduct",
      description: "Retrieve comprehensive details, specifications, and price for a single product by ID.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "The unique MongoDB ID of the product.",
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventory",
      description: "Check real-time physical warehouse stock availability for a specific product.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "The unique MongoDB ID of the product to check stock for.",
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCart",
      description: "Retrieve the authenticated user's current shopping cart and items.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getUserOrders",
      description: "Retrieve recent orders placed by the currently authenticated user.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of orders to retrieve (default: 5).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrderDetails",
      description: "Retrieve detailed status, items, amounts, and tracking for a specific order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The unique ID of the order.",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPaymentDetails",
      description: "Check the payment transaction status and payment method for a specific payment ID.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description: "The unique ID of the payment record.",
          },
        },
        required: ["paymentId"],
      },
    },
  },
];

module.exports = {
  TOOL_DEFINITIONS,
};
