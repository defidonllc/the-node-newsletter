import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#0A0A1A", bgCard: "#0F0F2A", bgAlt: "#13132E", bgDeep: "#060618",
  cyan: "#00E5FF", magenta: "#CC00FF", yellow: "#FFE566",
  green: "#00FF99", red: "#FF4466", offWhite: "#E0E0FF",
  dim: "#8888BB", border: "#1E1E44", support: "#0A1F18", resist: "#1A0A2E",
};

const DEFAULT_TICKERS = ["BTC", "ETH", "SOL", "AERO", "CC", "COIN", "Gold", "Silver"];
const MACRO_TICKERS   = ["S&P 500", "Nasdaq", "DXY"];

const TICKER_HINTS = {
  BTC:"Bitcoin", ETH:"Ethereum", SOL:"Solana", BNB:"BNB Chain",
  XRP:"Ripple", ADA:"Cardano", AVAX:"Avalanche", DOT:"Polkadot",
  LINK:"Chainlink", UNI:"Uniswap", AAVE:"Aave", MKR:"Maker",
  MATIC:"Polygon", ARB:"Arbitrum", OP:"Optimism", INJ:"Injective",
  AERO:"Aerodrome Finance", CC:"Canton Network", COIN:"Coinbase",
  MSTR:"MicroStrategy", HOOD:"Robinhood", Gold:"Gold XAU/USD",
  Silver:"Silver XAG/USD", Oil:"Crude Oil WTI", DXY:"US Dollar Index",
};

const buildSystemPrompt = (tickers) => {
  const userTickers = tickers.join(", ");
  return `You are an expert financial analyst and crypto-native journalist writing "The Node" — a daily newsletter. Tone: professional, analytical, highly efficient.

CORE DIRECTIVE — FRESHNESS: Use web search aggressively. ALL prices, data, and news must be from the last 24 hours. Never use training data for market figures.

USER WATCHLIST: The user has selected these specific assets to track: ${userTickers}
Also always include these macro indicators: S&P 500, Nasdaq, DXY.

SEARCH STRATEGY:
1. Search for LIVE prices for every asset in the watchlist: ${userTickers}, plus S&P 500, Nasdaq, DXY
2. For each ticker, look up: current price, 24h % change, key support level, key resistance level
3. Search for crypto/financial news from last 24h that is SPECIFICALLY RELEVANT to the watchlist assets above
4. Search Twitter/X for posts from @WuBlockchain, @tier10k, @charliebilello, @VitalikButerin, @APompliano, @BitcoinMagazine, @CoinDesk, @theblockres — find posts relevant to the watchlist assets
5. Verify every news story with 2+ sources
6. The Big Story deep dive must be about something directly affecting one or more of the watchlist assets
7. Quick Hits must be about watchlist assets or macro events directly affecting them

STALE DATA CHECK: If data looks older than 24 hours, search again with today's date appended.

Return ONLY a valid JSON object (no markdown, no preamble):

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
- topGainer must be from the watchlist`;
};

const STEPS = [
  "🔍 Fetching watchlist prices...",
  "📊 Pulling S&P 500, Nasdaq, DXY data...",
  "📰 Scanning news for your assets...",
  "🐦 Searching Twitter/X for watchlist signals...",
  "✅ Cross-verifying stories 2+ sources...",
  "📊 Calculating support & resistance...",
  "🔗 Validating all hyperlinks...",
  "🧠 Writing The Node Take...",
  "✨ Finalising your personalised newsletter...",
];

export default function TheNode() {
  const [tickers, setTickers]     = useState([...DEFAULT_TICKERS]);
  const [inputVal, setInputVal]   = useState("");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [step, setStep]           = useState("");
  const [activeTab, setActiveTab] = useState("snapshot");
  const inputRef                  = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#0A0A1A}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{box-shadow:0 0 16px #00E5FF33}50%{box-shadow:0 0 36px #00E5FF77}}
      @keyframes bar{0%{left:-40%}100%{left:110%}}
      @keyframes glow{0%,100%{text-shadow:0 0 20px #00E5FF44}50%{text-shadow:0 0 50px #00E5FFaa,0 0 80px #CC00FF44}}
      @keyframes chipPop{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
      .cursor::after{content:'█';animation:blink 1s infinite;color:#00E5FF;font-size:0.8em}
      .fade-up{animation:fadeUp 0.4s ease forwards}
      .gen-btn:hover{background:#00E5FF18!important;transform:translateY(-1px)}
      .tab-btn:hover{color:#00E5FF!important;border-color:#00E5FF88!important}
      .src-link{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border:1px solid #1E1E44;color:#8888BB;font-size:10px;text-decoration:none;letter-spacing:.05em;transition:all .15s;margin:3px 4px 3px 0;font-family:'Share Tech Mono',monospace}
      .src-link:hover{background:#00E5FF11;color:#00E5FF;border-color:#00E5FF88}
      .ticker-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 12px;border:1px solid #00E5FF44;background:#00E5FF0A;color:#00E5FF;font-size:11px;border-radius:2px;font-family:'Share Tech Mono',monospace;animation:chipPop .2s ease;cursor:default;margin:3px}
      .ticker-chip .rm{cursor:pointer;color:#8888BB;font-size:13px;line-height:1;padding:0 2px;transition:color .15s}
      .ticker-chip .rm:hover{color:#FF4466}
      .suggestion-chip{display:inline-flex;align-items:center;padding:3px 10px;border:1px solid #1E1E44;background:transparent;color:#8888BB;font-size:10px;border-radius:2px;font-family:'Share Tech Mono',monospace;cursor:pointer;margin:3px;transition:all .15s;letter-spacing:0.05em}
      .suggestion-chip:hover{border-color:#00E5FF88;color:#00E5FF;background:#00E5FF0A}
      .ticker-input{background:transparent;border:none;outline:none;color:#E0E0FF;font-family:'Share Tech Mono',monospace;font-size:12px;min-width:80px;flex:1}
      .ticker-input::placeholder{color:#1E1E44}
      .x-card{background:#0F0F2A;border:1px solid #1E1E44;border-left:3px solid #1DA1F2;padding:16px 20px;margin-bottom:12px;transition:border-color .2s}
      .x-card:hover{border-left-color:#00E5FF}
      .hit-row{padding:16px 0;border-bottom:1px solid #1E1E4433}
      strong{color:#FFE566;font-weight:700}
      a{color:#00E5FF;text-decoration:none}
      a:hover{text-decoration:underline}
      .node-content a{color:#00E5FF}
      .watchlist-box{background:#0F0F2A;border:1px solid #1E1E44;border-top:2px solid #00E5FF;padding:20px 24px;margin-top:28px}
      .watchlist-input-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:8px 12px;border:1px solid #1E1E44;background:#060618;min-height:44px;cursor:text;margin-top:12px}
      .watchlist-input-row:focus-within{border-color:#00E5FF66}
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  // ── TICKER MANAGEMENT ──────────────────────────────────────────────────────
  function addTicker(raw) {
    const val = raw.trim().toUpperCase().replace(/[^A-Z0-9&.]/g, "");
    if (!val || tickers.includes(val)) return;
    setTickers(prev => [...prev, val]);
  }

  function removeTicker(t) {
    setTickers(prev => prev.filter(x => x !== t));
  }

  function handleInputKey(e) {
    if (["Enter", ",", " ", "Tab"].includes(e.key)) {
      e.preventDefault();
      if (inputVal.trim()) { addTicker(inputVal); setInputVal(""); }
    } else if (e.key === "Backspace" && !inputVal && tickers.length > 0) {
      setTickers(prev => prev.slice(0, -1));
    }
  }

  function resetToDefaults() {
    setTickers([...DEFAULT_TICKERS]);
    setInputVal("");
  }

  // ── GENERATE ───────────────────────────────────────────────────────────────
  async function generate() {
    if (tickers.length === 0) return;
    setLoading(true); setError(null); setData(null);
    let i = 0; setStep(STEPS[0]);
    const iv = setInterval(() => { i = Math.min(i + 1, STEPS.length - 1); setStep(STEPS[i]); }, 3000);
    try {
      const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 5000,
          system: buildSystemPrompt(tickers),
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: `Today is ${today}. The user's watchlist is: ${tickers.join(", ")}. Generate The Node newsletter. Search live data for every watchlist asset. Find real X/Twitter posts relevant to these assets. Verify all news with 2+ sources. Return only the JSON object.` }]
        })
      });
      const json = await res.json();
      clearInterval(iv);
      if (json.error) throw new Error(json.error.message);
      const text = json.content.filter(b => b.type === "text").map(b => b.text).join("");
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse newsletter data");
      setData(JSON.parse(match[0]));
      setActiveTab("snapshot");
    } catch (e) {
      clearInterval(iv);
      setError(e.message);
    } finally {
      setLoading(false); setStep("");
    }
  }

  // ── STYLE HELPERS ──────────────────────────────────────────────────────────
  const chgColor  = p => p === true ? C.green : p === false ? C.red : C.dim;
  const biasColor = b => (b||"").includes("🟢") ? C.green : (b||"").includes("🔴") ? C.red : (b||"").includes("🟠") ? "#FF9944" : C.dim;
  const tkColor   = t => {
    const macro = ["S&P 500","Nasdaq","DXY","SPX","NDX"].includes(t);
    if (macro) return C.yellow;
    const gold  = ["Gold","Silver","XAU/USD","XAG/USD","Oil"].includes(t);
    if (gold) return C.yellow;
    if (t === "COIN" || t === "MSTR" || t === "HOOD") return C.magenta;
    return C.cyan;
  };

  const th = (label, align = "center") => (
    <th style={{ background: C.bgDeep, color: C.cyan, padding: "9px 12px", textAlign: align, letterSpacing: "0.08em", fontWeight: 700, border: `1px solid ${C.border}`, fontSize: 10 }}>{label}</th>
  );
  const td = (content, style = {}) => (
    <td style={{ padding: "8px 12px", border: `1px solid ${C.border}`, ...style }}>{content}</td>
  );

  const tabs = [
    { id: "snapshot", label: "📈 Snapshot" },
    { id: "ranges",   label: "🎯 Ranges"   },
    { id: "story",    label: "🔗 Big Story" },
    { id: "xfeed",    label: "🐦 X Feed"   },
    { id: "hits",     label: "⚡ Quick Hits"},
    { id: "take",     label: "🧠 Node Take" },
  ];

  const SUGGESTIONS = ["AAPL","MSTR","ARB","OP","INJ","LINK","AVAX","XRP","BNB","UNI","AAVE","WIF","PEPE","Oil","DXY"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Share Tech Mono',monospace", color: C.offWhite, overflowX: "hidden" }}>

      {/* scanline */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,229,255,0.012) 3px,rgba(0,229,255,0.012) 4px)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: C.bgDeep, borderBottom: `2px solid ${C.cyan}`, padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, border: `2px solid ${C.cyan}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 0 14px ${C.cyan}55` }}>⬡</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.cyan, letterSpacing: "0.18em", fontFamily: "'Rajdhani',sans-serif", lineHeight: 1 }}>THE NODE</div>
            <div style={{ fontSize: 9, color: C.magenta, letterSpacing: "0.14em" }}>DAILY CRYPTO & MARKETS BRIEF</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.08em" }}>{data?.date || new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          {data?.dataFreshness && <div style={{ fontSize: 9, color: C.green, marginTop: 2, letterSpacing: "0.06em" }}>✓ {data.dataFreshness}</div>}
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 80px", position: "relative", zIndex: 1 }}>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "48px 0 28px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 68, fontWeight: 900, color: C.cyan, letterSpacing: "0.22em", lineHeight: 1, fontFamily: "'Rajdhani',sans-serif", animation: "glow 3s ease-in-out infinite" }} className="cursor">THE NODE</div>
          <div style={{ fontSize: 13, color: C.magenta, letterSpacing: "0.16em", fontStyle: "italic", marginTop: 10, fontFamily: "'Rajdhani',sans-serif" }}>Your Daily Brief on Crypto & Global Markets</div>
          {data?.generatedAt && (
            <div style={{ fontSize: 10, color: C.dim, marginTop: 6, letterSpacing: "0.08em" }}>
              Generated {new Date(data.generatedAt).toLocaleTimeString()} · Live web + Twitter/X · Multi-source verified
            </div>
          )}
        </div>

        {/* ── WATCHLIST BUILDER ──────────────────────────────────────────── */}
        <div className="watchlist-box">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", fontFamily: "'Rajdhani',sans-serif" }}>
              ⬡ MY WATCHLIST
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.dim }}>{tickers.length} asset{tickers.length !== 1 ? "s" : ""} tracked</span>
              <button onClick={resetToDefaults} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, padding: "3px 10px", cursor: "pointer", fontFamily: "'Share Tech Mono',monospace", letterSpacing: "0.08em", transition: "all .15s" }}
                onMouseOver={e => { e.target.style.borderColor = C.cyan; e.target.style.color = C.cyan; }}
                onMouseOut={e => { e.target.style.borderColor = C.border; e.target.style.color = C.dim; }}>
                RESET
              </button>
            </div>
          </div>

          <div style={{ fontSize: 10, color: C.dim, marginBottom: 10, letterSpacing: "0.05em", lineHeight: 1.7 }}>
            Add any ticker: crypto (BTC, ETH, SOL…), stocks (COIN, MSTR, AAPL…), or commodities (Gold, Oil…).<br/>
            Press <span style={{ color: C.cyan }}>Enter</span> or <span style={{ color: C.cyan }}>,</span> to add · Click <span style={{ color: C.red }}>✕</span> to remove · Newsletter will focus on your assets.
          </div>

          {/* chip input */}
          <div className="watchlist-input-row" onClick={() => inputRef.current?.focus()}>
            {tickers.map(t => (
              <span key={t} className="ticker-chip">
                {t}
                {TICKER_HINTS[t] && <span style={{ color: C.dim, fontSize: 9 }}>{TICKER_HINTS[t]}</span>}
                <span className="rm" onClick={e => { e.stopPropagation(); removeTicker(t); }}>✕</span>
              </span>
            ))}
            <input
              ref={inputRef}
              className="ticker-input"
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={handleInputKey}
              onBlur={() => { if (inputVal.trim()) { addTicker(inputVal); setInputVal(""); } }}
              placeholder={tickers.length === 0 ? "Type a ticker and press Enter..." : "+ Add ticker"}
            />
          </div>

          {/* suggestions */}
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 9, color: C.dim, letterSpacing: "0.08em", marginRight: 6 }}>QUICK ADD:</span>
            {SUGGESTIONS.filter(s => !tickers.includes(s)).slice(0, 10).map(s => (
              <button key={s} className="suggestion-chip" onClick={() => addTicker(s)}>+ {s}</button>
            ))}
          </div>

          {/* macro always-included notice */}
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.bgDeep, border: `1px solid ${C.border}`, fontSize: 10, color: C.dim, letterSpacing: "0.05em" }}>
            <span style={{ color: C.yellow }}>Always included:</span> {MACRO_TICKERS.join(" · ")} · News & X posts will focus on your watchlist assets
          </div>
        </div>

        {/* ── GENERATE BUTTON ─────────────────────────────────────────────── */}
        <button
          className="gen-btn"
          onClick={generate}
          disabled={loading || tickers.length === 0}
          style={{
            display: "block", margin: "24px auto 0", padding: "14px 52px",
            background: "transparent", border: `2px solid ${tickers.length === 0 ? C.border : C.cyan}`,
            color: tickers.length === 0 ? C.dim : C.cyan,
            fontSize: 12, fontWeight: 700, letterSpacing: "0.18em",
            cursor: loading || tickers.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "'Share Tech Mono',monospace", transition: "all .2s",
            opacity: loading ? .6 : 1, animation: loading || tickers.length === 0 ? "none" : "pulse 2.5s infinite"
          }}>
          {loading ? "⟳ SCANNING INTERNET..." : data ? `⟳ REGENERATE — ${tickers.length} ASSETS` : `⚡ GENERATE FOR ${tickers.length} ASSETS`}
        </button>

        {tickers.length === 0 && (
          <div style={{ textAlign: "center", fontSize: 10, color: C.red, marginTop: 8, letterSpacing: "0.08em" }}>Add at least one ticker to generate</div>
        )}

        {/* progress */}
        {loading && (
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>
              Fetching data for: <span style={{ color: C.cyan }}>{tickers.join(" · ")}</span>
            </div>
            <div style={{ width: 280, height: 2, background: C.border, margin: "0 auto 16px", borderRadius: 2, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, height: "100%", width: "40%", background: `linear-gradient(90deg,${C.cyan},${C.magenta})`, animation: "bar 1.8s linear infinite" }} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", minHeight: 20 }}>{step}</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#1A0010", border: `1px solid ${C.red}`, padding: 20, marginTop: 24, color: C.red, fontSize: 12 }}>⚠ {error}</div>
        )}

        {!data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "40px 0 20px", color: C.dim, fontSize: 11, letterSpacing: "0.08em", lineHeight: 2.4 }}>
            <div>PERSONALISED PRICES · WATCHLIST NEWS · TWITTER/X SIGNALS · HYPERLINKED SOURCES</div>
            <div style={{ color: C.border, margin: "8px 0" }}>{'─'.repeat(52)}</div>
            <div style={{ fontSize: 10, lineHeight: 1.9 }}>
              Add your assets above · Every story will be relevant to your watchlist<br />
              2+ source verification · X/Twitter posts filtered to your assets · No stale data
            </div>
          </div>
        )}

        {/* ── NEWSLETTER ──────────────────────────────────────────────────── */}
        {data && !loading && (
          <div className="fade-up node-content">

            {/* hook */}
            <div style={{ marginTop: 32, background: C.bgCard, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.cyan}`, padding: "20px 24px", lineHeight: 1.85, fontSize: 13 }}>
              <span dangerouslySetInnerHTML={{ __html: data.hook }} />
            </div>

            {/* watchlist + top gainer row */}
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 12px", background: C.bgDeep, border: `1px solid ${C.border}`, fontSize: 10, color: C.dim }}>
                <span style={{ color: C.cyan, marginRight: 4 }}>TRACKING:</span>
                {tickers.map(t => <span key={t} style={{ color: C.cyan }}>{t}</span>).reduce((a, b) => [a, <span key={`sep-${b.key}`} style={{ color: C.border }}> · </span>, b])}
              </div>
              {data.topGainer && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#001A0F", border: `1px solid ${C.green}44`, padding: "6px 14px", fontSize: 11 }}>
                  <span style={{ color: C.green }}>🏆</span>
                  <span style={{ color: C.yellow, fontWeight: 700 }}>{data.topGainer.ticker}</span>
                  <span style={{ color: C.dim }}>{data.topGainer.name}</span>
                  <span style={{ color: C.green, fontWeight: 700 }}>{data.topGainer.change}</span>
                </div>
              )}
            </div>

            {/* ── TABS ─────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 4, marginTop: 28, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{
                  background: activeTab === t.id ? C.bgCard : "transparent",
                  border: `1px solid ${activeTab === t.id ? C.cyan : C.border}`,
                  borderBottom: "none", color: activeTab === t.id ? C.cyan : C.dim,
                  padding: "8px 14px", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer",
                  fontFamily: "'Share Tech Mono',monospace", marginBottom: -1, transition: "all .15s"
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: "none", padding: "24px 20px", minHeight: 300 }}>

              {/* MARKET SNAPSHOT */}
              {activeTab === "snapshot" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 6, fontFamily: "'Rajdhani',sans-serif" }}>📈 MARKET SNAPSHOT</div>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 16, letterSpacing: "0.06em" }}>Your watchlist · Live sourced prices · Click ↗ to verify</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 480 }}>
                      <thead><tr>{th("Ticker")}{th("Asset", "left")}{th("Price")}{th("24h Chg")}{th("Source")}</tr></thead>
                      <tbody>
                        {(data.marketSnapshot || []).map((r, i) => (
                          <tr key={r.ticker + i} style={{ background: i % 2 === 0 ? C.bgCard : C.bgAlt }}>
                            {td(r.ticker, { color: tkColor(r.ticker), fontWeight: 700, textAlign: "center" })}
                            {td(r.asset, { color: C.offWhite, textAlign: "left" })}
                            {td(r.price, { color: C.yellow, fontWeight: 700, textAlign: "center" })}
                            {td(r.change24h, { color: chgColor(r.changePositive), fontWeight: 700, textAlign: "center" })}
                            <td style={{ padding: "8px 12px", border: `1px solid ${C.border}`, textAlign: "center" }}>
                              {r.sourceUrl
                                ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="src-link">↗ {r.sourceName || "Source"}</a>
                                : <span style={{ color: C.border, fontSize: 10 }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TRADING RANGES */}
              {activeTab === "ranges" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 16, fontFamily: "'Rajdhani',sans-serif" }}>🎯 TRADING RANGES</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 24, minWidth: 500 }}>
                      <thead><tr>{th("Ticker")}{th("Price")}{th("24h")}{th("Support Zone")}{th("Resistance Zone")}{th("Bias")}</tr></thead>
                      <tbody>
                        {(data.tradingRanges || []).map((r, i) => (
                          <tr key={r.ticker + i} style={{ background: i % 2 === 0 ? C.bgCard : C.bgAlt }}>
                            {td(r.ticker, { color: tkColor(r.ticker), fontWeight: 700, textAlign: "center" })}
                            {td(r.price, { color: C.yellow, fontWeight: 700, textAlign: "center" })}
                            {td(r.change, { color: chgColor(r.changePositive), fontWeight: 700, textAlign: "center" })}
                            {td(r.support, { color: C.green, background: C.support + "55", textAlign: "center" })}
                            {td(r.resistance, { color: "#DD88FF", background: C.resist + "55", textAlign: "center" })}
                            {td(r.bias, { color: biasColor(r.bias), textAlign: "center", fontSize: 10 })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>📌 RANGE NOTES</div>
                  {(data.tradingRanges || []).filter(r => r.note).map((r, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 11, lineHeight: 1.7, color: C.offWhite }}>
                      <span style={{ color: tkColor(r.ticker), fontWeight: 700 }}>{r.ticker} — </span>{r.note}
                    </div>
                  ))}
                </div>
              )}

              {/* BIG STORY */}
              {activeTab === "story" && data.bigStory && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 6, fontFamily: "'Rajdhani',sans-serif" }}>🔗 THE BIG STORY</div>
                  <div style={{ color: C.magenta, fontWeight: 700, fontSize: 16, marginBottom: 4, fontFamily: "'Rajdhani',sans-serif", lineHeight: 1.3 }}>{data.bigStory.headline}</div>
                  <div style={{ color: C.dim, fontStyle: "italic", fontSize: 11, marginBottom: 20 }}>{data.bigStory.subheadline}</div>
                  {[["what", "What happened?"], ["why", "Why it matters:"], ["soWhat", "The 'So What?'"]].map(([key, label]) =>
                    data.bigStory[key] && (
                      <div key={key} style={{ marginBottom: 18 }}>
                        <div style={{ color: C.cyan, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", marginBottom: 5 }}>{label}</div>
                        <div style={{ color: C.offWhite, fontSize: 12, lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: data.bigStory[key] }} />
                      </div>
                    )
                  )}
                  {(data.bigStory.sources || []).length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ color: C.dim, fontSize: 10, letterSpacing: "0.08em" }}>VERIFIED SOURCES: </span>
                      {data.bigStory.sources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="src-link">↗ {s.name}</a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* X FEED */}
              {activeTab === "xfeed" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 4, fontFamily: "'Rajdhani',sans-serif" }}>🐦 X / TWITTER FEED</div>
                  <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.06em", marginBottom: 6 }}>Posts relevant to your watchlist · Last 24h · Click to view on X</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                    {tickers.slice(0, 8).map(t => <span key={t} style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.cyan, fontSize: 9, padding: "2px 8px" }}>{t}</span>)}
                    {tickers.length > 8 && <span style={{ color: C.dim, fontSize: 9, padding: "2px 4px" }}>+{tickers.length - 8} more</span>}
                  </div>
                  {(!data.xPosts || data.xPosts.length === 0) && (
                    <div style={{ color: C.dim, fontSize: 12, padding: "20px 0" }}>No X posts found. Try regenerating.</div>
                  )}
                  {(data.xPosts || []).map((post, i) => (
                    <div key={i} className="x-card">
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1DA1F222", border: "1px solid #1DA1F244", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>𝕏</div>
                          <div>
                            <div style={{ color: C.offWhite, fontWeight: 700, fontSize: 13, fontFamily: "'Rajdhani',sans-serif" }}>{post.name}</div>
                            <div style={{ color: "#1DA1F2", fontSize: 10 }}>{post.handle} · {post.postDate}</div>
                          </div>
                        </div>
                        {post.postUrl && (
                          <a href={post.postUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#1DA1F211", border: "1px solid #1DA1F244", color: "#1DA1F2", padding: "4px 12px", fontSize: 10, fontFamily: "'Share Tech Mono',monospace", letterSpacing: "0.06em", textDecoration: "none", flexShrink: 0 }}>↗ VIEW POST</a>
                        )}
                      </div>
                      <div style={{ color: C.offWhite, fontSize: 12, lineHeight: 1.8, marginBottom: 10 }}>{post.summary}</div>
                      {post.visualDescription && post.visualDescription !== "Text only post" && (
                        <div style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.yellow}`, padding: "8px 12px", marginBottom: 10 }}>
                          <div style={{ color: C.yellow, fontSize: 9, letterSpacing: "0.1em", marginBottom: 3 }}>📊 VISUAL / CHART CONTENT</div>
                          <div style={{ color: C.dim, fontSize: 11, lineHeight: 1.6 }}>{post.visualDescription}</div>
                        </div>
                      )}
                      <div style={{ color: C.dim, fontSize: 10, borderTop: `1px solid ${C.border}22`, paddingTop: 8, marginTop: 4 }}>
                        <span style={{ color: C.cyan, fontWeight: 700 }}>Why it matters: </span>{post.relevance}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* QUICK HITS */}
              {activeTab === "hits" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 16, fontFamily: "'Rajdhani',sans-serif" }}>⚡ QUICK HITS</div>
                  {(data.quickHits || []).map((hit, i) => (
                    <div key={i} className="hit-row">
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{hit.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                            <span style={{ color: C.yellow, fontWeight: 700, fontSize: 13, fontFamily: "'Rajdhani',sans-serif" }}>{hit.headline}</span>
                            {hit.category && <span style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, padding: "2px 8px", letterSpacing: "0.08em" }}>{hit.category}</span>}
                          </div>
                          <div style={{ color: C.offWhite, fontSize: 11, lineHeight: 1.8, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: hit.body }} />
                          {(hit.sources || []).length > 0 && (
                            <div>{hit.sources.map((s, j) => <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="src-link">↗ {s.name}</a>)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NODE TAKE */}
              {activeTab === "take" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em", marginBottom: 16, fontFamily: "'Rajdhani',sans-serif" }}>🧠 THE NODE TAKE</div>
                  <div style={{ background: C.bgDeep, borderTop: `3px solid ${C.cyan}`, borderBottom: `3px solid ${C.magenta}`, padding: "24px 28px", fontSize: 13, lineHeight: 1.9, color: C.offWhite, marginBottom: 20 }}>
                    <span style={{ color: C.cyan, fontWeight: 700 }}>Watch List — Next 12 Hours: </span>
                    <span dangerouslySetInnerHTML={{ __html: data.nodeTake }} />
                  </div>
                  {data.dataFreshness && (
                    <div style={{ background: "#001A0F", border: `1px solid ${C.green}33`, padding: "10px 16px", fontSize: 10, color: C.green, letterSpacing: "0.06em", lineHeight: 1.8 }}>
                      ✓ DATA FRESHNESS<br /><span style={{ color: C.dim }}>{data.dataFreshness}</span>
                    </div>
                  )}
                </div>
              )}

            </div>{/* end tab panel */}

            <div style={{ textAlign: "center", fontSize: 9, color: C.dim, padding: "24px 0", borderTop: `1px solid ${C.border}`, letterSpacing: "0.06em", marginTop: 32, lineHeight: 1.9 }}>
              THE NODE · {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ""} · Tracking: {tickers.join(", ")}<br />
              Sources hyperlinked · 2+ outlet verification · X/Twitter linked · Not financial advice · Always DYOR
            </div>
          </div>
        )}
      </div>

      <div style={{ background: C.bgDeep, borderTop: `1px solid ${C.magenta}33`, textAlign: "center", padding: "12px 24px", fontSize: 9, color: C.dim, letterSpacing: "0.1em" }}>
        ⬡ THE NODE · DAILY CRYPTO & MARKETS BRIEF · NOT FINANCIAL ADVICE · ALWAYS DYOR
      </div>
    </div>
  );
}
