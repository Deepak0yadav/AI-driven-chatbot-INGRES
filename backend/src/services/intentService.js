// services/intentService.js
export function classifyIntent(userQuery, parsed, lastAssistant) {
      const q = (userQuery || "").toLowerCase();

      // quick checks for clarification / rephrase
      const clarifKeywords = ["explain", "explain in", "simplify", "simpler", "again", "repeat", "shorter", "longer", "why", "how", "detail", "details", "more"];
      if (clarifKeywords.some(k => q.includes(k))) return "clarification";

      // if user explicitly asks to "compare" or "contrast"
      if (/\b(compare|contrast|vs|versus|difference)\b/.test(q)) {
            // treat as add-dataset if datasets present else clarification if no datasets
            return (parsed?.datasets && parsed.datasets.length > 0) ? "add-dataset" : "clarification";
      }

      // If parsed lists datasets
      if (parsed?.datasets && parsed.datasets.length > 0) {
            // If parsed contains no location/date info but we have lastAssistant context -> it's likely add-dataset
            const hasNewLocationFields = ["stateName", "districtName", "stationName", "startdate", "enddate"].some(k => parsed[k]);
            if (lastAssistant && !hasNewLocationFields) return "add-dataset";
            return "new-query";
      }

      // If parsed empty but query contains fetch words -> new query
      if (/\b(show|get|fetch|give|data|report|chart)\b/.test(q)) return "new-query";

      // default fallback -> clarification (safe)
      return "clarification";
}
 