const express = require("express");
const { PORT } = require("./config/serverConfig");
const { connectDB } = require("./config/database");
const apiRoutes = require("./routes/index");
const correlationMiddleware = require("./middleware/correlation-middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationMiddleware);

app.use("/api", apiRoutes);

// Root health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "AI-Service",
    status: "HEALTHY",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Error Handling Middleware
app.use(require("./middleware/not-found-handler"));
app.use(require("./middleware/error-handler"));

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`[AI Service] Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[AI Service] Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
