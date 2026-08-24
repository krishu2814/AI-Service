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
    this.timeout = config.timeout || 10000; // 10s timeout protection
  }

  async chatCompletion({ messages, temperature = 0.2, maxTokens = 1024 }) {
    if (!this.apiKey) {
      console.warn("[LLMProvider] No GROQ_API_KEY found in environment. Using deterministic mock response for local testing.");
      return this._generateMockResponse(messages);
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
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

  _generateMockResponse(messages) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    return {
      content: `[Mock AI Assistant]: I received your query: "${lastUserMessage}". (Configure GROQ_API_KEY in .env for live Groq Llama-3.3-70b responses).`,
      role: "assistant",
      usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
      model: `${this.model}-mock-fallback`,
      isMock: true,
    };
  }
}

module.exports = LLMProvider;
