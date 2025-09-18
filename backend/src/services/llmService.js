import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI("AIzaSyDNgzElKRfj370VWSnmtlVE1njuuxR4_QI");

export async function interpretQuery(userQuery, history = [], lastParsed = null) {
      const historyText = history
            .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
            .join("\n");

      // Build base prompt
      const prompt = `
You are a STRICT query parser for INGRES AI (water/climate assistant).
Return ONLY valid JSON, never explanations.

Conversation so far:
${historyText}

The user now says: "${userQuery}"

Previous context (if available):
${lastParsed ? JSON.stringify(lastParsed) : "null"}

RULES:
- Only include datasets explicitly named by user.
- If vague words ("that", "previous", "same", "it", "continue") → reuse fields from lastParsed.
- If chit-chat (hi, ok, thanks) → intent="chitchat".
- If unclear → intent="unknown".
- If user says "compare" → intent="compare" + fill compareContexts.
- If user says "add X" → intent="add-dataset".
- Default intent → "new-query".

JSON schema:
{
  "intent": "new-query" | "clarification" | "compare" | "add-dataset" | "chitchat" | "unknown",
  "resetContext": true/false,
  "needsClarification": true/false,
  "datasets": ["groundwater-level","rainfall","temperature","soil-moisture","river-discharge","evapo-transpiration"],
  "granularity": "state" | "district" | "station" | null,
  "stateName": string | null,
  "districtName": string | null,
  "stationName": string | null,
  "startdate": "YYYY-MM-DD" | null,
  "enddate": "YYYY-MM-DD" | null,
  "compareContexts": [ { ...same schema... }, { ...same schema... } ] | null
}
`;

      try {
            const model = ai.getGenerativeModel({
                  model: "gemini-1.5-flash",
                  systemInstruction: "Return ONLY valid JSON. Never add text outside JSON.",
            });

            const response = await model.generateContent(prompt);
            let text = response.response.text().trim();

            if (text.startsWith("```")) {
                  text = text.replace(/```(json)?/, "").replace(/```$/, "").trim();
            }

            const parsed = JSON.parse(text);

            // 🔑 Merge with lastParsed if needed
            if (lastParsed && parsed.intent === "new-query") {
                  // If user left some fields empty → reuse from lastParsed
                  parsed.stateName = parsed.stateName || lastParsed.stateName;
                  parsed.districtName = parsed.districtName || lastParsed.districtName;
                  parsed.stationName = parsed.stationName || lastParsed.stationName;
                  parsed.startdate = parsed.startdate || lastParsed.startdate;
                  parsed.enddate = parsed.enddate || lastParsed.enddate;
                  parsed.datasets = parsed.datasets?.length ? parsed.datasets : lastParsed.datasets;
            }

            return parsed;
      } catch (e) {
            console.error("❌ interpretQuery failed:", e.message);
            return {
                  intent: "unknown",
                  resetContext: false,
                  needsClarification: false,
                  datasets: [],
                  stateName: null,
                  districtName: null,
                  stationName: null,
                  startdate: null,
                  enddate: null,
                  compareContexts: null,
                  error: `Gemini parse failed: ${e.message}`,
            };
      }
}
