import express from "express";
import { interpretQuery } from "../services/llmService.js";
import { fetchGroundWaterLevel } from "../services/wrisService.js";
import { summarizeSeries } from "../services/transformService.js";
import { summarizeWithAI } from "../services/aiSummaryService.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
      try {
            const { userQuery } = req.body;
            const parsed = await interpretQuery(userQuery);

            if (parsed.dataset === "groundwater-level") {
                  const wris = await fetchGroundWaterLevel({
                        stateName: parsed.stateName,
                        districtName: parsed.districtName,
                        startdate: parsed.startdate,
                        enddate: parsed.enddate,
                        size: 100,
                  });

                  const data = wris.data || [];
                  const stats = summarizeSeries(data);
                  const aiSummary = await summarizeWithAI(stats, parsed);
                  console.log("👉 AI Summary:", aiSummary);

                  const answer = {
                        dataset: parsed.dataset,
                        parsed,
                        summary: aiSummary,  // <-- natural language output
                       
                  };
                  console.log("👉 Answer:", answer);
                  return res.json(answer);
            }

            return res.status(400).json({ error: "Dataset not supported yet" });
      } catch (err) {
            next(err);
      }
});

export default router;
