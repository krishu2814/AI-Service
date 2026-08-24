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

module.exports = router;
