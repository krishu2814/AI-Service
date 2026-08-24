const crypto = require("crypto");
const LLMProvider = require("../provider/llm-provider");
const ToolService = require("../service/tool-service");
const ChatSessionRepository = require("../repository/chat-session-repository");
const { TOOL_DEFINITIONS } = require("../tools/tool-definitions");

class ShoppingAgent {
  constructor() {
    this.llmProvider = new LLMProvider();
    this.toolService = new ToolService();
    this.sessionRepo = new ChatSessionRepository();
    this.maxToolIterations = 3;
  }

  /**
   * Main conversational reasoning loop
   */
  async processUserMessage({
    message,
    sessionId = null,
    userContext = {},
    correlationId = null,
    temperature = 0.2,
  }) {
    const userId = userContext.userId || "anonymous_user";
    const activeSessionId = sessionId || `session_${crypto.randomUUID()}`;

    // 1. Retrieve or initialize chat session from MongoDB (ecommerce_ai)
    let session = await this.sessionRepo.findBySessionId(activeSessionId, userId);
    if (!session) {
      session = await this.sessionRepo.createSession({
        sessionId: activeSessionId,
        userId,
        title: message.slice(0, 45).trim() + (message.length > 45 ? "..." : ""),
        initialMessages: [],
      });
    }

    // 2. Build conversation history for LLM (sliding window of last 10 messages)
    const recentMessages = (session.messages || []).slice(-10).map((m) => {
      const msgObj = {
        role: m.role,
        content: m.content || "",
      };
      if (m.toolCalls && m.toolCalls.length > 0) {
        msgObj.tool_calls = m.toolCalls;
      }
      if (m.toolCallId) {
        msgObj.tool_call_id = m.toolCallId;
      }
      if (m.name) {
        msgObj.name = m.name;
      }
      return msgObj;
    });

    // 3. Prepare system instruction & user prompt
    const systemPrompt = {
      role: "system",
      content: `You are the Intelligent Ecommerce Shopping Agent.
Your role is to help customers discover products, verify stock availability, inspect their active shopping cart, and review order history.

STRICT GROUNDING & ZERO-HALLUCINATION RULES:
1. ALWAYS use the provided tools ('searchProducts', 'getProduct', 'getInventory', 'getCart', 'getUserOrders', 'getOrderDetails') to fetch real catalog facts.
2. NEVER invent fake product prices, specifications, or stock quantities.
3. If a product search returns no items or warehouse stock is 0, clearly inform the customer without inventing substitute items.
4. Keep answers friendly, concise, and structured with prices, stock numbers, and key features highlighted.`,
    };

    const userMessageObj = {
      role: "user",
      content: message,
    };

    const currentTurnMessages = [
      systemPrompt,
      ...recentMessages,
      userMessageObj,
    ];

    const messagesToPersist = [
      {
        role: "user",
        content: message,
        timestamp: new Date(),
      },
    ];

    const toolsUsed = [];
    let iterations = 0;
    let finalReply = "";
    let finalModel = "";

    // 4. Autonomous Tool-Calling / ReAct Execution Loop
    while (iterations < this.maxToolIterations) {
      iterations++;

      const llmResult = await this.llmProvider.chatCompletion({
        messages: currentTurnMessages,
        tools: TOOL_DEFINITIONS,
        temperature,
      });

      finalModel = llmResult.model;

      // Check if LLM requested one or more tool calls
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        const assistantToolCallMsg = {
          role: "assistant",
          content: llmResult.content || "",
          tool_calls: llmResult.toolCalls,
        };
        currentTurnMessages.push(assistantToolCallMsg);

        messagesToPersist.push({
          role: "assistant",
          content: llmResult.content || "",
          toolCalls: llmResult.toolCalls,
          timestamp: new Date(),
        });

        // Execute each tool call requested by the model
        for (const toolCall of llmResult.toolCalls) {
          const toolName = toolCall.function?.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
          } catch (e) {
            toolArgs = {};
          }

          toolsUsed.push({
            toolName,
            args: toolArgs,
          });

          // Execute tool with user's JWT and correlation tracking
          const toolExecResult = await this.toolService.executeTool(
            toolName,
            toolArgs,
            userContext,
          );

          const toolResultMsg = {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(toolExecResult.data || {}),
          };

          currentTurnMessages.push(toolResultMsg);

          messagesToPersist.push({
            role: "tool",
            toolCallId: toolCall.id,
            name: toolName,
            content: JSON.stringify(toolExecResult.data || {}),
            timestamp: new Date(),
          });
        }
      } else {
        // Model produced final conversational response
        finalReply = llmResult.content || "I have processed your request.";
        messagesToPersist.push({
          role: "assistant",
          content: finalReply,
          timestamp: new Date(),
        });
        break;
      }
    }

    if (!finalReply) {
      finalReply = "I looked into your request and found the latest information from our catalog.";
    }

    // 5. Persist dialogue turn into MongoDB (ecommerce_ai)
    await this.sessionRepo.appendMessages(
      activeSessionId,
      userId,
      messagesToPersist,
    );

    return {
      reply: finalReply,
      sessionId: activeSessionId,
      toolsUsed,
      model: finalModel,
      iterations,
    };
  }

  async getUserSessions(userId, limit = 20, skip = 0) {
    return await this.sessionRepo.getUserSessions(userId, limit, skip);
  }

  async getSessionDetails(sessionId, userId) {
    const session = await this.sessionRepo.findBySessionId(sessionId, userId);
    if (!session) {
      throw new Error("Chat session not found");
    }
    return session;
  }

  async deleteSession(sessionId, userId) {
    const deleted = await this.sessionRepo.deleteSession(sessionId, userId);
    if (!deleted) {
      throw new Error("Chat session not found or already deleted");
    }
    return { success: true, message: "Session deleted successfully" };
  }
}

module.exports = ShoppingAgent;
