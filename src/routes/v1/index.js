const express = require("express");
const AIController = require("../../controller/ai-controller");

const router = express.Router();
const aiController = new AIController();

// Foundation diagnostic endpoints
router.get("/ping", aiController.ping.bind(aiController));
router.get("/health", aiController.health.bind(aiController));

module.exports = router;
