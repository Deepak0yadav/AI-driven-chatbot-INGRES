export function classifyIntent(userQuery, parsed, lastAssistant) {
      const q = (userQuery || "").toLowerCase().trim();

      // 0. If LLM parser gave an explicit intent → trust it
      if (parsed?.intent) return parsed.intent;

      // 1. Chitchat
      const greetings = ["hi", "hello", "hey", "yo", "what's up", "who are you"];
      if (greetings.some(g => q === g || q.includes(g))) return "chitchat";

      // 2. Clarification / rephrase intent
      const clarifKeywords = ["explain", "simplify", "again", "repeat", "shorter", "longer", "why", "how", "detail"];
      if (clarifKeywords.some(k => q.includes(k))) return "clarification";

      // 3. Compare intent
      if (/\b(compare|contrast|vs|versus|difference)\b/.test(q)) {
            return (parsed?.datasets?.length > 0) ? "compare" : "clarification";
      }

      // 4. If parser failed
      if (!parsed || Object.keys(parsed).length === 0) return "unknown";

      // 5. Dataset changes
      if (parsed?.datasets?.length > 0) {
            const locationOrTimeChanged = ["stateName", "districtName", "stationName", "startdate", "enddate"].some(
                  k => parsed[k] && parsed[k] !== (lastAssistant?.parsed?.[k] || null)
            );

            if (locationOrTimeChanged) return "new-query";

            const datasetChanged =
                  lastAssistant?.parsed?.datasets &&
                  JSON.stringify(parsed.datasets.sort()) !== JSON.stringify(lastAssistant.parsed.datasets.sort());

            if (datasetChanged) return "new-query";

            return "add-dataset";
      }

      // 6. Explicit fetch words
      if (/\b(show|get|fetch|give|data|report|chart)\b/.test(q)) return "new-query";

      return "clarification";
}
