// Transform WRIS records into stats
export function summarizeSeries(records, dataset) {
      const timeseries = records.map(r => ({
            t: r.dataTime,
            v: Number(r.dataValue),
      })).filter(r => !isNaN(r.v));

      if (!timeseries.length) return { min: null, max: null, avg: null, timeseries: [] };

      const values = timeseries.map(x => x.v);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((s, a) => s + a, 0) / values.length;

      if (dataset === "rainfall") {
            const total = values.reduce((s, v) => s + v, 0);
            return { min, max, avg, total, timeseries };
      }

      return { min, max, avg, timeseries };
}
