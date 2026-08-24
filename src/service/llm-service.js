const LLMProvider = require("../provider/llm-provider");

const DEFAULT_ECOMMERCE_SYSTEM_PROMPT = `You are the Intelligent Ecommerce Assistant for our online store.
Your goal is to assist customers with product discovery, order inquiries, store policies, and recommendations.

Core Guidelines:
1. Be helpful, concise, polite, and professional.
2. Ground all answers strictly in facts provided by verified backend services.
3. NEVER invent fake product prices, specifications, or stock availability.
4. If you do not have enough information to answer a question, clearly explain what is missing.
5. Do NOT provide financial or legal advice.`;

class LLMService {
  constructor(provider = null) {
    this.provider = provider || new LLMProvider();
  }

  async generateChatResponse({
    message,
    history = [],
    systemPrompt = DEFAULT_ECOMMERCE_SYSTEM_PROMPT,
    temperature = 0.2,
    maxTokens = 1024,
  }) {
    if (!message || typeof message !== "string" || message.trim() === "") {
      throw new Error("A valid non-empty user message is required.");
    }

    // Build structured OpenAI-compatible messages array
    const formattedMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Append verified conversation history (filter to system/user/assistant)
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        if (item && item.role && item.content) {
          formattedMessages.push({
            role: item.role,
            content: String(item.content),
          });
        }
      }
    }

    // Append the new user message
    formattedMessages.push({
      role: "user",
      content: message.trim(),
    });

    const result = await this.provider.chatCompletion({
      messages: formattedMessages,
      temperature,
      maxTokens,
    });

    return {
      reply: result.content,
      model: result.model,
      usage: result.usage,
      isMock: result.isMock,
    };
  }
}

module.exports = LLMService;
