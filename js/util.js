/* =========================================================
   Utilities — formatting, fetching, DOM helpers
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(k, d) { try { const v = localStorage.getItem('cb:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('cb:' + k, JSON.stringify(v)); } catch {} }
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- currency ---------- */
const CURRENCIES = {
  eur: { code: 'eur', sym: '€', loc: 'de-DE', suffix: true },
  usd: { code: 'usd', sym: '$', loc: 'en-US', suffix: false }
};
let CUR = CURRENCIES[store.get('cur', 'eur')] || CURRENCIES.eur;

const nf = (v, d) => v.toLocaleString(CUR.loc, { minimumFractionDigits: d, maximumFractionDigits: d });
const withSym = s => (CUR.suffix ? s + ' ' + CUR.sym : CUR.sym + s);

/** Adaptive price formatting: big prices get 2 decimals, tiny ones get significant digits. */
function fmtPrice(v, bare = false) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  let d;
  if (a >= 1000) d = 2;
  else if (a >= 1) d = a >= 100 ? 2 : 3;
  else if (a >= 0.01) d = 4;
  else if (a === 0) d = 2;
  else d = Math.min(10, Math.max(4, -Math.floor(Math.log10(a)) + 3));
  return bare ? nf(v, d) : withSym(nf(v, d));
}

function fmtBig(v, sym = true) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  let s = nf(v, 0);
  for (const [n, u] of units) if (a >= n) { s = nf(v / n, a / n >= 100 ? 1 : 2) + u; break; }
  return sym ? withSym(s) : s;
}

/** Plain number (supply, block height, …) in the active locale. */
const fmtNum = (v, d = 0) => (v == null || isNaN(v) ? '—' : nf(v, d));

function fmtPct(v, digits = 2) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + nf(v, digits) + '%';
}

const cls = v => (v >= 0 ? 'up' : 'down');

function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return Math.floor(s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

async function fetchJSON(url, { timeout = 12000, retries = 1 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(res => setTimeout(res, 1200 * (i + 1)));
    } finally {
      clearTimeout(t);
    }
  }
}

/** Animate a numeric text node from its previous value to a new one. */
function countTo(el, to, fmt, ms = 1200) {
  const from = el._v ?? 0;
  el._v = to;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Briefly flash an element green/red. */
function flash(el, dir) {
  if (!el) return;
  el.classList.remove('flash-up', 'flash-dn');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'flash-up' : 'flash-dn');
  clearTimeout(el._ft);
  el._ft = setTimeout(() => el.classList.remove('flash-up', 'flash-dn'), 450);
}

/* ---------- shared tooltip ---------- */
const tip = {
  el: null,
  show(html, x, y) {
    this.el ??= $('#tip');
    this.el.innerHTML = html;
    this.el.classList.add('on');
    const r = this.el.getBoundingClientRect();
    let left = x + 16, top = y + 16;
    if (left + r.width > innerWidth - 8) left = x - r.width - 16;
    if (top + r.height > innerHeight - 8) top = y - r.height - 16;
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
  },
  hide() { this.el?.classList.remove('on'); }
};

/** Map a % change to a heat color (red ↔ green, deeper = stronger). */
function heatColor(pct) {
  const m = Math.max(-1, Math.min(1, (pct || 0) / 8));
  if (m >= 0) {
    const k = m;
    return `rgb(${Math.round(18 - 10 * k)}, ${Math.round(40 + 150 * k)}, ${Math.round(32 + 70 * k)})`;
  }
  const k = -m;
  return `rgb(${Math.round(60 + 175 * k)}, ${Math.round(10 + 8 * k)}, ${Math.round(22 + 30 * k)})`;
}

const STABLES = new Set(['tether', 'usd-coin', 'dai', 'first-digital-usd', 'ethena-usde', 'usds', 'paypal-usd', 'true-usd',
  'binance-usd', 'frax', 'usdd', 'tusd', 'pax-gold', 'tether-gold', 'usd1-wlfi', 'ripple-usd', 'falcon-finance', 'global-dollar',
  'blackrock-usd-institutional-digital-liquidity-fund', 'binance-bridged-usdt-bnb-smart-chain', 'susds', 'syrupusdc', 'bfusd',
  'usdtb', 'ethena-staked-usde', 'gho', 'eutbl', 'resolv-usr', 'usual-usd', 'stasis-eurs', 'euro-coin', 'ondo-us-dollar-yield']);
const isStable = c => STABLES.has(c.id) || /usd|stable/i.test(c.id) && Math.abs(c.price_change_percentage_24h ?? 0) < 0.6 && Math.abs((c.current_price ?? 0) - 1) < 0.03;
