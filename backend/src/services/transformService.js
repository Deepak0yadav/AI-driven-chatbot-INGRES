export function summarizeSeries(records) {
      const timeseries = records.map(r => ({ t: r.dataTime, v: r.dataValue }));
      const values = timeseries.map(x => Number(x.v)).filter(v => !Number.isNaN(v));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((s, a) => s + a, 0) / values.length || null;
      return { min, max, avg, timeseries };
}
