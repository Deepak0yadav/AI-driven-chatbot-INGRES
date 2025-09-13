import axios from "axios";

const WRIS_BASE = process.env.WRIS_BASE || "https://indiawris.gov.in";

export async function fetchGroundWaterLevel({
      stateName,
      districtName,
      agencyName = "cgwb",
      startdate,
      enddate,
      page = 0,
      size = 100,
}) {
      const url = `${WRIS_BASE}/Dataset/Ground%20Water%20Level`;

      // Build params but skip null/undefined values
      const params = {
            ...(stateName ? { stateName } : {}),
            ...(districtName ? { districtName } : {}),
            ...(agencyName ? { agencyName } : {}),
            ...(startdate ? { startdate } : {}),
            ...(enddate ? { enddate } : {}),
            download: false,
            page,
            size,
      };

      console.log("👉 WRIS Request Params:", params);

      try {
            const resp = await axios.post(url, {}, { params, timeout: 15000 });
            return resp.data; // contains statusCode, message, data[]
      } catch (err) {
            console.error("❌ WRIS API error:", err.response?.data || err.message);
            throw new Error(
                  `WRIS request failed: ${err.response?.status} ${err.response?.statusText}`
            );
      }
}
