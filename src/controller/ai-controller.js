const LLMService = require("../service/llm-service");

class AIController {
  constructor() {
    this.llmService = new LLMService();
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
        timestamp: new Date().toISOString(),
      },
      message: "AI Service health check passed",
      error: {},
    });
  }

  async directChat(req, res) {
    try {
      const { message, history, systemPrompt, temperature, maxTokens } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          data: {},
          message: "Request body must include a 'message' string",
          error: "ValidationError",
        });
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
      console.error("[AIController directChat Error]:", error.message);
      return res.status(500).json({
        success: false,
        data: {},
        message: "Failed to generate AI response",
        error: error.message,
      });
    }
  }
}

module.exports = AIController;
