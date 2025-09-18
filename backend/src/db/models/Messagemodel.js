// db/models/Messagemodel.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
      userId: {
            type: String,
            required: true,
            index: true,
      },
      role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
      },
      content: {
            type: String,
            required: true,
      },
      // Parsed context returned by LLM (JSON object)
      parsed: {
            type: Object,
            default: null,
      },
      // Results after fetching datasets (array of objects)
      results: {
            type: Array,
            default: [],
      },
      timestamp: {
            type: Date,
            default: Date.now,
      },
});

export default mongoose.model("Message", MessageSchema);
