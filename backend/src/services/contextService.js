// services/contextService.js
import Message from "../db/models/Messagemodel.js";

/**
 * Get last assistant message with parsed context
 */
export async function getLastAssistant(uid) {
      return Message.findOne({ userId: uid, role: "assistant", parsed: { $exists: true } })
            .sort({ timestamp: -1 })
            .lean();
}

/**
 * Merge previous parsed context with newly parsed values.
 * New values overwrite old; datasets arrays are unioned.
 */
export function mergeParsedContext(prev = {}, curr = {}) {
      const merged = { ...(prev || {}), ...(curr || {}) };

      // normalize dataset(s) into arrays
      const prevDatasets = prev?.datasets || (prev?.dataset ? [prev.dataset] : []);
      const currDatasets = curr?.datasets || (curr?.dataset ? [curr.dataset] : []);
      const set = new Set([...(prevDatasets || []), ...(currDatasets || [])]);
      merged.datasets = Array.from(set);

      // ensure stationName, stateName, districtName, startdate, enddate overwritten if provided
      ["stateName", "districtName", "stationName", "startdate", "enddate"].forEach(key => {
            if (curr[key] === undefined || curr[key] === null || curr[key] === "") {
                  merged[key] = prev?.[key] ?? null;
            } else {
                  merged[key] = curr[key];
            }
      });

      return merged;
}

/**
 * Detect if core parameters changed between contexts
 * If state/district/station/dates changed -> return true
 */
export function paramsChanged(prev = {}, curr = {}) {
      if (!prev) return true;
      const keys = ["stateName", "districtName", "stationName", "startdate", "enddate"];
      return keys.some(k => {
            const a = (prev[k] ?? null) || null;
            const b = (curr[k] ?? null) || null;
            return String(a) !== String(b);
      });
}

/**
 * Determine which datasets need fetching.
 * lastResults: array of { dataset, stats } (may be undefined)
 * mergedParsed.datasets: desired datasets array
 */
export function datasetsToFetch(mergedParsed, lastResults = []) {
      const desired = mergedParsed.datasets || [];
      const have = (lastResults || []).map(r => r.dataset);
      return desired.filter(ds => !have.includes(ds));
}
