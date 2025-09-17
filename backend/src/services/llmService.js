import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI("AIzaSyDNgzElKRfj370VWSnmtlVE1njuuxR4_QI");

export async function interpretQuery(userQuery, history = []) {
      const messagesForAI = [...history, { role: "user", content: userQuery }];

      const prompt = `
Extract the following as JSON:
- datasets: array of datasets (any of: groundwater-level | rainfall | temperature | groundwater-quality | soil-moisture | river-discharge | evapo-transpiration)
- granularity: (state | district | station)
- stateName (if any)
- districtName (if any)
- stationName (if any)
- startdate (YYYY-MM-DD) or null
- enddate (YYYY-MM-DD) or null

Return only valid JSON, no explanations or text.
User query: "${userQuery}"
`;

      try {
            const model = ai.getGenerativeModel({
                  model: "gemini-1.5-flash",
                  systemInstruction: "You are a strict JSON parser. Always return only valid JSON.",
            });

            const response = await model.generateContent(prompt, { context: messagesForAI });
            let text = response.response.text().trim();

            // Cleanup Markdown wrappers
            if (text.startsWith("```json")) {
                  text = text.replace(/^```json/, "").replace(/```$/, "").trim();
            } else if (text.startsWith("```")) {
                  text = text.replace(/^```/, "").replace(/```$/, "").trim();
            }

            return JSON.parse(text);
      } catch (e) {
            return { error: `Gemini parse failed: ${e.message}` };
      }
}
