import axios from "axios";

const WRIS_BASE = process.env.WRIS_BASE || "https://indiawris.gov.in";

async function postDataset(path, { stateName, districtName, agencyName, startdate, enddate, page = 0, size = 100 }) {
      const url = `${WRIS_BASE}/Dataset/${path}`;
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

      try {
            const resp = await axios.post(url, {}, { params, timeout: 20000 });
            return resp.data;
      } catch (err) {
            throw new Error(`WRIS ${path} failed: ${err.response?.status} ${err.response?.statusText}`);
      }
}

export const fetchGroundWaterLevel = (params) =>
      postDataset("Ground%20Water%20Level", { ...params, agencyName: "CGWB" });

export const fetchRainfall = (params) =>
      postDataset("RainFall", { ...params, agencyName: "CWC" });

export const fetchTemperature = (params) =>
      postDataset("Temperature", { ...params, agencyName: "IMD" });

export const fetchSoilMoisture = (params) =>
      postDataset("Soil%20Moisture", { ...params, agencyName: "NRSC VIC MODEL" });

export const fetchRiverDischarge = (params) =>
      postDataset("River%20Water%20Discharge", { ...params, agencyName: "CWC" });

export const fetchEvapoTranspiration = (params) =>
      postDataset("Evapo%20Transpiration", { ...params, agencyName: "NRSC VIC MODEL" });
