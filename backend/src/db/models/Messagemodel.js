// db/models/Messagemodel.js (excerpt)
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
      userId: { type: String, default: "anonymous" },
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String },
      parsed: { type: mongoose.Schema.Types.Mixed },   // store JSON from interpretQuery
      results: { type: mongoose.Schema.Types.Mixed },  // array of { dataset, stats } or error objects
      timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);
