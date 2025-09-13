// src/services/aiSummaryService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI("AIzaSyDNgzElKRfj370VWSnmtlVE1njuuxR4_QI");

export async function summarizeWithAI(stats, parsed) {
      const prompt = `
You are a groundwater and climate data assistant.
Summarize the following dataset stats into a short, readable explanation for end users. 
Be precise, neutral, and easy to understand.

Context:
- Dataset: ${parsed.dataset}
- State: ${parsed.stateName || "N/A"}
- District: ${parsed.districtName || "N/A"}
- Station: ${parsed.stationName || "N/A"}
- Period: ${parsed.startdate || "?"} to ${parsed.enddate || "?"}

Stats:
- Min: ${stats.min}
- Max: ${stats.max}
- Avg: ${stats.avg}
- Timeseries length: ${stats.timeseries.length}

Write 2–3 sentences describing the data trend and key insights.
`;

      try {
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent(prompt);
            const text = response.response.text().trim();
            return text;
      } catch (e) {
            return `Could not summarize: ${e.message}`;
      }
}
