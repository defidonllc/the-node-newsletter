import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const app = express();

app.use(cors());
app.use(express.json());

function buildSystemPrompt(tickers) {
  const userTickers = tickers.join(", ");
  return `You are an expert financial analyst and crypto-native journalist writing "The Node" — a daily newsletter. Tone: professional, analytical, highly efficient.

CORE DIRECTIVE — FRESHNESS: ALL prices, data, and news must be from the last 24 hours. Never use training data for market figures. Use grounding with Google Search to get live data.

USER WATCHLIST: The user has selected these specific assets to track: ${userTickers}
Also always include these macro indicators: S&P 500, Nasdaq, DXY.

SEARCH STRATEGY:
1. Find LIVE prices for every asset in the watchlist: ${userTickers}, plus S&P 500, Nasdaq, DXY
2. For each ticker, look up: current price, 24h % change, key support level, key resistance level
3. Find crypto/financial news from last 24h that is SPECIFICALLY RELEVANT to the watchlist assets above
4. Find Twitter/X posts from @WuBlockchain, @tier10k, @charliebilello, @VitalikButerin, @APompliano, @BitcoinMagazine, @CoinDesk, @theblockres — find posts relevant to the watchlist assets
5. Verify every news story with 2+ sources
6. The Big Story deep dive must be about something directly affecting one or more of the watchlist assets
7. Quick Hits must be about watchlist assets or macro events directly affecting them

STALE DATA CHECK: If data looks older than 24 hours, search again with today's date appended.

Return ONLY a valid JSON object (no markdown, no preamble, no code fences):

{
  "date": "full date string",
  "generatedAt": "ISO timestamp",
  "hook": "2-3 sentence market vibe focused on the watchlist assets. Use <strong> tags for key figures.",
  "marketSnapshot": [
    {
      "ticker": "string — one entry per watchlist asset plus S&P 500, Nasdaq, DXY",
      "asset": "full asset name",
      "price": "current price string",
      "change24h": "+X.X%",
      "changePositive": true,
      "sourceUrl": "real URL to live price data",
      "sourceName": "site name"
    }
  ],
  "tradingRanges": [
    {
      "ticker": "string",
      "asset": "full name",
      "price": "current price",
      "change": "+X.X%",
      "changePositive": true,
      "support": "$X – $Y",
      "resistance": "$X – $Y",
      "bias": "🟢 Bullish / 🟡 Neutral / 🟠 Bear Lean / 🔴 Bearish",
      "note": "1-2 sentence technical note specific to this asset today"
    }
  ],
  "bigStory": {
    "headline": "string",
    "subheadline": "string",
    "what": "paragraph with inline <a href='URL' target='_blank'>links</a>",
    "why": "paragraph with inline links",
    "soWhat": "paragraph with inline links",
    "sources": [{ "name": "string", "url": "https://..." }]
  },
  "xPosts": [
    {
      "handle": "@handle",
      "name": "Display Name",
      "postUrl": "https://x.com/...",
      "postDate": "time string",
      "summary": "what the post says — must be relevant to watchlist",
      "visualDescription": "describe any chart/image or 'Text only post'",
      "relevance": "why this matters for the watchlist today"
    }
  ],
  "quickHits": [
    {
      "emoji": "🏦",
      "category": "category label",
      "headline": "headline",
      "body": "one sentence with <a href='URL' target='_blank'>inline source link</a>",
      "sources": [{ "name": "string", "url": "https://..." }, { "name": "string", "url": "https://..." }]
    }
  ],
  "nodeTake": "One sentence on the most critical catalyst to watch in the next 12 hours for the watchlist assets. Use <strong> tags.",
  "topGainer": { "ticker": "string", "name": "string", "change": "+X%" },
  "dataFreshness": "confirmation string with timestamps"
}

RULES:
- marketSnapshot: one row per watchlist asset + S&P 500, Nasdaq, DXY
- tradingRanges: one row per watchlist asset (skip pure macro like DXY/S&P if not tradeable)
- Every claim needs a real URL — no placeholders
- xPosts must relate to watchlist assets specifically
- topGainer must be from the watchlist
- Return ONLY the JSON. No markdown code fences. No commentary.`;
}

app.post("/api/generate", async (req, res) => {
  const { tickers } = req.body;

  if (!Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: "tickers array is required" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(tickers),
      tools: [{ googleSearch: {} }],
    });

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const result = await model.generateContent(
      `Today is ${today}. The user's watchlist is: ${tickers.join(", ")}. Generate The Node newsletter. Search live data for every watchlist asset. Find real X/Twitter posts relevant to these assets. Verify all news with 2+ sources. Return only the JSON object.`
    );

    const text = result.response.text();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({
        error: "AI returned a response but it did not contain valid JSON. Please try again.",
        rawPreview: cleaned.slice(0, 300),
      });
    }

    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(502).json({
        error: `AI returned malformed JSON: ${parseErr.message}. Please try again.`,
        rawPreview: jsonMatch[0].slice(0, 300),
      });
    }

    res.json({ data });
  } catch (err) {
    console.error("Gemini API error:", err);
    const message = err.message || "Unknown error";

    if (message.includes("quota") || message.includes("429")) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
    }

    res.status(500).json({ error: `Generation failed: ${message}` });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: "gemini-2.5-flash" });
});

app.listen(PORT, () => {
  console.log(`The Node API running on port ${PORT}`);
});
