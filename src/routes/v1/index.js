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

module.exports = router;
