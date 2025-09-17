import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI("AIzaSyDNgzElKRfj370VWSnmtlVE1njuuxR4_QI");

export async function summarizeWithAI(stats, parsed, results = null) {
      let prompt;

      if (results && results.length > 1) {
            // Separate datasets with usable stats and those with errors/missing data
            const validResults = results.filter(
                  r => r.stats && r.stats.timeseries && r.stats.timeseries.length > 0
            );
            const failedResults = results.filter(
                  r => !r.stats || !r.stats.timeseries || r.stats.timeseries.length === 0
            );

            // If none have usable data, just return errors
            if (validResults.length === 0) {
                  const errorList = failedResults.map(r =>
                        `- ${r.dataset}: ${r.error || "No data"}`
                  ).join("\n");
                  return {
                        summary: `No usable data available for the requested datasets.\n\nErrors:\n${errorList}`
                  };
            }

            // If some have usable data, summarize only those, but mention missing/failed datasets
            const failedList = failedResults.length > 0
                  ? "\n\nThe following datasets could not be retrieved:\n" +
                  failedResults.map(r => `- ${r.dataset}: ${r.error || "No data"}`).join("\n")
                  : "";

            prompt = `
You are a groundwater and climate data assistant.
Compare the following datasets across the same region and period.

Region: ${parsed.stateName || "N/A"}, ${parsed.districtName || "N/A"}
Period: ${parsed.startdate || "?"} to ${parsed.enddate || "?"}

Datasets with usable data:
${validResults.map(r => `- ${r.dataset}: ${JSON.stringify(r.stats)}`).join("\n")}

Guidelines:
- Write ONE combined summary, not per dataset.
- Only compare and summarize the datasets with usable data above.
- If some datasets are missing or failed, mention them at the end.
- Point out similarities or contrasts between rainfall, groundwater, temperature, soil moisture, river discharge, and evapo-transpiration, but only for those present.
- Focus on overall trends and differences.
- Write in 3–5 sentences only.
${failedList}
`;
      } else {
            // ✅ Single dataset mode
            if (!stats || !stats.timeseries || stats.timeseries.length === 0) {
                  if (results && results[0] && results[0].error) {
                        return { summary: `No usable data available for the requested dataset.\n\nError: ${results[0].error}` };
                  }
                  return { summary: "No usable data available for the requested dataset." };
            }

            prompt = `
You are a groundwater and climate data assistant.
Summarize the dataset into a short, readable explanation for end users.

Dataset: ${parsed.dataset}
State: ${parsed.stateName || "N/A"}
District: ${parsed.districtName || "N/A"}
Period: ${parsed.startdate || "?"} to ${parsed.enddate || "?"}

Stats:
${Object.entries(stats).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Guidelines:
- If dataset = rainfall → mention total rainfall and heaviest day.
- If dataset = groundwater-level → mention average depth and variation.
- If dataset = temperature → mention avg temperature and range.
- If dataset = soil-moisture → mention avg soil moisture and changes.
- If dataset = river-discharge → mention avg flow and peaks.
- If dataset = evapo-transpiration → mention avg rate and range.
- Keep it factual and simple.
- Write in 2–3 sentences only.
`;
      }

      try {
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent(prompt);
            return { summary: response.response.text().trim() };
      } catch (e) {
            return { error: `AI summarization failed: ${e.message}` };
      }
}