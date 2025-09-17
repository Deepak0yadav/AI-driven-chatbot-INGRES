import {
      fetchGroundWaterLevel,
      fetchRainfall,
      fetchTemperature,
      fetchSoilMoisture,
      fetchRiverDischarge,
      fetchEvapoTranspiration,
} from "./wrisService.js";

const datasetHandlers = {
      "groundwater-level": fetchGroundWaterLevel,
      "rainfall": fetchRainfall,
      "temperature": fetchTemperature,
      "soil-moisture": fetchSoilMoisture,
      "river-discharge": fetchRiverDischarge,
      "evapo-transpiration": fetchEvapoTranspiration,
};

export async function fetchDataset(dataset, params) {
      const handler = datasetHandlers[dataset];
      if (!handler) throw new Error(`Dataset not supported: ${dataset}`);
      return handler(params);
}
