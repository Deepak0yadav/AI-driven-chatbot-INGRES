import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI("AIzaSyDNgzElKRfj370VWSnmtlVE1njuuxR4_QI");


export async function summarizeWithAI(parsed, results = [], history = [], lastParsed = null) {
      const validResults = results.filter(
            (r) => r.stats && r.stats.timeseries && r.stats.timeseries.length > 0
      );
      const failedResults = results.filter(
            (r) => !r.stats || !r.stats.timeseries || r.stats.timeseries.length === 0
      );

      // 🛑 No usable data
      if (validResults.length === 0) {
            const errorList = failedResults
                  .map((r) => `- ${r.dataset}: ${r.error || "No data"}`)
                  .join("\n");
            return {
                  summary: `No usable data available.\n\nErrors:\n${errorList}`,
            };
      }

      const historyText =
            history && history.length
                  ? history
                        .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
                        .join("\n")
                  : "No previous history";

      const prompt = `
You are INGRES AI, a groundwater & climate assistant.
Your job is to summarize datasets factually and conversationally, as if continuing the same chat.
NEVER invent values.

Region: ${parsed.stateName || lastParsed?.stateName || ""}
District: ${parsed.districtName || lastParsed?.districtName || ""}
Period: ${parsed.startdate || lastParsed?.startdate || "?"} → ${parsed.enddate || lastParsed?.enddate || "?"}

Datasets:
${validResults
                  .map((r) => `- ${r.dataset}: ${JSON.stringify(r.stats)}`)
                  .join("\n")}

Failed datasets:
${failedResults.length ? failedResults.map((r) => `- ${r.dataset}: No data`).join("\n") : "None"}

Conversation so far:
${historyText}

Guidelines:
- If only 1 dataset → 2–3 sentences summary.
- If multiple datasets → 3–5 sentences, highlight contrasts/patterns.
- Mention failed datasets as "No data available".
- Write like you remember the chat, e.g., "In addition to what we saw earlier..."
`;

      try {
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent(prompt);
            return { summary: response.response.text().trim() };
      } catch (e) {
            return { error: `AI summarization failed: ${e.message}` };
      }
}
