const LLMService = require("../service/llm-service");
const ToolService = require("../service/tool-service");
const ShoppingAgent = require("../agent/shopping-agent");
const { BadRequestError, NotFoundError } = require("../utils/errors/app-error");

class AIController {
  constructor() {
    this.llmService = new LLMService();
    this.toolService = new ToolService();
    this.shoppingAgent = new ShoppingAgent();
  }

  async ping(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        status: "ONLINE",
        service: "AI-Service",
        timestamp: new Date().toISOString(),
      },
      message: "AI Service is operational",
      error: {},
    });
  }

  async health(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        service: "AI-Service",
        status: "HEALTHY",
        port: 5018,
        model: this.llmService.provider.model,
        toolsAvailable: this.toolService.getToolDefinitions().length,
        timestamp: new Date().toISOString(),
      },
      message: "AI Service health check passed",
      error: {},
    });
  }

  async directChat(req, res, next) {
    try {
      const { message, history, systemPrompt, temperature, maxTokens } = req.body;

      if (!message) {
        return next(new BadRequestError("Request body must include a 'message' string"));
      }

      const response = await this.llmService.generateChatResponse({
        message,
        history,
        systemPrompt,
        temperature,
        maxTokens,
      });

      return res.status(200).json({
        success: true,
        data: response,
        message: "AI response generated successfully",
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async getTools(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        count: this.toolService.getToolDefinitions().length,
        tools: this.toolService.getToolDefinitions(),
      },
      message: "Available AI tools retrieved successfully",
      error: {},
    });
  }

  async executeTool(req, res, next) {
    try {
      const { toolName, args = {} } = req.body;

      if (!toolName) {
        return next(new BadRequestError("Request body must include 'toolName'"));
      }

      const userContext = {
        token: req.token || req.headers["authorization"]?.split(" ")[1],
        userId: req.user?.id || req.user?._id || req.headers["x-user-id"],
        role: req.user?.role || req.headers["x-user-role"],
        email: req.user?.email || req.headers["x-user-email"],
      };

      const result = await this.toolService.executeTool(
        toolName,
        args,
        userContext,
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: `Tool '${toolName}' executed successfully`,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  // ==========================================
  // PHASE 4: SHOPPING AGENT CONTROLLER METHODS
  // ==========================================

  async agentChat(req, res, next) {
    try {
      const { message, sessionId, temperature } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return next(new BadRequestError("Request body must include a valid non-empty 'message' string"));
      }

      const userContext = {
        token: req.token || req.headers["authorization"]?.split(" ")[1],
        userId: req.user?.id || req.user?._id || req.headers["x-user-id"] || "anonymous_user",
        role: req.user?.role || req.headers["x-user-role"] || "customer",
        email: req.user?.email || req.headers["x-user-email"],
      };

      const response = await this.shoppingAgent.processUserMessage({
        message: message.trim(),
        sessionId,
        userContext,
        correlationId: req.headers["x-correlation-id"],
        temperature,
      });

      return res.status(200).json({
        success: true,
        data: response,
        message: "Shopping agent response generated successfully",
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async getUserSessions(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id || req.headers["x-user-id"];
      const limit = parseInt(req.query.limit) || 20;
      const skip = parseInt(req.query.skip) || 0;

      const sessions = await this.shoppingAgent.getUserSessions(userId, limit, skip);

      return res.status(200).json({
        success: true,
        data: {
          count: sessions.length,
          sessions,
        },
        message: "User chat sessions retrieved successfully",
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async getSessionDetails(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id || req.headers["x-user-id"];
      const { sessionId } = req.params;

      const session = await this.shoppingAgent.getSessionDetails(sessionId, userId);

      return res.status(200).json({
        success: true,
        data: { session },
        message: "Chat session retrieved successfully",
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteSession(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id || req.headers["x-user-id"];
      const { sessionId } = req.params;

      const result = await this.shoppingAgent.deleteSession(sessionId, userId);

      return res.status(200).json({
        success: true,
        data: result,
        message: "Chat session deleted successfully",
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = AIController;
