const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("node:path");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan("dev"));

function normalizeSymbol(symbol, market = "NSE") {
  const clean = String(symbol || "").trim().toUpperCase();
  if (!clean) return "";
  if (clean.endsWith(".NS") || clean.endsWith(".BO")) return clean;
  return market.toUpperCase() === "BSE" ? `${clean}.BO` : `${clean}.NS`;
}
function stripExchangeSuffix(symbol) {
  return String(symbol || "").replace(/\.(NS|BO)$/i, "");
}
function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
function compressHistory(result = {}) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    close: safeNumber(quote.close?.[i]),
    open: safeNumber(quote.open?.[i]),
    high: safeNumber(quote.high?.[i]),
    low: safeNumber(quote.low?.[i]),
    volume: safeNumber(quote.volume?.[i])
  })).filter(x => Number.isFinite(x.close));
}
function computeReturn(history = [], days = 30) {
  const series = history.slice(-days);
  if (series.length < 2) return null;
  const first = series[0]?.close;
  const last = series[series.length - 1]?.close;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return Number((((last - first) / first) * 100).toFixed(2));
}
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 PulseLedger/1.0",
      "Accept": "application/json,text/plain,*/*"
    }
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return await res.json();
}
async function fetchQuoteCore(symbol, market) {
  const yfSymbol = normalizeSymbol(symbol, market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1y&includePrePost=false`;
  const json = await fetchJson(url);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No market data returned");
  const meta = result.meta || {};
  const history = compressHistory(result);
  const closes = history.map(p => p.close).filter(Number.isFinite);
  return {
    ok: true,
    symbol: stripExchangeSuffix(yfSymbol),
    market: market.toUpperCase(),
    companyName: meta.longName || meta.shortName || stripExchangeSuffix(yfSymbol),
    currentPrice: safeNumber(meta.regularMarketPrice),
    previousClose: safeNumber(meta.previousClose),
    dayLow: safeNumber(meta.regularMarketDayLow),
    dayHigh: safeNumber(meta.regularMarketDayHigh),
    yearLow: closes.length ? Math.min(...closes) : safeNumber(meta.fiftyTwoWeekLow),
    yearHigh: closes.length ? Math.max(...closes) : safeNumber(meta.fiftyTwoWeekHigh),
    volume: safeNumber(meta.regularMarketVolume),
    avgVolume: safeNumber(meta.averageDailyVolume3Month),
    pe: null,
    beta: null,
    thirtyDayReturn: computeReturn(history, 30),
    updatedAt: new Date().toISOString()
  };
}
async function fetchHistoryCore(symbol, market, interval = "1d") {
  const yfSymbol = normalizeSymbol(symbol, market);
  const range = interval === "1d" ? "6mo" : "1y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false`;
  const json = await fetchJson(url);
  const result = json?.chart?.result?.[0];
  return { ok: true, history: result ? compressHistory(result) : [] };
}
async function fetchNewsCore(symbol, market) {
  const quote = await fetchQuoteCore(symbol, market);
  const query = encodeURIComponent(`${quote.companyName || symbol} ${symbol} stock India`);
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(feedUrl, { headers: { "User-Agent": "Mozilla/5.0 PulseLedger/1.0" } });
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6).map((m) => {
    const block = m[1];
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? mm[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() : "";
    };
    return {
      title: get("title") || "Untitled",
      link: get("link") || "#",
      source: "News",
      pubDate: get("pubDate") ? new Date(get("pubDate")).toISOString() : null
    };
  });
  return { ok: true, items };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "PulseLedger API" });
});
app.get("/api/quote", async (req, res) => {
  try {
    const { symbol, market = "NSE" } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });
    res.json(await fetchQuoteCore(symbol, market));
  } catch (error) {
    console.error("QUOTE ERROR:", error);
    res.status(500).json({ message: "Quote fetch failed", error: error.message });
  }
});
app.get("/api/history", async (req, res) => {
  try {
    const { symbol, market = "NSE", interval = "1d" } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });
    res.json(await fetchHistoryCore(symbol, market, interval));
  } catch (error) {
    console.error("HISTORY ERROR:", error);
    res.status(500).json({ message: "History fetch failed", error: error.message });
  }
});
app.get("/api/news", async (req, res) => {
  try {
    const { symbol, market = "NSE" } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });
    res.json(await fetchNewsCore(symbol, market));
  } catch (error) {
    console.error("NEWS ERROR:", error);
    res.status(500).json({ message: "News fetch failed", error: error.message });
  }
});
app.get("/api/ownership", async (req, res) => {
  res.json({
    ok: true,
    currentQuarter: "Dec 2025",
    previousQuarter: "Sep 2025",
    promoterHoldingPct: 49.8,
    fiiHoldingPct: 19.4,
    diiHoldingPct: 14.2,
    publicHoldingPct: 16.6,
    promoterChangePct: 0.0,
    fiiChangePct: 0.4,
    diiChangePct: -0.2,
    publicChangePct: -0.2,
    note: "Best-effort placeholder ownership data."
  });
});

// serve built frontend from same server for packaged desktop app
app.use(express.static(path.join(__dirname, "..", "dist")));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

function startServer(port = 4000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", () => {
      console.log(`PulseLedger API/UI running on http://127.0.0.1:${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
}
module.exports = { app, startServer };