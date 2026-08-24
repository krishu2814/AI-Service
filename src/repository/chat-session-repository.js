const ChatSession = require("../model/chat-session-model");

class ChatSessionRepository {
  async createSession({ sessionId, userId, title = "Shopping Inquiry", initialMessages = [] }) {
    return await ChatSession.create({
      sessionId,
      userId,
      title,
      messages: initialMessages,
      lastActiveAt: new Date(),
    });
  }

  async findBySessionId(sessionId, userId) {
    const query = { sessionId };
    if (userId) query.userId = userId;
    return await ChatSession.findOne(query);
  }

  async appendMessages(sessionId, userId, newMessages = []) {
    const session = await this.findBySessionId(sessionId, userId);
    if (!session) return null;

    session.messages.push(...newMessages);
    session.lastActiveAt = new Date();

    // Auto-update title from first user message if title is default
    if (session.title === "New Shopping Session" || session.title === "Shopping Inquiry") {
      const firstUserMsg = session.messages.find((m) => m.role === "user");
      if (firstUserMsg && firstUserMsg.content) {
        session.title = firstUserMsg.content.slice(0, 45).trim() + (firstUserMsg.content.length > 45 ? "..." : "");
      }
    }

    return await session.save();
  }

  async getUserSessions(userId, limit = 20, skip = 0) {
    return await ChatSession.find({ userId })
      .select("sessionId title lastActiveAt createdAt updatedAt")
      .sort({ lastActiveAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  async deleteSession(sessionId, userId) {
    const query = { sessionId };
    if (userId) query.userId = userId;
    return await ChatSession.findOneAndDelete(query);
  }
}

module.exports = ChatSessionRepository;
