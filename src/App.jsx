import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const STORAGE_KEY = "pulseledger-v3";
const THEME_KEY = "pulseledger-theme";
const REFRESH_MS = 60000;

const initialRows = [
  { id: crypto.randomUUID(), symbol: "RELIANCE", market: "NSE", qty: 10, avgBuy: 2500 },
  { id: crypto.randomUUID(), symbol: "TCS", market: "NSE", qty: 4, avgBuy: 3900 },
];

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
function formatPct(value) {
  const num = Number.isFinite(value) ? value : 0;
  return `${num.toFixed(2)}%`;
}
function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}
function loadRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialRows;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : initialRows;
  } catch {
    return initialRows;
  }
}
function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}
async function api(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return response.json();
}
function StatCard({ title, value, hint, tone = "neutral" }) {
  return (
    <div className="stat-card brutal-card">
      <div className="stat-title">{title}</div>
      <div className={`stat-value ${tone}`}>{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}
function NewsCard({ item }) {
  return (
    <a className="news-card brutal-card" href={item.link} target="_blank" rel="noreferrer">
      <div className="news-title">{item.title}</div>
      <div className="news-meta">
        <span>{item.source || "News"}</span>
        <span>{item.pubDate ? new Date(item.pubDate).toLocaleString("en-IN") : ""}</span>
      </div>
    </a>
  );
}
function getToneClass(value) {
  if (!Number.isFinite(value)) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}
function getRowClass(quote, row) {
  if (!quote) return "";
  const current = quote.currentPrice || 0;
  const avgBuy = Number(row.avgBuy || 0);
  const thirty = quote.thirtyDayReturn || 0;
  const yearHigh = quote.yearHigh || 0;
  const volume = quote.volume || 0;
  const avgVolume = quote.avgVolume || 0;
  const classes = [];
  if (avgBuy > 0 && current > avgBuy) classes.push("row-profit");
  if (avgBuy > 0 && current < avgBuy) classes.push("row-loss");
  if (thirty >= 5) classes.push("row-strong");
  if (thirty <= -5) classes.push("row-weak");
  if (yearHigh > 0 && current >= yearHigh * 0.97) classes.push("row-watch");
  if (avgVolume > 0 && volume >= avgVolume * 1.5) classes.push("row-volume-spike");
  return classes.join(" ");
}

export default function App() {
  const [rows, setRows] = useState(loadRows);
  const [quoteMap, setQuoteMap] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [ownershipMap, setOwnershipMap] = useState({});
  const [newsMap, setNewsMap] = useState({});
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? null);
  const [newSymbol, setNewSymbol] = useState("");
  const [newMarket, setNewMarket] = useState("NSE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(loadTheme);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => { if (!selectedId && rows.length) setSelectedId(rows[0].id); }, [rows, selectedId]);

  async function refreshAll() {
    if (!rows.length) return;
    setLoading(true);
    setError("");
    const nextQuotes = {}, nextHistory = {}, nextOwnership = {}, nextNews = {};
    await Promise.all(rows.map(async (row) => {
      try { nextQuotes[row.id] = await api(`/api/quote?symbol=${encodeURIComponent(row.symbol)}&market=${encodeURIComponent(row.market)}`); } catch (err) { console.error(err); }
      try { const history = await api(`/api/history?symbol=${encodeURIComponent(row.symbol)}&market=${encodeURIComponent(row.market)}&interval=1d`); nextHistory[row.id] = history.history || []; } catch (err) { nextHistory[row.id] = []; }
      try { nextOwnership[row.id] = await api(`/api/ownership?symbol=${encodeURIComponent(row.symbol)}`); } catch (err) { console.error(err); }
      try { const news = await api(`/api/news?symbol=${encodeURIComponent(row.symbol)}&market=${encodeURIComponent(row.market)}`); nextNews[row.id] = news.items || []; } catch (err) { nextNews[row.id] = []; }
    }));
    setQuoteMap(nextQuotes); setHistoryMap(nextHistory); setOwnershipMap(nextOwnership); setNewsMap(nextNews);
    if (!Object.keys(nextQuotes).length) setError("Could not load live stock prices.");
    setLoading(false);
  }
  useEffect(() => { refreshAll(); const timer = setInterval(refreshAll, REFRESH_MS); return () => clearInterval(timer); }, [rows.length]);

  function addRow() {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    const row = { id: crypto.randomUUID(), symbol, market: newMarket, qty: 0, avgBuy: 0 };
    setRows((prev) => [row, ...prev]);
    setSelectedId(row.id);
    setNewSymbol("");
    setSearch("");
  }
  function updateRow(id, patch) { setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row)); }
  function removeRow(id) {
    const next = rows.filter((row) => row.id !== id);
    setRows(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.symbol} ${row.market}`.toLowerCase().includes(q));
  }, [rows, search]);

  const selectedRow = rows.find((row) => row.id === selectedId) || null;
  const selectedQuote = selectedRow ? quoteMap[selectedRow.id] : null;
  const selectedHistory = selectedRow ? historyMap[selectedRow.id] || [] : [];
  const selectedOwnership = selectedRow ? ownershipMap[selectedRow.id] : null;
  const selectedNews = selectedRow ? newsMap[selectedRow.id] || [] : [];

  const portfolio = useMemo(() => rows.reduce((acc, row) => {
    const currentPrice = quoteMap[row.id]?.currentPrice || 0;
    const value = currentPrice * Number(row.qty || 0);
    const cost = Number(row.avgBuy || 0) * Number(row.qty || 0);
    acc.value += value; acc.cost += cost; acc.pnl += value - cost; return acc;
  }, { value: 0, cost: 0, pnl: 0 }), [rows, quoteMap]);
  const pnlPct = portfolio.cost ? (portfolio.pnl / portfolio.cost) * 100 : 0;

  return (
    <div className="app-shell">
      <header className="hero brutal-card">
        <div>
          <div className="eyebrow">Indian equity terminal</div>
          <h1>PulseLedger</h1>
          <p>Modern watchlists, live pricing, news, and ownership signals for Indian equities.</p>
        </div>
        <div className="hero-actions">
          <button className="theme-toggle brutal-button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
          <button className="primary-btn brutal-button" onClick={refreshAll} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard title="Portfolio value" value={formatINR(portfolio.value)} hint="Based on live tracked rows" />
        <StatCard title="Net P&L" value={formatINR(portfolio.pnl)} hint={formatPct(pnlPct)} tone={portfolio.pnl >= 0 ? "positive" : "negative"} />
        <StatCard title="Tracked stocks" value={String(rows.length)} hint="Rows in your watchlist" />
        <StatCard title="Refresh cycle" value="60s" hint="Auto-updates enabled" />
      </section>

      {error ? <div className="error-banner brutal-card">{error}</div> : null}

      <section className="watchlist-section">
        <div className="watchlist-panel brutal-card">
          <div className="panel-header">
            <div>
              <h2>Watchlist</h2>
              <p>Spreadsheet-style tracking with live pricing and visual signals.</p>
            </div>
            <div className="toolbar">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol" />
              <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
              <select value={newMarket} onChange={(e) => setNewMarket(e.target.value)}>
                <option value="NSE">NSE</option><option value="BSE">BSE</option>
              </select>
              <button className="primary-btn brutal-button" onClick={addRow}>Add</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th><th>Mkt</th><th>Qty</th><th>Avg buy</th><th>Current</th><th>Day low</th><th>Day high</th><th>52W low</th><th>52W high</th><th>30D</th><th>Value</th><th>P&L</th><th>Flags</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const quote = quoteMap[row.id];
                  const value = (quote?.currentPrice || 0) * Number(row.qty || 0);
                  const pnl = value - Number(row.qty || 0) * Number(row.avgBuy || 0);
                  const rowClass = getRowClass(quote, row);
                  const currentPrice = quote?.currentPrice || 0;
                  const ownership = ownershipMap[row.id];
                  const nearHigh = quote?.yearHigh > 0 && currentPrice >= quote.yearHigh * 0.97;
                  const volumeSpike = quote?.avgVolume > 0 && quote?.volume >= quote.avgVolume * 1.5;
                  const fiiAdded = (ownership?.fiiChangePct || 0) > 0;
                  const diiAdded = (ownership?.diiChangePct || 0) > 0;
                  return (
                    <tr key={row.id} className={`${selectedId === row.id ? "active-row" : ""} ${rowClass}`} onClick={() => setSelectedId(row.id)}>
                      <td>{row.symbol}</td>
                      <td>{row.market}</td>
                      <td><input type="number" value={row.qty} onClick={(e) => e.stopPropagation()} onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })} /></td>
                      <td><input type="number" value={row.avgBuy} onClick={(e) => e.stopPropagation()} onChange={(e) => updateRow(row.id, { avgBuy: Number(e.target.value) })} /></td>
                      <td className={getToneClass((quote?.currentPrice || 0) - Number(row.avgBuy || 0))}>{formatINR(quote?.currentPrice || 0)}</td>
                      <td>{formatINR(quote?.dayLow || 0)}</td>
                      <td>{formatINR(quote?.dayHigh || 0)}</td>
                      <td>{formatINR(quote?.yearLow || 0)}</td>
                      <td>{formatINR(quote?.yearHigh || 0)}</td>
                      <td className={getToneClass(quote?.thirtyDayReturn || 0)}>{formatPct(quote?.thirtyDayReturn || 0)}</td>
                      <td>{formatINR(value)}</td>
                      <td className={getToneClass(pnl)}>{formatINR(pnl)}</td>
                      <td><div className="flag-wrap">
                        {nearHigh ? <span className="flag warning">Near 52W High</span> : null}
                        {volumeSpike ? <span className="flag info">Volume Spike</span> : null}
                        {fiiAdded ? <span className="flag success">FII Added</span> : null}
                        {diiAdded ? <span className="flag success">DII Added</span> : null}
                      </div></td>
                      <td><button className="ghost-btn brutal-button small-btn" onClick={(e) => { e.stopPropagation(); removeRow(row.id); }}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="insights-section">
        <div className="bento-grid">
          <div className="bento-card snapshot-card brutal-card">
            <div className="panel-header compact"><div><h2>{selectedRow ? selectedRow.symbol : "Snapshot"}</h2><p>{selectedQuote?.companyName || "Select a stock"}</p></div></div>
            <div className="snapshot-price">{formatINR(selectedQuote?.currentPrice || 0)}</div>
            <div className="metric-grid mini">
              <div className="metric-box brutal-card"><span>Day range</span><strong>{formatINR(selectedQuote?.dayLow || 0)} - {formatINR(selectedQuote?.dayHigh || 0)}</strong></div>
              <div className="metric-box brutal-card"><span>52W range</span><strong>{formatINR(selectedQuote?.yearLow || 0)} - {formatINR(selectedQuote?.yearHigh || 0)}</strong></div>
              <div className="metric-box brutal-card"><span>30D return</span><strong className={getToneClass(selectedQuote?.thirtyDayReturn || 0)}>{formatPct(selectedQuote?.thirtyDayReturn || 0)}</strong></div>
              <div className="metric-box brutal-card"><span>Volume</span><strong>{formatNumber(selectedQuote?.volume)}</strong></div>
              <div className="metric-box brutal-card"><span>P/E</span><strong>{selectedQuote?.pe ?? "—"}</strong></div>
              <div className="metric-box brutal-card"><span>Beta</span><strong>{selectedQuote?.beta ?? "—"}</strong></div>
            </div>
          </div>

          <div className="bento-card chart-card brutal-card">
            <div className="panel-header compact"><div><h2>Price chart</h2><p>6-month view</p></div></div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={["dataMin - 10", "dataMax + 10"]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="close" strokeWidth={2.5} fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bento-card ownership-card brutal-card">
            <div className="panel-header compact"><div><h2>Ownership signals</h2><p>Quarterly shareholding trend</p></div></div>
            <div className="metric-grid">
              <div className="metric-box brutal-card"><span>FII</span><strong>{selectedOwnership?.fiiHoldingPct != null ? formatPct(selectedOwnership.fiiHoldingPct) : "—"}</strong><small className={getToneClass(selectedOwnership?.fiiChangePct || 0)}>Δ {selectedOwnership?.fiiChangePct != null ? formatPct(selectedOwnership.fiiChangePct) : "—"}</small></div>
              <div className="metric-box brutal-card"><span>DII</span><strong>{selectedOwnership?.diiHoldingPct != null ? formatPct(selectedOwnership.diiHoldingPct) : "—"}</strong><small className={getToneClass(selectedOwnership?.diiChangePct || 0)}>Δ {selectedOwnership?.diiChangePct != null ? formatPct(selectedOwnership.diiChangePct) : "—"}</small></div>
              <div className="metric-box brutal-card"><span>Promoter</span><strong>{selectedOwnership?.promoterHoldingPct != null ? formatPct(selectedOwnership.promoterHoldingPct) : "—"}</strong><small className={getToneClass(selectedOwnership?.promoterChangePct || 0)}>Δ {selectedOwnership?.promoterChangePct != null ? formatPct(selectedOwnership.promoterChangePct) : "—"}</small></div>
              <div className="metric-box brutal-card"><span>Public</span><strong>{selectedOwnership?.publicHoldingPct != null ? formatPct(selectedOwnership.publicHoldingPct) : "—"}</strong><small className={getToneClass(selectedOwnership?.publicChangePct || 0)}>Δ {selectedOwnership?.publicChangePct != null ? formatPct(selectedOwnership.publicChangePct) : "—"}</small></div>
            </div>
            <div className="note-box brutal-card">
              <div><strong>Latest quarter:</strong> {selectedOwnership?.currentQuarter || "—"}</div>
              <div><strong>Previous quarter:</strong> {selectedOwnership?.previousQuarter || "—"}</div>
              <div><strong>Status:</strong> {selectedOwnership?.note || "Loaded"}</div>
            </div>
          </div>

          <div className="bento-card news-card-wrap brutal-card">
            <div className="panel-header compact"><div><h2>Latest news</h2><p>Selected stock only</p></div></div>
            <div className="news-list">
              {selectedNews.length ? selectedNews.map((item, index) => (<NewsCard key={`${item.link}-${index}`} item={item} />)) : <p className="muted">No news available right now.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}