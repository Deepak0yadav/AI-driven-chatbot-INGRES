// Transform WRIS records into stats
export function summarizeSeries(records, dataset) {
      const timeseries = records
            .map((r) => ({
                  t: r.dataTime,
                  v: Number(r.dataValue),
            }))
            .filter((r) => !isNaN(r.v));

      if (!timeseries.length) return { min: null, max: null, avg: null, timeseries: [] };

      const values = timeseries.map((x) => x.v);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((s, a) => s + a, 0) / values.length;

      if (dataset === "rainfall") {
            const total = values.reduce((s, v) => s + v, 0);
            return { min, max, avg, total, timeseries };
      }

      return { min, max, avg, timeseries };
}

/**
 * Compare two summarized datasets and return difference insights.
 * @param {Object} stats1 - first dataset stats
 * @param {Object} stats2 - second dataset stats
 * @returns {Object} difference summary
 */
export function calculateDifference(stats1, stats2) {
      if (!stats1 || !stats2) return { note: "Missing dataset(s)" };

      const diff = {};

      if (stats1.avg != null && stats2.avg != null) {
            diff.avgDiff = stats2.avg - stats1.avg;
      }

      if (stats1.min != null && stats2.min != null) {
            diff.minDiff = stats2.min - stats1.min;
      }

      if (stats1.max != null && stats2.max != null) {
            diff.maxDiff = stats2.max - stats1.max;
      }

      if (stats1.total != null && stats2.total != null) {
            diff.totalDiff = stats2.total - stats1.total;
      }

      return diff;
}
