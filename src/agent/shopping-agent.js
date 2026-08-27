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
    const token = userContext.token || null;
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

    // 2. Build sliding window conversation memory (last 12 messages)
    const recentMessages = (session.messages || []).slice(-12).map((m) => {
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

    // 3. System Prompt - Advanced AI Shopping Assistant Directives
    const isGuest = userId === "anonymous_user";
    const systemPrompt = {
      role: "system",
      content: `You are an expert AI Shopping Assistant for an e-commerce platform.

User Authentication Context:
- User Status: ${isGuest ? "GUEST_VISITOR (Not signed in)" : `AUTHENTICATED_CUSTOMER (User ID: ${userId})`}

CORE RESPONSIBILITIES:
1. CASUAL CONVERSATION & GREETINGS:
   - For greetings, pleasantries, or general queries (e.g. "hi", "hello", "hey", "good morning", "how are you", "who are you", "what can you do", "thanks", "bye", "cool", "ok"):
     • Respond naturally, concisely, and conversationally as a helpful assistant.
     • DO NOT call any tool when tools are unnecessary (0 tool calls).
     • DO NOT state, claim, or imply that you searched the catalog unless a search tool was executed in this conversation.

2. SHOPPING DATA & TOOL EXECUTION:
   - When the user asks for store data (searching products, specifications, inventory, cart, or orders), call the appropriate tool:
     • 'searchProducts': Search catalog by query, category, minPrice, maxPrice, or limit.
     • 'getProduct': Get full specs for a single product by ID.
     • 'getInventory': Check real-time physical warehouse stock for a product.
     • 'getCart': View shopping cart (requires signed-in user).
     • 'getUserOrders': View user order history (requires signed-in user).
     • 'getOrderDetails': View status & items for a specific order ID.
     • 'getPaymentDetails': Verify payment status.

3. BUDGET & CURRENCY EXPRESSIONS:
   - Parse budget phrases accurately into numeric minPrice/maxPrice parameters:
     • 'under ₹60,000' or 'below 60000' or '60k' -> maxPrice: 60000
     • 'under $1000' or 'below $1000' -> maxPrice: 1000
     • 'between 40k and 60k' -> minPrice: 40000, maxPrice: 60000

4. MULTI-TURN CONTEXT & REFERENCE RESOLUTION:
   - Resolve context from previous conversation turns:
     • "which one is cheapest?" -> Analyze products listed in previous turn and identify the one with lowest price.
     • "is it in stock?" -> Check inventory for the specific product discussed in the previous turn.
     • "compare the top two" -> Generate a Markdown specs comparison table for the top 2 products previously listed.

5. ACCURACY & ZERO HALLUCINATION GUARANTEE:
   - NEVER invent or fabricate products, prices, stock quantities, order IDs, discount codes, or tracking statuses.
   - If a tool returns no matches ('count: 0'), suggest useful options (e.g., widening budget or trying another category).
   - If a microservice is offline or fails ('SERVICE_UNAVAILABLE'), explain clearly: "I'm currently unable to reach our product catalog / system. Please try again shortly."
   - If a guest user asks to view cart or orders, explain politely: "Please sign in to view your shopping cart or order history."

6. RECOMMENDATION QUALITY & FORMATTING:
   - When presenting products, format them clearly:
     1. **Product Name** - Price
        • Key Spec / Specs
        • Why recommended
   - Be friendly, professional, concise, and helpful.`,
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

    // 4. ReAct Reasoning Loop
    while (iterations < this.maxToolIterations) {
      iterations++;

      const llmResult = await this.llmProvider.chatCompletion({
        messages: currentTurnMessages,
        tools: TOOL_DEFINITIONS,
        temperature,
      });

      finalModel = llmResult.model;

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

        // Execute each requested tool call
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

          // Execute tool with context (including JWT token and user ID)
          const toolExecResult = await this.toolService.executeTool(
            toolName,
            toolArgs,
            { ...userContext, token },
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
        // Model generated final assistant response
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
      finalReply = toolsUsed.length > 0
        ? "I retrieved the requested information from our catalog."
        : "How can I help you with your shopping today?";
    }

    // 5. Save dialogue turn to MongoDB
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
