class AIController {
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
        timestamp: new Date().toISOString(),
      },
      message: "AI Service health check passed",
      error: {},
    });
  }
}

module.exports = AIController;
