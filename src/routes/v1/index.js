const express = require("express");
const AIController = require("../../controller/ai-controller");
const AuthenticUser = require("../../middleware/authentication");

const router = express.Router();
const aiController = new AIController();

// Diagnostics (public)
router.get("/ping", aiController.ping.bind(aiController));
router.get("/health", aiController.health.bind(aiController));

// LLM direct chat (authenticated)
router.post("/chat/direct", AuthenticUser, aiController.directChat.bind(aiController));

// Tools endpoints (authenticated)
router.get("/tools", AuthenticUser, aiController.getTools.bind(aiController));
router.post("/tools/execute", AuthenticUser, aiController.executeTool.bind(aiController));

// Phase 4: Shopping Agent & Session Memory (authenticated)
router.post("/agent/chat", AuthenticUser, aiController.agentChat.bind(aiController));
router.get("/agent/sessions", AuthenticUser, aiController.getUserSessions.bind(aiController));
router.get("/agent/sessions/:sessionId", AuthenticUser, aiController.getSessionDetails.bind(aiController));
router.delete("/agent/sessions/:sessionId", AuthenticUser, aiController.deleteSession.bind(aiController));

module.exports = router;
