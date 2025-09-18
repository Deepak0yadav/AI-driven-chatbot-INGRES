import express from "express";
import Message from "../db/models/Messagemodel.js";
import { interpretQuery } from "../services/llmService.js";
import { fetchDataset } from "../services/wrisDispatcher.js";
import { summarizeSeries } from "../services/transformService.js";
import { summarizeWithAI } from "../services/aiSummaryService.js";
import { getLastAssistant, resetUserContext } from "../services/contextService.js";

const router = express.Router();
const DATA_TTL_MS = 1000 * 60 * 60; // 1 hour cache

// Helper: fetch multiple datasets
async function fetchDatasets(toFetch, parsed) {
      const results = [];
      for (const ds of toFetch) {
            try {
                  console.log("🌐 Fetching dataset:", ds);
                  const wris = await fetchDataset(ds, {
                        stateName: parsed.stateName,
                        districtName: parsed.districtName,
                        stationName: parsed.stationName,
                        startdate: parsed.startdate,
                        enddate: parsed.enddate,
                        size: 100,
                  });

                  const data = wris.data || [];
                  console.log(`📈 Dataset ${ds} fetched, count:`, data.length);

                  const stats = summarizeSeries(data, ds);
                  results.push({ dataset: ds, stats });
            } catch (err) {
                  console.error("❌ Error fetching dataset:", ds, err);
                  results.push({ dataset: ds, error: err.message || String(err) });
            }
      }
      return results;
}

router.post("/", async (req, res, next) => {
      try {
            const { userQuery, userId } = req.body;
            const uid = userId || "anonymous";
            console.log("➡️ Incoming request:", { userQuery, userId: uid });

            // Save user message
            const userMsg = await Message.create({
                  userId: uid,
                  role: "user",
                  content: userQuery,
            });
            console.log("💾 Saved user message:", userMsg._id);

            // Build chat history
            const history = await Message.find({ userId: uid }).sort({ timestamp: 1 }).lean();
            const historyForAI = history.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
            }));

            // 🔑 Fetch last assistant context
            const lastAssistant = await getLastAssistant(uid);
            const lastParsed = lastAssistant?.parsed || null;

            // Parse intent/context using Gemini with memory
            const parsed = await interpretQuery(userQuery, historyForAI, lastParsed);
            console.log("📝 Parsed (from Gemini with memory):", parsed);

            // 👉 Handle Chitchat
            if (parsed.intent === "chitchat") {
                  const reply = "👋 I'm INGRES AI – your groundwater and water resources assistant.";
                  await Message.create({ userId: uid, role: "assistant", content: reply });
                  return res.json({ parsed, results: [], aiSummary: reply });
            }

            // 👉 Handle Unknown
            if (parsed.intent === "unknown") {
                  const reply =
                        "🤖 I'm not sure what you mean. Try asking about groundwater, rainfall, temperature, etc.";
                  await Message.create({ userId: uid, role: "assistant", content: reply });
                  return res.json({ parsed, results: [], aiSummary: reply });
            }

            // 👉 Handle Clarification (AI summary instead of static)
            if (parsed.needsClarification) {
                  console.log("🔍 Clarification needed. Passing context to AI...");
                  const aiSummary = await summarizeWithAI(parsed, []);
                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed,
                        results: [],
                  });
                  return res.json({ parsed, results: [], aiSummary });
            }

            // 👉 Handle Context Reset
            if (parsed.intent === "reset" || /reset|clear/i.test(userQuery)) {
                  console.log("🔄 Explicit reset requested by user:", uid);
                  await resetUserContext(uid);
            }

            // 👉 Handle Compare (safe & resilient)
            if (parsed.intent === "compare" && parsed.compareContexts) {
                  let ctx1, ctx2;

                  if (parsed.compareContexts.length === 2) {
                        [ctx1, ctx2] = parsed.compareContexts;
                  } else if (parsed.compareContexts.length === 1) {
                        ctx1 = lastParsed || parsed;
                        ctx2 = parsed.compareContexts[0];
                  } else {
                        return res
                              .status(400)
                              .json({ error: "Compare needs at least one context" });
                  }

                  let res1 = [], res2 = [];
                  try {
                        res1 = await fetchDatasets(ctx1.datasets || [], ctx1);
                  } catch (err) {
                        console.error("❌ Compare ctx1 fetch failed:", err);
                  }
                  try {
                        res2 = await fetchDatasets(ctx2.datasets || [], ctx2);
                  } catch (err) {
                        console.error("❌ Compare ctx2 fetch failed:", err);
                  }

                  const aiSummary = await summarizeWithAI(parsed, [...res1, ...res2]);

                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed,
                        results: [res1, res2],
                  });

                  return res.json({ parsed, results: [res1, res2], aiSummary });
            }

            // 👉 Handle Add-Dataset
            if (parsed.intent === "add-dataset") {
                  const toFetch = parsed.datasets || [];
                  const fetchedResults = await fetchDatasets(toFetch, parsed);
                  const aiSummary = await summarizeWithAI(parsed, fetchedResults);

                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed,
                        results: fetchedResults,
                  });

                  return res.json({ parsed, results: fetchedResults, aiSummary });
            }

            // 👉 Check Cache
            const now = Date.now();
            const lastTs = lastAssistant?.timestamp
                  ? new Date(lastAssistant.timestamp).getTime()
                  : 0;
            const isFresh = now - lastTs < DATA_TTL_MS;

            if (
                  lastAssistant &&
                  JSON.stringify(lastAssistant.parsed) === JSON.stringify(parsed) &&
                  isFresh
            ) {
                  console.log("♻️ Using cached results");
                  const aiSummary = await summarizeWithAI(parsed, lastAssistant.results);
                  await Message.create({
                        userId: uid,
                        role: "assistant",
                        content: aiSummary.summary,
                        parsed,
                        results: lastAssistant.results,
                  });
                  return res.json({
                        parsed,
                        results: lastAssistant.results,
                        aiSummary,
                  });
            }

            // 👉 Normal Flow: fresh fetch
            const toFetch = parsed.datasets || [];
            const fetchedResults = await fetchDatasets(toFetch, parsed);

            const aiSummary = await summarizeWithAI(parsed, fetchedResults);
            console.log("📝 AI summary generated");

            await Message.create({
                  userId: uid,
                  role: "assistant",
                  content: aiSummary.summary,
                  parsed,
                  results: fetchedResults,
            });

            return res.json({ parsed, results: fetchedResults, aiSummary });
      } catch (err) {
            console.error("🔥 Route error:", err);
            next(err);
      }
});

export default router;
