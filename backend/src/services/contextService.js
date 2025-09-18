// services/contextService.js
import Message from "../db/models/Messagemodel.js";

// Get last assistant response (for caching or context reuse)
export async function getLastAssistant(userId) {
      return await Message.findOne({ userId, role: "assistant" })
            .sort({ timestamp: -1 })
            .lean();
}

// Reset full context when Gemini says resetContext = true
export async function resetUserContext(userId) {
      try {
            await Message.deleteMany({ userId });
            console.log(`🗑️ Context reset for user: ${userId}`);
      } catch (err) {
            console.error("❌ Error resetting context:", err);
      }
}
