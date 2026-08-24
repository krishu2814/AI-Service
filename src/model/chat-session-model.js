const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "system", "tool"],
    },
    content: {
      type: String,
      default: "",
    },
    toolCalls: [
      {
        id: { type: String },
        type: { type: String, default: "function" },
        function: {
          name: { type: String },
          arguments: { type: String },
        },
      },
    ],
    toolCallId: {
      type: String,
    },
    name: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Shopping Session",
    },
    messages: [messageSchema],
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for querying user sessions sorted by activity
chatSessionSchema.index({ userId: 1, lastActiveAt: -1 });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

module.exports = ChatSession;
