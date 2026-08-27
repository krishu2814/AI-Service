const axios = require("axios");
const {
  GROQ_API_KEY,
  LLM_MODEL,
  LLM_BASE_URL,
} = require("../config/serverConfig");

class LLMProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || GROQ_API_KEY;
    this.model = config.model || LLM_MODEL;
    this.baseURL = config.baseURL || LLM_BASE_URL;
    this.timeout = config.timeout || 12000; // 12s timeout protection
  }

  async chatCompletion({
    messages,
    tools = null,
    toolChoice = "auto",
    temperature = 0.2,
    maxTokens = 1024,
  }) {
    if (!this.apiKey) {
      console.warn("[LLMProvider] No GROQ_API_KEY found in environment. Using deterministic mock response for local testing.");
      return this._generateMockResponse(messages, tools);
    }

    try {
      const payload = {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (tools && Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = toolChoice;
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.timeout,
        },
      );

      const choice = response.data?.choices?.[0];
      if (!choice) {
        throw new Error("Invalid response format received from LLM provider");
      }

      return {
        content: choice.message?.content || "",
        role: choice.message?.role || "assistant",
        toolCalls: choice.message?.tool_calls || null,
        usage: response.data?.usage || {},
        model: response.data?.model || this.model,
        isMock: false,
      };
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        console.error("[LLMProvider Error] LLM request timed out after", this.timeout, "ms");
        throw new Error("AI provider request timed out. Please try again shortly.");
      }

      const status = error.response?.status;
      const errorDetail = error.response?.data?.error?.message || error.message;

      console.error(`[LLMProvider Error] Status: ${status || "N/A"}, Detail: ${errorDetail}`);

      if (status === 401) {
        throw new Error("Invalid or expired LLM API credentials.");
      } else if (status === 429) {
        throw new Error("AI provider rate limit exceeded. Please retry in a few seconds.");
      } else if (status >= 500) {
        throw new Error("AI provider is temporarily unavailable. Please try again later.");
      }

      throw new Error(`AI generation failed: ${errorDetail}`);
    }
  }

  _generateMockResponse(messages, tools) {
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    const lastMsg = lastUserIndex !== -1 ? messages[lastUserIndex] : null;
    const lastUserText = (lastMsg?.content || "").toLowerCase();

    // Check if there is a tool response message AFTER the latest user message
    let toolMsg = null;
    if (lastUserIndex !== -1) {
      for (let i = lastUserIndex + 1; i < messages.length; i++) {
        if (messages[i].role === "tool") {
          toolMsg = messages[i];
        }
      }
    }

    if (toolMsg) {
      // Synthesize final response from tool output
      let parsed = {};
      try {
        parsed = JSON.parse(toolMsg?.content || "{}");
      } catch (e) {}

      if (parsed.products && parsed.products.length > 0) {
        const top = parsed.products[0];
        return {
          content: `I found matching products in our catalog! For example: **${top.name}** priced at **$${top.price}** (Category: ${top.category}, In Stock: ${top.stock ? "Yes (" + top.stock + " units)" : "Available"}). Let me know if you would like to inspect specifications or add it to your cart!`,
          role: "assistant",
          toolCalls: null,
          usage: { prompt_tokens: 40, completion_tokens: 50, total_tokens: 90 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      } else if (parsed.cart) {
        const count = parsed.cart.items?.length || 0;
        return {
          content: `You currently have ${count} item(s) in your active shopping cart with a total value of $${parsed.cart.totalPrice || 0}.`,
          role: "assistant",
          toolCalls: null,
          usage: { prompt_tokens: 30, completion_tokens: 35, total_tokens: 65 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      } else if (parsed.orders) {
        const count = parsed.orders.length || 0;
        return {
          content: `You have ${count} recent order(s) placed on our platform.`,
          role: "assistant",
          toolCalls: null,
          usage: { prompt_tokens: 30, completion_tokens: 35, total_tokens: 65 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      } else {
        return {
          content: `I checked our catalog and records: No matching items or records were found for that request.`,
          role: "assistant",
          toolCalls: null,
          usage: { prompt_tokens: 25, completion_tokens: 30, total_tokens: 55 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      }
    }

    // If tools are provided and user is asking for search / cart / order, trigger mock tool call
    if (tools && Array.isArray(tools) && tools.length > 0) {
      if (lastUserText.includes("cart")) {
        return {
          content: "",
          role: "assistant",
          toolCalls: [
            {
              id: `call_mock_cart_${Date.now()}`,
              type: "function",
              function: {
                name: "getCart",
                arguments: JSON.stringify({}),
              },
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      } else if (lastUserText.includes("order")) {
        return {
          content: "",
          role: "assistant",
          toolCalls: [
            {
              id: `call_mock_orders_${Date.now()}`,
              type: "function",
              function: {
                name: "getUserOrders",
                arguments: JSON.stringify({ limit: 5 }),
              },
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      } else if (
        lastUserText.includes("find") ||
        lastUserText.includes("search") ||
        lastUserText.includes("laptop") ||
        lastUserText.includes("phone") ||
        lastUserText.includes("price") ||
        lastUserText.includes("device") ||
        lastUserText.includes("stock") ||
        lastUserText.includes("under") ||
        lastUserText.includes("product")
      ) {
        // Extract search query
        let query = lastUserText.replace(/(find|search|for|a|an|me|under|\$|\d+)/gi, "").trim();
        if (!query) query = "laptop";

        return {
          content: "",
          role: "assistant",
          toolCalls: [
            {
              id: `call_mock_search_${Date.now()}`,
              type: "function",
              function: {
                name: "searchProducts",
                arguments: JSON.stringify({ query }),
              },
            },
          ],
          usage: { prompt_tokens: 35, completion_tokens: 25, total_tokens: 60 },
          model: `${this.model}-mock-fallback`,
          isMock: true,
        };
      }
    }

    // Default conversational response
    const conversationalResponses = [
      "Hey! 👋 Welcome! I'm your AI Shopping Assistant. What can I help you find today?",
      "Hello! How can I assist you with your shopping today?",
      "Hi there! Feel free to ask me for product recommendations, inventory checks, or help with your cart and orders.",
    ];
    const randomReply = conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)];

    return {
      content: randomReply,
      role: "assistant",
      toolCalls: null,
      usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
      model: `${this.model}-mock-fallback`,
      isMock: true,
    };
  }
}

module.exports = LLMProvider;
