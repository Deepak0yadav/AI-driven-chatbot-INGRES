import express from "express";
import Message from "../db/models/Messagemodel.js";
import { interpretQuery } from "../services/llmService.js";
import { fetchDataset } from "../services/wrisDispatcher.js";
import { summarizeSeries } from "../services/transformService.js";
import { summarizeWithAI } from "../services/aiSummaryService.js";

import { getLastAssistant, mergeParsedContext, paramsChanged, datasetsToFetch } from "../services/contextService.js";
import { classifyIntent } from "../services/intentService.js";

const router = express.Router();

// TTL (ms) to consider last results fresh. adjust as needed.
const DATA_TTL_MS = 1000 * 60 * 60; // 1 hour

router.post("/", async (req, res, next) => {
      try {
            const { userQuery, userId } = req.body;
            const uid = userId || "anonymous";

            // Fetch full history (for interpretQuery)
            const history = await Message.find({ userId: uid }).sort({ timestamp: 1 }).lean();
            const historyForAI = history.map(msg => ({ role: msg.role === "user" ? "user" : "assistant", content: msg.content }));

            // Extract structured params from user's query (your existing function)
            const parsed = await interpretQuery(userQuery, historyForAI);

            // Get last assistant message (if any)
            const lastAssistant = await getLastAssistant(uid);

            // Decide intent
            const intent = classifyIntent(userQuery, parsed, lastAssistant);

            if (intent === "clarification") {
                  if (!lastAssistant || !lastAssistant.results) {
                        return res.json({
                              aiSummary: "I don’t have any previous data to clarify. Could you provide more details?",
                              parsed: {},
                              results: []
                        });
                  }

                  // Call summarizeWithAI to rephrase/clarify using previous parsed/results
                  // We pass the previous parsed & results so AI can use same context
                  const aiSummary = await summarizeWithAI(null, lastAssistant.parsed, lastAssistant.results);

                  // Save assistant reply with same parsed/results
                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed: lastAssistant.parsed,
                        results: lastAssistant.results,
                  });

                  return res.json({ parsed: lastAssistant.parsed, results: lastAssistant.results, aiSummary });
            }

            // For add-dataset/new-query: merge contexts
            const mergedParsed = mergeParsedContext(lastAssistant?.parsed, parsed);

            // Determine whether params changed (if so, we need to re-fetch everything)
            const coreParamsChanged = paramsChanged(lastAssistant?.parsed, mergedParsed);

            // Determine which datasets to fetch
            const lastResults = lastAssistant?.results || [];
            let toFetch = [];
            let existingResults = [];

            if (coreParamsChanged) {
                  // param change → refetch all requested datasets
                  toFetch = mergedParsed.datasets || [];
                  existingResults = []; // we cannot reuse old results if params changed
            } else {
                  // reuse existing; fetch only missing datasets
                  toFetch = datasetsToFetch(mergedParsed, lastResults);
                  existingResults = lastResults;
            }

            // Additional freshness check (optional): if lastAssistant is recent and no toFetch -> reuse
            const now = Date.now();
            const lastTs = lastAssistant?.timestamp ? new Date(lastAssistant.timestamp).getTime() : 0;
            const isFresh = (now - lastTs) < DATA_TTL_MS;

            if (toFetch.length === 0 && isFresh) {
                  // No new datasets and last results are fresh -> reuse and just re-run AI summary (maybe user asked add-dataset but no new dataset)
                  const aiSummary = await summarizeWithAI(null, mergedParsed, existingResults);

                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed: mergedParsed,
                        results: existingResults,
                  });

                  return res.json({ parsed: mergedParsed, results: existingResults, aiSummary });
            }

            // Otherwise, fetch only the missing datasets
            const fetchedResults = [];
            for (const ds of toFetch) {
                  try {
                        // Map your dataset name to the WRIS handler inside fetchDataset
                        const wris = await fetchDataset(ds, {
                              stateName: mergedParsed.stateName,
                              districtName: mergedParsed.districtName,
                              stationName: mergedParsed.stationName,
                              startdate: mergedParsed.startdate,
                              enddate: mergedParsed.enddate,
                              size: 100,
                        });

                        const data = wris.data || [];
                        const stats = summarizeSeries(data, ds);
                        fetchedResults.push({ dataset: ds, stats });
                  } catch (err) {
                        fetchedResults.push({ dataset: ds, error: err.message || String(err) });
                  }
            }

            // Combine existing results (keep those not replaced) + fetched
            // If dataset names duplicate, prefer fetchedResults
            const finalResultsMap = new Map();
            for (const r of existingResults) {
                  finalResultsMap.set(r.dataset, r);
            }
            for (const r of fetchedResults) {
                  finalResultsMap.set(r.dataset, r);
            }
            const combinedResults = Array.from(finalResultsMap.values());

            // Generate AI summary depending on result count
            let aiSummary;
            if (combinedResults.length > 1) {
                  aiSummary = await summarizeWithAI(null, mergedParsed, combinedResults);
            } else {
                  aiSummary = await summarizeWithAI(combinedResults[0]?.stats || null, { ...mergedParsed, dataset: combinedResults[0]?.dataset });
            }

            // Save assistant response with parsed + results
            await Message.create({
                  userId: uid,
                  role: "assistant",
                  content: aiSummary.summary,
                  parsed: mergedParsed,
                  results: combinedResults,
            });

            // Return response
            return res.json({ parsed: mergedParsed, results: combinedResults, aiSummary });
      } catch (err) {
            next(err);
      }
});

// Get conversation history
router.get("/history", async (req, res) => {
      const { userId } = req.query;
      try {
            const history = await Message.find({ userId }).sort({ timestamp: 1 }).lean();
            res.json({ history });
      } catch (err) {
            console.error("History fetch error:", err);
            res.status(500).json({ error: "Failed to fetch history" });
      }
});


export default router;
