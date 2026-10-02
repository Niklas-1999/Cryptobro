/* =========================================================
   CRYPTOBRO // app — data plumbing & UI
   ========================================================= */
const CG = 'https://api.coingecko.com/api/v3';
const BINANCE_REST = ['https://api.binance.com', 'https://data-api.binance.vision'];
const BINANCE_WS = ['wss://stream.binance.com:9443', 'wss://data-stream.binance.vision'];
const RSS = 'https://api.rss2json.com/v1/api.json?rss_url=';
const FEEDS = [
  { name: 'COINTELEGRAPH', url: 'https://cointelegraph.com/rss' },
  { name: 'COINDESK', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'DECRYPT', url: 'https://decrypt.co/feed' },
  { name: 'BITCOIN MAG', url: 'https://bitcoinmagazine.com/.rss/full/' }
];
const WHALE_SYMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];
const WHALE_MIN = 50_000;
const WHALE_MEGA = 500_000;

const TF = {
  '1H':  { interval: '1m',  limit: 60,  intraday: true,  cgDays: 1 },
  '24H': { interval: '15m', limit: 96,  intraday: true,  cgDays: 1 },
  '7D':  { interval: '1h',  limit: 168, intraday: false, cgDays: 7 },
  '30D': { interval: '4h',  limit: 180, intraday: false, cgDays: 30 },
  '1Y':  { interval: '1d',  limit: 365, intraday: false, cgDays: 365 }
};

const DEFAULT_COINS = [
  ['bitcoin', 'btc', 'Bitcoin'], ['ethereum', 'eth', 'Ethereum'], ['solana', 'sol', 'Solana'], ['ripple', 'xrp', 'XRP'],
  ['binancecoin', 'bnb', 'BNB'], ['dogecoin', 'doge', 'Dogecoin'], ['cardano', 'ada', 'Cardano'], ['tron', 'trx', 'TRON']
].map(([id, symbol, name], i) => ({ id, symbol, name, image: '', market_cap_rank: i + 1 }));

const S = {
  markets: [],
  byId: {},
  binPrices: {},            // 'BTCUSDT' -> last REST price (used to validate symbol mapping)
  live: {},                 // 'BTCUSDT' -> {c,o,h,l,q}
  restBase: 0,
  slots: store.get('slots', ['bitcoin', 'ethereum', 'solana', 'ripple']),
  tfs: store.get('tfs', ['24H', '24H', '24H', '24H']),
  cards: [],
  picker: null,
  sort: { k: 'market_cap_rank', asc: true },
  news: [], newsFilter: 'ALL',
  flow: [],
  wsOk: false
};

/* =========================================================
   Boot sequence
   ========================================================= */
const boot = (() => {
  const log = $('#bootLog'), bar = $('#bootBar');
  const lines = [
    'BOOTING CRYPTOBRO KERNEL v2.077',
    'MOUNTING NEURAL INTERFACE',
    'HANDSHAKE :: BINANCE MARKET STREAM',
    'HANDSHAKE :: COINGECKO AGGREGATOR',
    'SYNCING SENTIMENT ORACLE',
    'TAPPING MEMPOOL // BTC MAINNET',
    'DECRYPTING NEWS TRANSMISSIONS',
    'CALIBRATING HOLO-DISPLAY'
  ];
  let i = 0, done = false, dataReady = false, minTime = false;
  const finish = () => {
    if (done) return;
    done = true;
    $('#boot').classList.add('out');
    document.body.classList.add('ready');
    setTimeout(() => $('#boot')?.remove(), 900);
    NeonChart.all.forEach(c => { c.resize(); c.anim = 0; c.animStart = performance.now(); });
  };
  const tick = () => {
    if (done) return;
    if (i < lines.length) {
      log.innerHTML += `&gt; ${lines[i]} ${'.'.repeat(Math.max(2, 38 - lines[i].length))} <span class="ok">OK</span>\n`;
      i++;
      bar.style.width = (i / lines.length) * 100 + '%';
      setTimeout(tick, 170 + Math.random() * 140);
    } else {
      log.innerHTML += '&gt; <span class="ok">UPLINK ESTABLISHED. WELCOME BACK, CHOOM.</span>';
      minTime = true;
      if (dataReady) setTimeout(finish, 350);
    }
  };
  $('#boot').addEventListener('click', finish);
  if (location.hash.includes('skipboot')) {
    $('#boot').remove();
    document.body.classList.add('ready');
    $('#app').style.transition = 'none';
    done = true;
    return { ready() {} };
  }
  setTimeout(tick, 200);
  setTimeout(finish, 6000);
  return { ready() { dataReady = true; if (minTime) setTimeout(finish, 350); } };
})();

/* =========================================================
   Clock & sessions
   ========================================================= */
function tickClock() {
  const d = new Date();
  $('#clock').textContent = d.toLocaleTimeString([], { hour12: false });
  const day = d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  $('#date').textContent = `${day} · UTC ${d.toISOString().slice(11, 16)}`;
}

const SESSIONS = [
  { city: 'NEW YORK', mk: 'NYSE / NASDAQ', tz: 'America/New_York', o: [9, 30], c: [16, 0] },
  { city: 'LONDON', mk: 'LSE', tz: 'Europe/London', o: [8, 0], c: [16, 30] },
  { city: 'FRANKFURT', mk: 'XETRA', tz: 'Europe/Berlin', o: [9, 0], c: [17, 30] },
  { city: 'TOKYO', mk: 'TSE', tz: 'Asia/Tokyo', o: [9, 0], c: [15, 30] },
  { city: 'HONG KONG', mk: 'HKEX', tz: 'Asia/Hong_Kong', o: [9, 30], c: [16, 0] },
  { city: 'SYDNEY', mk: 'ASX', tz: 'Australia/Sydney', o: [10, 0], c: [16, 0] }
];
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function tzParts(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { dow: DOW[p.weekday], h: +p.hour % 24, m: +p.minute, s: +p.second };
}
const dur = m => (m >= 1440 ? `${Math.floor(m / 1440)}D ` : '') + `${Math.floor((m % 1440) / 60)}H ${Math.floor(m % 60)}M`;
function renderSessions() {
  $('#sessions').innerHTML = SESSIONS.map(s => {
    const t = tzParts(s.tz);
    const now = t.dow * 1440 + t.h * 60 + t.m + t.s / 60;
    const open = s.o[0] * 60 + s.o[1], close = s.c[0] * 60 + s.c[1];
    const today = t.h * 60 + t.m;
    const isOpen = t.dow >= 1 && t.dow <= 5 && today >= open && today < close;
    let status;
    if (isOpen) status = `OPEN · CLOSES ${dur(close - today - t.s / 60)}`;
    else {
      let best = Infinity;
      for (let d = 1; d <= 5; d++) {
        let diff = d * 1440 + open - now;
        if (diff <= 0) diff += 7 * 1440;
        best = Math.min(best, diff);
      }
      status = `CLOSED · OPENS ${dur(best)}`;
    }
    const time = `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`;
    return `<div class="ses ${isOpen ? 'open' : ''}"><div class="city">${s.city}</div><div class="mk">${s.mk}</div><div class="tm">${time}</div><div class="st"><i></i>${status}</div></div>`;
  }).join('');
}

/* =========================================================
   Binance helpers
   ========================================================= */
async function binance(path) {
  for (let i = 0; i < BINANCE_REST.length; i++) {
    const idx = (S.restBase + i) % BINANCE_REST.length;
    try {
      const r = await fetchJSON(BINANCE_REST[idx] + path, { retries: 0, timeout: 9000 });
      S.restBase = idx;
      return r;
    } catch (e) { if (i === BINANCE_REST.length - 1) throw e; }
  }
}

async function loadBinanceSymbols() {
  try {
    const all = await binance('/api/v3/ticker/price');
    for (const t of all) if (t.symbol.endsWith('USDT')) S.binPrices[t.symbol] = +t.price;
  } catch (e) { console.warn('Binance symbols unavailable', e); }
}

/** USDT per unit of the display currency (Binance quotes everything in USDT). */
const rate = () => (CUR.code === 'eur' ? (S.live.EURUSDT?.c || S.binPrices.EURUSDT || 1) : 1);
/** Binance live ticker converted into the display currency. */
function liveOf(sym) {
  const L = sym && S.live[sym];
  if (!L) return null;
  const r = rate();
  return { c: L.c / r, o: L.o / r, h: L.h / r, l: L.l / r, chg: (L.c / L.o - 1) * 100 };
}

/** CoinGecko coin → Binance USDT pair, only if prices agree (guards against ticker collisions). */
function binSym(coin) {
  if (!coin) return null;
  const sym = coin.symbol.toUpperCase() + 'USDT';
  const bp = S.binPrices[sym];
  if (!bp) return null;
  if (coin.current_price && Math.abs(bp / rate() / coin.current_price - 1) > 0.08) return null;
  return sym;
}

const coinById = id => S.byId[id] || DEFAULT_COINS.find(c => c.id === id) || DEFAULT_COINS[0];
const livePrice = c => liveOf(binSym(c))?.c || c.current_price;

/* =========================================================
   CoinGecko markets
   ========================================================= */
async function loadMarkets() {
  try {
    const m = await fetchJSON(`${CG}/coins/markets?vs_currency=${CUR.code}&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=1h,24h,7d`, { retries: 2 });
    if (!Array.isArray(m) || !m.length) throw new Error('empty');
    S.markets = m;
    S.byId = Object.fromEntries(m.map(c => [c.id, c]));
    S.symToId = {};
    for (const c of m) S.symToId[c.symbol.toUpperCase()] ??= c.id;
    renderTape();
    renderHeatmap();
    renderMovers();
    renderTable();
    S.cards.forEach(updateCardMeta);
    return true;
  } catch (e) {
    console.warn('markets failed', e);
    return false;
  }
}

/* =========================================================
   Chart cards
   ========================================================= */
function buildCards() {
  const host = $('#charts');
  host.innerHTML = '';
  S.cards = S.slots.map((id, i) => {
    const el = document.createElement('article');
    el.className = 'panel cc';
    el.dataset.panel = 'chart' + i;
    el.innerHTML = `
      <div class="cc-top">
        <div class="cc-coin" title="Change asset"><img alt="" onerror="this.style.visibility='hidden'"><div><div class="cc-name"></div><div class="cc-sym"></div></div><span class="caret">▼</span></div>
        <span class="cc-rank"></span>
        <button class="cc-info" title="Coin details">INFO ⟶</button>
      </div>
      <div class="cc-price-row"><span class="cc-price">—</span><span class="badge"></span><span class="badge pchg" title="Change over selected timeframe"></span></div>
      <div class="cc-tf">${Object.keys(TF).map(k => `<button data-tf="${k}">${k}</button>`).join('')}</div>
      <div class="cc-canvas"><div class="cc-load">ACQUIRING SIGNAL…</div></div>
      <div class="cc-stats">
        <div><label>24H HIGH</label><b class="h">—</b></div>
        <div><label>24H LOW</label><b class="l">—</b></div>
        <div><label>VOL 24H</label><b class="v">—</b></div>
        <div><label>MCAP</label><b class="m">—</b></div>
      </div>`;
    host.appendChild(el);
    const card = { i, el, chart: new NeonChart($('.cc-canvas', el)), req: 0, last: null };
    $('.cc-coin', el).addEventListener('click', () => (S.picker?.i === i ? closePicker() : openPicker(i)));
    $$('.cc-tf button', el).forEach(b => b.addEventListener('click', () => {
      S.tfs[i] = b.dataset.tf; store.set('tfs', S.tfs);
      loadChart(card, true);
    }));
    updateCardMeta(card);
    return card;
  });
}

function updateCardMeta(card) {
  const c = coinById(S.slots[card.i]);
  const el = card.el;
  const img = $('.cc-coin img', el);
  if (c.image && img.getAttribute('src') !== c.image) { img.src = c.image; img.style.visibility = ''; }
  $('.cc-name', el).textContent = c.name.toUpperCase();
  $('.cc-sym', el).textContent = c.symbol.toUpperCase() + ' / ' + CUR.code.toUpperCase() + (binSym(c) ? ' · LIVE' : '');
  $('.cc-info', el).dataset.coin = c.id;
  $('.cc-rank', el).textContent = c.market_cap_rank ? 'RANK #' + c.market_cap_rank : '';
  $$('.cc-tf button', el).forEach(b => b.classList.toggle('on', b.dataset.tf === S.tfs[card.i]));
  $('.v', el).textContent = fmtBig(c.total_volume);
  $('.m', el).textContent = fmtBig(c.market_cap);
  updateCardLive(card);
}

function updateCardLive(card) {
  const c = coinById(S.slots[card.i]);
  const L = liveOf(binSym(c));
  const el = card.el;
  const price = L ? L.c : c.current_price;
  const chg = L ? L.chg : c.price_change_percentage_24h;
  const priceEl = $('.cc-price', el);
  if (price != null) {
    if (card.last != null && price !== card.last) flash(priceEl, price - card.last);
    card.last = price;
    priceEl.textContent = fmtPrice(price);
    card.chart.setLive(price);
  }
  const b = $('.badge', el);
  b.className = 'badge ' + cls(chg ?? 0);
  b.textContent = (chg ?? 0) >= 0 ? '▲ ' + fmtPct(chg) : '▼ ' + fmtPct(chg);
  $('.h', el).textContent = fmtPrice(L ? L.h : c.high_24h);
  $('.l', el).textContent = fmtPrice(L ? L.l : c.low_24h);
  const d = card.chart.data;
  const pc = $('.pchg', el);
  if (d.length > 1 && S.tfs[card.i] !== '24H') {
    const p = (card.chart.target / d[0].p - 1) * 100;
    pc.hidden = false;
    pc.className = 'badge pchg ' + cls(p);
    pc.textContent = S.tfs[card.i] + ' ' + fmtPct(p);
  } else pc.hidden = true;
}

/** Price history for a coin in the display currency: Binance klines if listed, else CoinGecko. */
async function fetchSeries(c, tfKey) {
  const tf = TF[tfKey];
  const sym = binSym(c);
  if (sym) {
    const q = `interval=${tf.interval}&limit=${tf.limit}`;
    const [k, fx] = await Promise.all([
      binance(`/api/v3/klines?symbol=${sym}&${q}`),
      CUR.code === 'eur' ? binance(`/api/v3/klines?symbol=EURUSDT&${q}`).catch(() => null) : null
    ]);
    const fxAt = fx && new Map(fx.map(r => [r[0], +r[4]]));
    return k.map(r => ({ t: r[0], p: +r[4] / (fxAt?.get(r[0]) || rate()) }));
  }
  const j = await fetchJSON(`${CG}/coins/${c.id}/market_chart?vs_currency=${CUR.code}&days=${TF[tfKey].cgDays}`, { retries: 1 });
  let pts = j.prices.map(([t, p]) => ({ t, p }));
  if (tfKey === '1H') pts = pts.filter(p => p.t > Date.now() - 3600e3 * 1.5);
  return pts;
}

async function loadChart(card, animate) {
  const c = coinById(S.slots[card.i]);
  const tfKey = S.tfs[card.i];
  const tf = TF[tfKey];
  const req = ++card.req;
  const loader = $('.cc-load', card.el);
  if (animate) { loader.textContent = 'ACQUIRING SIGNAL…'; loader.hidden = false; }
  updateCardMeta(card);
  try {
    const pts = await fetchSeries(c, tfKey);
    if (req !== card.req) return;
    if (pts.length < 2) throw new Error('no data');
    if (animate) card.chart.setData(pts, tf.intraday);
    else {
      card.chart.data = pts;
      card.chart.intraday = tf.intraday;
      card.chart.target = card.chart.live = pts[pts.length - 1].p;
    }
    loader.hidden = true;
    updateCardLive(card);
  } catch (e) {
    if (req !== card.req) return;
    loader.hidden = false;
    loader.textContent = 'SIGNAL LOST // RETRYING';
    setTimeout(() => req === card.req && loadChart(card, true), 15000);
  }
}

/* coin picker */
function openPicker(i) {
  closePicker();
  const card = S.cards[i];
  const pk = document.createElement('div');
  pk.className = 'picker';
  pk.innerHTML = `<input placeholder="SEARCH ASSET // NAME OR TICKER" spellcheck="false" autocomplete="off"><ul></ul>`;
  card.el.appendChild(pk);
  const input = $('input', pk), ul = $('ul', pk);
  const source = S.markets.length ? S.markets : DEFAULT_COINS;
  let hl = 0, list = [];
  const render = () => {
    const q = input.value.trim().toLowerCase();
    list = source.filter(c => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    hl = Math.max(0, Math.min(hl, list.length - 1));
    ul.innerHTML = list.map((c, j) => `<li data-id="${esc(c.id)}" class="${j === hl ? 'hl' : ''}"><span class="r">${c.market_cap_rank ?? ''}</span><img src="${esc(c.image)}" alt="" onerror="this.style.visibility='hidden'"><span class="n">${esc(c.name)}</span><span class="s">${esc(c.symbol.toUpperCase())}</span></li>`).join('')
      || '<li><span class="n">NO MATCH</span></li>';
    ul.children[hl]?.scrollIntoView({ block: 'nearest' });
  };
  const choose = id => {
    if (!id) return;
    S.slots[i] = id; store.set('slots', S.slots);
    closePicker();
    card.last = null;
    loadChart(card, true);
  };
  input.addEventListener('input', () => { hl = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { hl++; render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl--; render(); e.preventDefault(); }
    else if (e.key === 'Enter') choose(list[hl]?.id);
    else if (e.key === 'Escape') closePicker();
  });
  ul.addEventListener('click', e => choose(e.target.closest('li')?.dataset.id));
  render();
  input.focus();
  S.picker = { el: pk, i };
}
function closePicker() { S.picker?.el.remove(); S.picker = null; }
document.addEventListener('mousedown', e => {
  if (S.picker && !S.picker.el.contains(e.target) && !e.target.closest('.cc-coin')) closePicker();
});

/* =========================================================
   Ticker tape
   ========================================================= */
let tapeEls = {};
function renderTape() {
  const coins = S.markets.filter(c => !isStable(c)).slice(0, 30);
  const item = c => `<div class="tk" data-id="${esc(c.id)}" data-coin="${esc(c.id)}"><img src="${esc(c.image)}" alt=""><span class="s">${esc(c.symbol.toUpperCase())}</span><span class="p">${fmtPrice(livePrice(c))}</span><span class="c ${cls(c.price_change_percentage_24h)}">${fmtPct(c.price_change_percentage_24h)}</span></div>`;
  const html = coins.map(item).join('');
  $('#tape').innerHTML = html + html;
  tapeEls = {};
  $$('#tape .tk').forEach(el => (tapeEls[el.dataset.id] ??= []).push(el));
}

/* =========================================================
   Heatmap (squarified treemap)
   ========================================================= */
function squarify(items, x, y, w, h) {
  const out = [];
  let rest = items.slice();
  const worst = (row, s) => {
    const sum = row.reduce((a, b) => a + b.a, 0);
    const mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a));
    return Math.max((s * s * mx) / (sum * sum), (sum * sum) / (s * s * mn));
  };
  while (rest.length) {
    const s = Math.min(w, h);
    let row = [rest[0]], best = worst(row, s), i = 1;
    while (i < rest.length) {
      const r2 = row.concat(rest[i]);
      const w2 = worst(r2, s);
      if (w2 > best) break;
      row = r2; best = w2; i++;
    }
    const sum = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) {
      const cw = sum / h; let yy = y;
      row.forEach(it => { const ih = it.a / cw; out.push({ ...it, x, y: yy, w: cw, h: ih }); yy += ih; });
      x += cw; w -= cw;
    } else {
      const rh = sum / w; let xx = x;
      row.forEach(it => { const iw = it.a / rh; out.push({ ...it, x: xx, y, w: iw, h: rh }); xx += iw; });
      y += rh; h -= rh;
    }
    rest = rest.slice(row.length);
  }
  return out;
}

function renderHeatmap() {
  const host = $('#heat');
  const coins = S.markets.filter(c => !isStable(c) && c.market_cap).slice(0, 30);
  if (!coins.length) return;
  const W = 1000, H = 1000 * (host.clientHeight / Math.max(host.clientWidth, 1)) || 400;
  const vals = coins.map(c => Math.pow(c.market_cap, 0.62));
  const tot = vals.reduce((a, b) => a + b, 0);
  const tiles = squarify(coins.map((c, i) => ({ c, a: (vals[i] / tot) * W * H })), 0, 0, W, H);
  host.innerHTML = tiles.map((t, i) => {
    const pct = t.c.price_change_percentage_24h;
    const px = Math.sqrt(t.w * t.h) * (host.clientWidth / W);
    const fs = Math.max(9, Math.min(30, px / 4.2, (t.w / W * host.clientWidth) / (t.c.symbol.length * 0.95)));
    const showPx = px > 70;
    return `<div class="hm" data-id="${esc(t.c.id)}" data-coin="${esc(t.c.id)}" style="left:${t.x / W * 100}%;top:${t.y / H * 100}%;width:${t.w / W * 100}%;height:${t.h / H * 100}%;background:${heatColor(pct)};color:${heatColor(pct)};animation-delay:${i * 25}ms">
      <span class="s" style="font-size:${fs}px">${esc(t.c.symbol.toUpperCase())}</span>
      ${px > 34 ? `<span class="c" style="font-size:${Math.max(9, fs * .55)}px">${fmtPct(pct)}</span>` : ''}
      ${showPx ? `<span class="p" style="font-size:${Math.max(9, fs * .42)}px">${fmtPrice(t.c.current_price)}</span>` : ''}
    </div>`;
  }).join('');
}
$('#heat').addEventListener('mousemove', e => {
  const t = e.target.closest('.hm');
  if (!t) return tip.hide();
  const c = S.byId[t.dataset.id];
  tip.show(`<div style="color:#fff;margin-bottom:4px">${esc(c.name)} <span style="color:var(--txt-mute)">#${c.market_cap_rank}</span></div>
    <div class="row"><span>PRICE</span><b>${fmtPrice(livePrice(c))}</b></div>
    <div class="row"><span>1H</span><b class="${cls(c.price_change_percentage_1h_in_currency)}">${fmtPct(c.price_change_percentage_1h_in_currency)}</b></div>
    <div class="row"><span>24H</span><b class="${cls(c.price_change_percentage_24h)}">${fmtPct(c.price_change_percentage_24h)}</b></div>
    <div class="row"><span>7D</span><b class="${cls(c.price_change_percentage_7d_in_currency)}">${fmtPct(c.price_change_percentage_7d_in_currency)}</b></div>
    <div class="row"><span>MCAP</span><b>${fmtBig(c.market_cap)}</b></div>`, e.clientX, e.clientY);
});
$('#heat').addEventListener('mouseleave', () => tip.hide());
let heatResize;
new ResizeObserver(() => { clearTimeout(heatResize); heatResize = setTimeout(renderHeatmap, 200); }).observe($('#heat'));

/* =========================================================
   Movers
   ========================================================= */
function renderMovers() {
  const pool = S.markets.filter(c => !isStable(c) && c.price_change_percentage_24h != null);
  const sorted = pool.slice().sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const gain = sorted.slice(0, 10), lose = sorted.slice(-10).reverse();
  const max = Math.max(...[...gain, ...lose].map(c => Math.abs(c.price_change_percentage_24h)), 1);
  const row = (c, i) => `<div class="mv" data-coin="${esc(c.id)}" style="animation-delay:${i * 60}ms"><img src="${esc(c.image)}" alt=""><span class="n">${esc(c.symbol.toUpperCase())} <small style="color:var(--txt-mute)">${fmtPrice(c.current_price)}</small></span><span class="${cls(c.price_change_percentage_24h)}">${fmtPct(c.price_change_percentage_24h)}</span><i class="bar ${cls(c.price_change_percentage_24h)}" style="width:${Math.abs(c.price_change_percentage_24h) / max * 100}%"></i></div>`;
  $('#gainers').innerHTML = gain.map(row).join('');
  $('#losers').innerHTML = lose.map(row).join('');
}

/* =========================================================
   Market table
   ========================================================= */
let rowEls = {};
function sparkSVG(prices, up) {
  if (!prices?.length) return '';
  const step = Math.max(1, Math.floor(prices.length / 60));
  const p = prices.filter((_, i) => i % step === 0);
  const mn = Math.min(...p), mx = Math.max(...p), W = 120, H = 32;
  const pts = p.map((v, i) => `${(i / (p.length - 1) * W).toFixed(1)},${(H - 2 - ((v - mn) / ((mx - mn) || 1)) * (H - 4)).toFixed(1)}`).join(' ');
  const col = up ? '#00ff9c' : '#ff2a4d';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.4" style="filter:drop-shadow(0 0 3px ${col})"/></svg>`;
}
function renderTable() {
  const { k, asc } = S.sort;
  const rows = S.markets.slice().sort((a, b) => {
    let x = a[k], y = b[k];
    if (typeof x === 'string') return asc ? x.localeCompare(y) : y.localeCompare(x);
    x ??= -Infinity; y ??= -Infinity;
    return asc ? x - y : y - x;
  });
  $$('#mtable th').forEach(th => { th.classList.toggle('sort', th.dataset.k === k); th.classList.toggle('asc', th.dataset.k === k && asc); });
  const pc = v => `<td class="num ${cls(v)}">${fmtPct(v)}</td>`;
  $('#mbody').innerHTML = rows.map(c => `<tr data-id="${esc(c.id)}" data-coin="${esc(c.id)}">
    <td class="num rk">${c.market_cap_rank ?? '—'}</td>
    <td><div class="asset"><img src="${esc(c.image)}" alt="" loading="lazy"><b>${esc(c.name)}</b><span>${esc(c.symbol.toUpperCase())}</span></div></td>
    <td class="num px">${fmtPrice(livePrice(c))}</td>
    ${pc(c.price_change_percentage_1h_in_currency)}${pc(c.price_change_percentage_24h_in_currency)}${pc(c.price_change_percentage_7d_in_currency)}
    <td class="num">${fmtBig(c.market_cap)}</td>
    <td class="num">${fmtBig(c.total_volume)}</td>
    <td class="num">${sparkSVG(c.sparkline_in_7d?.price, (c.price_change_percentage_7d_in_currency ?? 0) >= 0)}</td>
  </tr>`).join('');
  rowEls = {};
  $$('#mbody tr').forEach(tr => { rowEls[tr.dataset.id] = $('.px', tr); });
}
$$('#mtable th[data-k]').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.k;
  S.sort = { k, asc: S.sort.k === k ? !S.sort.asc : (k === 'market_cap_rank' || k === 'name') };
  renderTable();
}));

/* =========================================================
   Live stream (Binance WebSocket)
   ========================================================= */
let ws, wsHost = 0, wsRetry = 0, lastMsg = 0;
function setLink(state, txt) {
  const l = $('#link');
  l.className = 'link ' + state;
  $('#linkTxt').textContent = txt;
}
function connectWS() {
  const streams = ['!miniTicker@arr', ...WHALE_SYMS.map(s => s.toLowerCase() + '@aggTrade')].join('/');
  try { ws = new WebSocket(`${BINANCE_WS[wsHost]}/stream?streams=${streams}`); }
  catch { return scheduleWS(); }
  setLink('', 'CONNECTING');
  ws.onopen = () => { wsRetry = 0; S.wsOk = true; setLink('on', 'LIVE FEED'); };
  ws.onmessage = ev => {
    lastMsg = Date.now();
    const m = JSON.parse(ev.data);
    if (m.stream === '!miniTicker@arr') onTickers(m.data);
    else if (m.data?.e === 'aggTrade') onTrade(m.data);
  };
  ws.onclose = () => { S.wsOk = false; setLink('off', 'RECONNECTING'); scheduleWS(); };
  ws.onerror = () => ws.close();
}
function scheduleWS() {
  wsRetry++;
  if (wsRetry % 2 === 0) wsHost = (wsHost + 1) % BINANCE_WS.length;
  setTimeout(connectWS, Math.min(30000, 1500 * wsRetry));
}
// watchdog: if the socket silently stalls, recycle it; also poll REST as a fallback.
setInterval(() => {
  if (S.wsOk && Date.now() - lastMsg > 20000) ws?.close();
  if (!S.wsOk) pollTickers();
}, 10000);
async function pollTickers() {
  const syms = [...new Set(S.markets.slice(0, 60).map(binSym).filter(Boolean))];
  if (!syms.length) return;
  try {
    const r = await binance(`/api/v3/ticker/24hr?type=MINI&symbols=${encodeURIComponent(JSON.stringify(syms))}`);
    onTickers(r.map(t => ({ s: t.symbol, c: t.lastPrice, o: t.openPrice, h: t.highPrice, l: t.lowPrice, q: t.quoteVolume })));
  } catch {}
}

function onTickers(arr) {
  for (const t of arr) {
    if (!t.s.endsWith('USDT')) continue;
    S.live[t.s] = { c: +t.c, o: +t.o, h: +t.h, l: +t.l, q: +t.q };
  }
  S.cards.forEach(updateCardLive);
  // tape + table + heat
  for (const c of S.markets) {
    const L = liveOf(binSym(c));
    if (!L) continue;
    const prev = c._live ?? c.current_price;
    if (L.c === prev) continue;
    c._live = L.c;
    const dir = L.c - prev;
    tapeEls[c.id]?.forEach(el => {
      const p = $('.p', el);
      p.textContent = fmtPrice(L.c);
      p.style.color = dir > 0 ? 'var(--up)' : 'var(--down)';
      clearTimeout(p._t); p._t = setTimeout(() => (p.style.color = ''), 600);
      const ch = L.chg;
      const ce = $('.c', el); ce.className = 'c ' + cls(ch); ce.textContent = fmtPct(ch);
    });
    const px = rowEls[c.id];
    if (px) { px.textContent = fmtPrice(L.c); flash(px, dir); }
  }
  const btc = liveOf('BTCUSDT');
  if (btc) document.title = `BTC ${fmtPrice(btc.c)} // CRYPTOBRO`;
  if (modal.coin) updateModalLive();
}

/* whale tape + order flow */
const whaleBox = $('#whales');
let whaleFirst = true;
function onTrade(t, seed) {
  const p = +t.p / rate(), q = +t.q, v = p * q, buy = !t.m;
  if (!seed) S.flow.push({ T: Date.now(), v, buy });
  if (v < WHALE_MIN) return;
  if (whaleFirst) { whaleBox.innerHTML = ''; whaleFirst = false; }
  const el = document.createElement('div');
  el.className = `wh ${buy ? 'b' : 's'} ${v >= WHALE_MEGA ? 'mega' : ''}`;
  const time = new Date(t.T).toLocaleTimeString([], { hour12: false });
  el.innerHTML = `<span class="t">${time}</span><span class="${buy ? 'up' : 'down'}">${buy ? 'BUY' : 'SELL'}</span><span class="sym" ${S.symToId?.[t.s.replace('USDT', '')] ? `data-coin="${S.symToId[t.s.replace('USDT', '')]}"` : ''}>${t.s.replace('USDT', '')} <small style="color:var(--txt-mute)">@ ${fmtPrice(p)}</small></span><span class="v">${fmtBig(v)}</span>`;
  whaleBox.prepend(el);
  while (whaleBox.children.length > 24) whaleBox.lastChild.remove();
}
setInterval(() => {
  const cut = Date.now() - 60000;
  S.flow = S.flow.filter(f => f.T > cut);
  let b = 0, s = 0;
  for (const f of S.flow) f.buy ? (b += f.v) : (s += f.v);
  const pct = b + s ? (b / (b + s)) * 100 : 50;
  $('#flowFill').style.width = pct + '%';
  $('#flowBuy').textContent = pct.toFixed(0) + '%';
  $('#flowSell').textContent = (100 - pct).toFixed(0) + '%';
}, 1000);
/** Prefill the whale tape with recent large trades so it is never empty on load. */
async function seedWhales() {
  try {
    const res = await Promise.all(WHALE_SYMS.slice(0, 3).map(sym =>
      binance(`/api/v3/aggTrades?symbol=${sym}&limit=1000`).then(a => a.map(t => ({ s: sym, p: t.p, q: t.q, m: t.m, T: t.T })))));
    const big = res.flat().filter(t => (t.p / rate()) * t.q >= WHALE_MIN).sort((a, b) => a.T - b.T).slice(-20);
    if (whaleFirst) big.forEach(t => onTrade(t, true));
  } catch {}
}
const showWhaleMin = () => ($('#whaleMin').textContent = fmtBig(WHALE_MIN));
showWhaleMin();

/* =========================================================
   Global stats
   ========================================================= */
let lastDominance = null;
function renderDominance() {
  if (!lastDominance) return;
  const dom = Object.entries(lastDominance).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const other = 100 - dom.reduce((a, b) => a + b[1], 0);
  const cols = Theme.shades(9);
  $('#dombar').innerHTML = [...dom, ['others', other]].map(([k, v], i) =>
    `<i style="flex-grow:${v};background:${cols[i]};box-shadow:0 0 8px ${cols[i]}" data-l="${esc(k.toUpperCase())} ${fmtNum(v, 2)}%"></i>`).join('');
}
addEventListener('themechange', renderDominance);
async function loadGlobal() {
  try {
    const { data: g } = await fetchJSON(`${CG}/global`);
    countTo($('#gMcap'), g.total_market_cap[CUR.code], v => fmtBig(v));
    countTo($('#gVol'), g.total_volume[CUR.code], v => fmtBig(v));
    countTo($('#gBtcDom'), g.market_cap_percentage.btc, v => fmtNum(v, 1) + '%');
    countTo($('#gEthDom'), g.market_cap_percentage.eth, v => fmtNum(v, 1) + '%');
    countTo($('#gCoins'), g.active_cryptocurrencies, v => fmtNum(v));
    const ch = g.market_cap_change_percentage_24h_usd;
    const e = $('#gMcapChg'); e.className = cls(ch); e.textContent = fmtPct(ch) + ' 24H';
    lastDominance = g.market_cap_percentage;
    renderDominance();
  } catch (e) { console.warn('global failed', e); }
}

/* =========================================================
   Fear & Greed
   ========================================================= */
const fngColor = v => v < 25 ? '#ff1744' : v < 45 ? '#ff6d00' : v < 55 ? '#ffd600' : v < 75 ? '#76ff03' : '#00ff9c';
(function ticks() {
  let html = '';
  for (let v = 0; v <= 100; v += 25) {
    const a = Math.PI * (1 - v / 100);
    const x1 = 110 + Math.cos(a) * 74, y1 = 115 - Math.sin(a) * 74, x2 = 110 + Math.cos(a) * 66, y2 = 115 - Math.sin(a) * 66;
    const tx = 110 + Math.cos(a) * 56, ty = 115 - Math.sin(a) * 56 + 3;
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text x="${tx}" y="${ty}">${v}</text>`;
  }
  $('#gTicks').innerHTML = html;
})();
async function loadFng() {
  try {
    const { data } = await fetchJSON('https://api.alternative.me/fng/?limit=31');
    const now = +data[0].value;
    const col = fngColor(now);
    $('#gArc').style.strokeDashoffset = 283 * (1 - now / 100);
    $('#gNeedle').style.transform = `rotate(${-90 + 180 * now / 100}deg)`;
    const vEl = $('#fngVal');
    vEl.style.color = col;
    countTo(vEl, now, v => Math.round(v), 2000);
    const clsEl = $('#fngCls');
    clsEl.textContent = data[0].value_classification.toUpperCase();
    clsEl.style.color = col;
    const g = $('#gFng'); g.textContent = `${now} ${data[0].value_classification.toUpperCase()}`; g.style.color = col;
    const set = (id, d) => { if (!d) return; const e = $(id); e.textContent = d.value; e.style.color = fngColor(+d.value); };
    set('#fngY', data[1]); set('#fngW', data[7]); set('#fngM', data[30]);
    const hist = data.slice(0, 30).reverse();
    $('#fngBars').innerHTML = hist.map((d, i) =>
      `<i style="height:${d.value}%;background:${fngColor(+d.value)};box-shadow:0 0 6px ${fngColor(+d.value)}66;animation-delay:${i * 25}ms" data-v="${d.value}" data-c="${esc(d.value_classification)}" data-t="${d.timestamp}"></i>`).join('');
    $('#fngUpd').textContent = 'NEXT UPDATE ' + dur(+data[0].time_until_update / 60);
  } catch (e) { console.warn('fng failed', e); }
}
$('#fngBars').addEventListener('mousemove', e => {
  const b = e.target.closest('i');
  if (!b) return tip.hide();
  const d = new Date(+b.dataset.t * 1000).toLocaleDateString([], { month: 'short', day: '2-digit' });
  tip.show(`<div class="row"><span>${d}</span><b style="color:${fngColor(+b.dataset.v)}">${b.dataset.v} · ${esc(b.dataset.c.toUpperCase())}</b></div>`, e.clientX, e.clientY);
});
$('#fngBars').addEventListener('mouseleave', () => tip.hide());

/* =========================================================
   News
   ========================================================= */
function newsImg(it) {
  if (it.thumbnail) return it.thumbnail;
  if (it.enclosure?.link && /\.(jpe?g|png|webp|gif)|image/i.test(it.enclosure.link + (it.enclosure.type || ''))) return it.enclosure.link;
  const m = /<img[^>]+src=["']([^"']+)/i.exec(it.description || it.content || '');
  return m ? m[1] : '';
}
/** Find top coins mentioned in a headline and return their tags. */
function newsTags(title) {
  const out = [];
  for (const c of S.markets.slice(0, 40)) {
    if (isStable(c) || out.length >= 3) continue;
    const name = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sym = c.symbol.toUpperCase();
    const nameHit = new RegExp(`\\b${name}\\b`, 'i').test(title);
    const symHit = sym.length >= 3 && /^[A-Z0-9]+$/.test(sym) && new RegExp(`\\b${sym}\\b`).test(title);
    if (nameHit || symHit) out.push(c);
  }
  return out;
}
async function loadNews() {
  const res = await Promise.allSettled(FEEDS.map(f => fetchJSON(RSS + encodeURIComponent(f.url), { retries: 1 }).then(j => {
    if (j.status !== 'ok') throw new Error(j.message);
    return j.items.map(it => ({
      src: f.name, title: it.title, link: it.link,
      t: Date.parse(it.pubDate.replace(' ', 'T') + 'Z') || Date.now(),
      img: newsImg(it)
    }));
  })));
  const items = res.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  if (!items.length) {
    if (!S.news.length) $('#news').innerHTML = '<div class="loading">TRANSMISSION JAMMED // RETRYING</div>';
    return;
  }
  const seen = new Set();
  S.news = items.filter(n => !seen.has(n.title) && seen.add(n.title)).sort((a, b) => b.t - a.t).slice(0, 60);
  const srcs = ['ALL', ...FEEDS.map(f => f.name).filter(n => S.news.some(x => x.src === n))];
  $('#newsFilter').innerHTML = srcs.map(s => `<button data-s="${s}" class="${s === S.newsFilter ? 'on' : ''}">${s}</button>`).join('');
  renderNews();
}
function renderNews() {
  const list = S.news.filter(n => S.newsFilter === 'ALL' || n.src === S.newsFilter);
  $('#news').innerHTML = list.map((n, i) => {
    const tags = newsTags(n.title).map(c => {
      const ch = c.price_change_percentage_24h;
      return `<span class="ntag ${cls(ch)}" data-coin="${esc(c.id)}">${esc(c.symbol.toUpperCase())} ${fmtPct(ch, 1)}</span>`;
    }).join('');
    return `<a class="nw ${Date.now() - n.t < 3600e3 ? 'new' : ''}" href="${esc(n.link)}" target="_blank" rel="noopener" style="animation-delay:${Math.min(i, 15) * 40}ms">
      <div class="th" ${n.img ? `style="background-image:url('${esc(n.img)}')"` : ''}></div>
      <div><h4>${esc(n.title)}</h4><div class="meta"><span class="src">${esc(n.src)}</span><span data-t="${n.t}">${timeAgo(n.t)}</span>${tags}</div></div>
    </a>`;
  }).join('');
}
$('#newsFilter').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.newsFilter = b.dataset.s;
  $$('#newsFilter button').forEach(x => x.classList.toggle('on', x === b));
  renderNews();
});
setInterval(() => $$('#news [data-t]').forEach(el => (el.textContent = timeAgo(+el.dataset.t))), 30000);

/* =========================================================
   Trending
   ========================================================= */
async function loadTrending() {
  try {
    const { coins } = await fetchJSON(`${CG}/search/trending`);
    $('#trend').innerHTML = coins.slice(0, 9).map(({ item: c }, i) => {
      const ch = c.data?.price_change_percentage_24h?.[CUR.code] ?? c.data?.price_change_percentage_24h?.usd;
      return `<div class="tr" data-coin="${esc(c.id)}" style="animation-delay:${i * 50}ms"><span class="i">${String(i + 1).padStart(2, '0')}</span><img src="${esc(c.small || c.thumb)}" alt=""><span class="n">${esc(c.name)}<small>${esc(c.symbol)}</small></span><span class="rk">${c.market_cap_rank ? '#' + c.market_cap_rank : '—'}</span><span class="${cls(ch ?? 0)}">${ch != null ? fmtPct(ch, 1) : '—'}</span></div>`;
    }).join('');
  } catch (e) { console.warn('trending failed', e); }
}

/* =========================================================
   Bitcoin network
   ========================================================= */
let halvingETA = 0;
async function loadBtcNet() {
  const M = 'https://mempool.space/api';
  const [height, fees, diff, hash] = await Promise.allSettled([
    fetchJSON(`${M}/blocks/tip/height`), fetchJSON(`${M}/v1/fees/recommended`),
    fetchJSON(`${M}/v1/difficulty-adjustment`), fetchJSON(`${M}/v1/mining/hashrate/3d`)
  ]);
  const D = diff.status === 'fulfilled' ? diff.value : null;
  if (height.status === 'fulfilled') {
    const h = +height.value;
    const el = $('#bnHeight');
    if (el._v && h > el._v) flash(el, 1);
    countTo(el, h, v => Math.round(v).toLocaleString('en-US'));
    const next = Math.ceil((h + 1) / 210000) * 210000;
    const left = next - h;
    const avg = D?.timeAvg ? D.timeAvg / 1000 : 600;
    halvingETA = Date.now() + left * avg * 1000;
    $('#bnHalvBlocks').textContent = `// BLOCK ${next.toLocaleString('en-US')} · ${left.toLocaleString('en-US')} LEFT`;
    $('#bnHalvBar').style.width = ((210000 - left) / 210000) * 100 + '%';
  }
  if (fees.status === 'fulfilled') {
    const f = fees.value;
    $('#feeFast').textContent = f.fastestFee; $('#feeHalf').textContent = f.halfHourFee;
    $('#feeHour').textContent = f.hourFee; $('#feeEco').textContent = f.economyFee;
  }
  if (D) {
    const e = $('#bnDiffChg');
    e.textContent = fmtPct(D.difficultyChange); e.className = cls(D.difficultyChange);
    $('#bnDiffPct').textContent = `EPOCH ${D.progressPercent.toFixed(1)}% · ${D.remainingBlocks} BLOCKS LEFT`;
    $('#bnDiffEta').textContent = '// ETA ' + new Date(D.estimatedRetargetDate).toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase();
    $('#bnDiffBar').style.width = D.progressPercent + '%';
  }
  if (hash.status === 'fulfilled') $('#bnHash').textContent = (hash.value.currentHashrate / 1e18).toFixed(0) + ' EH/s';
}
function tickHalving() {
  if (!halvingETA) return;
  const s = Math.max(0, (halvingETA - Date.now()) / 1000);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60);
  $('#bnHalv').textContent = `${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(sec).padStart(2, '0')}S`;
}

/* =========================================================
   Coin detail modal — opens from any [data-coin] element
   ========================================================= */
const modal = { coin: null, base: null, detail: null, tf: store.get('modalTf', '7D'), req: 0, chart: null, last: null };
const detailCache = {};

const modalEl = document.createElement('div');
modalEl.className = 'modal';
modalEl.hidden = true;
modalEl.innerHTML = `
  <div class="modal-bg" data-close></div>
  <article class="panel modal-box" role="dialog" aria-modal="true">
    <button class="modal-x" data-close title="Close (Esc)">✕</button>
    <header class="md-head">
      <img class="md-img" alt="" onerror="this.style.visibility='hidden'">
      <div class="md-title"><h2 class="md-name"></h2><div class="md-sub"></div></div>
      <div class="md-pricebox"><div class="md-price">—</div><div class="md-chg"></div></div>
    </header>
    <div class="md-cats"></div>
    <div class="md-grid">
      <section class="md-chartbox">
        <div class="cc-tf md-tf">${Object.keys(TF).map(k => `<button data-tf="${k}">${k}</button>`).join('')}</div>
        <div class="cc-canvas md-canvas"><div class="cc-load">ACQUIRING SIGNAL…</div></div>
        <div class="md-range"><label>24H RANGE</label><div class="rng"><span class="rl"></span><div class="rbar"><i></i></div><span class="rh"></span></div></div>
        <div class="md-perf"></div>
      </section>
      <section class="md-stats"></section>
    </div>
    <div class="md-lower">
      <section class="md-supply"></section>
      <section class="md-ath"></section>
    </div>
    <section class="md-about"><h3>// ABOUT</h3><div class="md-desc"></div><div class="md-links"></div></section>
    <footer class="md-foot"><span>SHOW IN CHART SLOT</span><div class="md-slots">${[1, 2, 3, 4].map(n => `<button data-slot="${n - 1}">${n}</button>`).join('')}</div></footer>
  </article>`;
document.body.appendChild(modalEl);
modal.chart = new NeonChart($('.md-canvas', modalEl));

function normMarket(c) {
  return {
    id: c.id, name: c.name, symbol: c.symbol, image: c.image, rank: c.market_cap_rank,
    price: c.current_price, mcap: c.market_cap, fdv: c.fully_diluted_valuation, vol: c.total_volume,
    high: c.high_24h, low: c.low_24h, ath: c.ath, athDate: c.ath_date, athChg: c.ath_change_percentage,
    atl: c.atl, atlDate: c.atl_date, atlChg: c.atl_change_percentage,
    circ: c.circulating_supply, total: c.total_supply, max: c.max_supply,
    perf: { '1H': c.price_change_percentage_1h_in_currency, '24H': c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h, '7D': c.price_change_percentage_7d_in_currency }
  };
}
function normDetail(d) {
  const m = d.market_data || {}, k = CUR.code, g = f => m[f]?.[k];
  return {
    id: d.id, name: d.name, symbol: d.symbol, image: d.image?.large || d.image?.small, rank: d.market_cap_rank,
    price: g('current_price'), mcap: g('market_cap'), fdv: g('fully_diluted_valuation'), vol: g('total_volume'),
    high: g('high_24h'), low: g('low_24h'), ath: g('ath'), athDate: g('ath_date'), athChg: g('ath_change_percentage'),
    atl: g('atl'), atlDate: g('atl_date'), atlChg: g('atl_change_percentage'),
    circ: m.circulating_supply, total: m.total_supply, max: m.max_supply,
    perf: {
      '1H': g('price_change_percentage_1h_in_currency'), '24H': g('price_change_percentage_24h_in_currency'),
      '7D': g('price_change_percentage_7d_in_currency'), '14D': g('price_change_percentage_14d_in_currency'),
      '30D': g('price_change_percentage_30d_in_currency'), '60D': g('price_change_percentage_60d_in_currency'),
      '200D': g('price_change_percentage_200d_in_currency'), '1Y': g('price_change_percentage_1y_in_currency')
    },
    cats: (d.categories || []).filter(Boolean),
    desc: d.description?.en || '', links: d.links || {}, genesis: d.genesis_date, algo: d.hashing_algorithm,
    votes: d.sentiment_votes_up_percentage
  };
}

/** Minimal market-style record so a coin outside the top 100 can sit in a chart slot. */
function marketFromDetail(d) {
  return {
    id: d.id, symbol: d.symbol, name: d.name, image: d.image, current_price: d.price, market_cap_rank: d.rank,
    market_cap: d.mcap, total_volume: d.vol, high_24h: d.high, low_24h: d.low, price_change_percentage_24h: d.perf['24H']
  };
}

function openCoin(id) {
  if (!id) return;
  closePicker();
  tip.hide();
  modal.coin = id;
  modal.detail = null;
  modal.last = null;
  modal.base = S.byId[id] ? normMarket(S.byId[id]) : { id, name: id, symbol: '', perf: {} };
  modalEl.hidden = false;
  document.body.classList.add('modal-open');
  modalEl.classList.remove('in'); void modalEl.offsetWidth; modalEl.classList.add('in');
  $('.modal-box', modalEl).scrollTop = 0;
  $('.md-desc', modalEl).classList.remove('open');
  renderModal();
  loadModalChart(true);
  loadDetail(id);
}
function closeModal() {
  modalEl.hidden = true;
  modal.coin = null;
  document.body.classList.remove('modal-open');
}
async function loadDetail(id) {
  const key = id + ':' + CUR.code;
  const hit = detailCache[key];
  let d = hit && Date.now() - hit.t < 300e3 ? hit.d : null;
  if (!d) {
    $('.md-desc', modalEl).innerHTML = '<div class="loading">DECRYPTING DOSSIER…</div>';
    try {
      d = normDetail(await fetchJSON(`${CG}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, { retries: 1 }));
      detailCache[key] = { d, t: Date.now() };
    } catch {
      if (modal.coin === id) $('.md-desc', modalEl).innerHTML = '<div class="loading">DOSSIER UNAVAILABLE // API RATE LIMIT — TRY AGAIN IN A MINUTE</div>';
      return;
    }
  }
  if (modal.coin !== id) return;
  const needChart = !S.byId[id];  // outside the top 100 we only now know its symbol & price
  modal.detail = d;
  renderModal();
  if (needChart) loadModalChart(true);
}

/** The object used for Binance symbol lookup and the chart. */
function modalCoin() {
  const c = modal.detail || modal.base;
  return S.byId[c.id] || { id: c.id, symbol: c.symbol || '', name: c.name, current_price: c.price };
}

async function loadModalChart(animate) {
  const id = modal.coin, req = ++modal.req;
  const loader = $('.md-canvas .cc-load', modalEl);
  $$('.md-tf button', modalEl).forEach(b => b.classList.toggle('on', b.dataset.tf === modal.tf));
  if (animate) { loader.textContent = 'ACQUIRING SIGNAL…'; loader.hidden = false; }
  if (!modalCoin().symbol) return;  // wait for the dossier
  try {
    const pts = await fetchSeries(modalCoin(), modal.tf);
    if (req !== modal.req || modal.coin !== id) return;
    if (pts.length < 2) throw new Error('no data');
    modal.chart.resize();
    modal.chart.setData(pts, TF[modal.tf].intraday);
    loader.hidden = true;
    updateModalLive();
  } catch {
    if (req !== modal.req) return;
    loader.hidden = false;
    loader.textContent = 'SIGNAL LOST // RATE LIMITED';
  }
}
$('.md-tf', modalEl).addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  modal.tf = b.dataset.tf; store.set('modalTf', modal.tf);
  loadModalChart(true);
});

function updateModalLive() {
  const c = modal.detail || modal.base;
  const L = liveOf(binSym(modalCoin()));
  const price = L ? L.c : c.price;
  const chg = L ? L.chg : c.perf['24H'];
  const pe = $('.md-price', modalEl);
  if (price != null) {
    if (modal.last != null && price !== modal.last) flash(pe, price - modal.last);
    modal.last = price;
    pe.textContent = fmtPrice(price);
    modal.chart.setLive(price);
  }
  const ce = $('.md-chg', modalEl);
  ce.className = 'md-chg badge ' + cls(chg ?? 0);
  ce.textContent = chg == null ? '' : (chg >= 0 ? '▲ ' : '▼ ') + fmtPct(chg) + ' 24H';
  const hi = L ? L.h : c.high, lo = L ? L.l : c.low;
  $('.md-range .rl', modalEl).textContent = fmtPrice(lo);
  $('.md-range .rh', modalEl).textContent = fmtPrice(hi);
  const pos = hi > lo ? Math.max(0, Math.min(100, ((price - lo) / (hi - lo)) * 100)) : 50;
  $('.md-range .rbar i', modalEl).style.left = pos + '%';
}

const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Chart card shown at visual position n (cards can be rearranged by drag & drop). */
const cardAt = n => S.cards.find(c => c.el === $$('#charts > .cc')[n]);
const markSlots = id => $$('.md-slots button', modalEl).forEach(b => b.classList.toggle('on', S.slots[cardAt(+b.dataset.slot)?.i] === id));

function renderModal() {
  const c = { ...modal.base, ...(modal.detail || {}) };
  const img = $('.md-img', modalEl);
  if (c.image) { img.src = c.image; img.style.visibility = ''; } else img.style.visibility = 'hidden';
  $('.md-name', modalEl).textContent = (c.name || '').toUpperCase();
  $('.md-sub', modalEl).innerHTML = `${esc((c.symbol || '').toUpperCase())} / ${CUR.code.toUpperCase()}${c.rank ? ` <span class="md-rank">RANK #${c.rank}</span>` : ''}${binSym(modalCoin()) ? ' <span class="md-live"><i></i>LIVE</span>' : ''}`;
  $('.md-cats', modalEl).innerHTML = (c.cats || []).slice(0, 6).map(x => `<span>${esc(x)}</span>`).join('');

  const stat = (l, v, extra = '') => `<div class="md-stat"><label>${l}</label><b>${v}</b>${extra}</div>`;
  const volRatio = c.vol && c.mcap ? (c.vol / c.mcap) * 100 : null;
  $('.md-stats', modalEl).innerHTML =
    stat('MARKET CAP', fmtBig(c.mcap)) +
    stat('FULLY DILUTED VAL.', fmtBig(c.fdv)) +
    stat('VOLUME 24H', fmtBig(c.vol)) +
    stat('VOL / MCAP', volRatio != null ? fmtNum(volRatio, 2) + '%' : '—') +
    stat('24H HIGH', fmtPrice(c.high)) +
    stat('24H LOW', fmtPrice(c.low)) +
    (c.genesis ? stat('GENESIS', fmtDate(c.genesis)) : '') +
    (c.algo ? stat('ALGORITHM', esc(c.algo)) : '') +
    (c.votes != null ? stat('COMMUNITY SENTIMENT', `<span class="up">${fmtNum(c.votes, 0)}% ▲</span> <span class="down">${fmtNum(100 - c.votes, 0)}% ▼</span>`,
      `<div class="sent"><i style="width:${c.votes}%"></i></div>`) : '');

  const perf = Object.entries(c.perf || {}).filter(([, v]) => v != null);
  $('.md-perf', modalEl).innerHTML = perf.map(([k, v]) =>
    `<div style="background:${heatColor(v)}"><label>${k}</label><b>${fmtPct(v, 1)}</b></div>`).join('');

  const supPct = c.circ && (c.max || c.total) ? (c.circ / (c.max || c.total)) * 100 : null;
  $('.md-supply', modalEl).innerHTML = `<h3>// SUPPLY</h3>
    <div class="md-row"><span>CIRCULATING</span><b>${fmtNum(c.circ)} ${esc((c.symbol || '').toUpperCase())}</b></div>
    <div class="md-row"><span>TOTAL</span><b>${fmtNum(c.total)}</b></div>
    <div class="md-row"><span>MAX</span><b>${c.max ? fmtNum(c.max) : '∞'}</b></div>
    ${supPct != null ? `<div class="pbar"><i style="width:${Math.min(100, supPct)}%"></i></div><div class="md-note">${fmtNum(supPct, 1)}% OF ${c.max ? 'MAX' : 'TOTAL'} SUPPLY IN CIRCULATION</div>` : ''}`;

  $('.md-ath', modalEl).innerHTML = `<h3>// ALL-TIME EXTREMES</h3>
    <div class="md-row"><span>ALL-TIME HIGH</span><b>${fmtPrice(c.ath)}</b></div>
    <div class="md-row"><span>DATE · FROM ATH</span><b>${fmtDate(c.athDate)} · <span class="${cls(c.athChg)}">${fmtPct(c.athChg, 1)}</span></b></div>
    <div class="md-row"><span>ALL-TIME LOW</span><b>${fmtPrice(c.atl)}</b></div>
    <div class="md-row"><span>DATE · FROM ATL</span><b>${fmtDate(c.atlDate)} · <span class="${cls(c.atlChg)}">${fmtPct(c.atlChg, 0)}</span></b></div>`;

  if (modal.detail) {
    const doc = new DOMParser().parseFromString(c.desc || '', 'text/html');
    const paras = (doc.body.textContent || '').split(/\r?\n\s*\r?\n/).map(t => t.trim()).filter(Boolean);
    $('.md-desc', modalEl).innerHTML = paras.length
      ? `<div class="md-desc-text">${paras.slice(0, 6).map(t => `<p>${esc(t)}</p>`).join('')}</div>${paras.join(' ').length > 420 ? '<button class="md-more">READ MORE ▼</button>' : ''}`
      : '<div class="md-note">NO DESCRIPTION ON FILE.</div>';
    const L = c.links || {};
    const links = [
      ['WEBSITE', L.homepage?.[0]], ['WHITEPAPER', L.whitepaper], ['EXPLORER', L.blockchain_site?.find(safeUrl)],
      ['X / TWITTER', L.twitter_screen_name && 'https://x.com/' + L.twitter_screen_name], ['REDDIT', L.subreddit_url],
      ['GITHUB', L.repos_url?.github?.[0]], ['COINGECKO', 'https://www.coingecko.com/en/coins/' + c.id]
    ].filter(([, u]) => safeUrl(u) && !/reddit\.com\/?$/.test(u));
    $('.md-links', modalEl).innerHTML = links.map(([l, u]) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${l} ↗</a>`).join('');
  } else $('.md-links', modalEl).innerHTML = '';

  markSlots(c.id);
  updateModalLive();
}

modalEl.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return closeModal();
  if (e.target.closest('.md-more')) {
    const open = $('.md-desc', modalEl).classList.toggle('open');
    e.target.textContent = open ? 'SHOW LESS ▲' : 'READ MORE ▼';
    return;
  }
  const slot = e.target.closest('[data-slot]');
  if (slot) {
    const card = cardAt(+slot.dataset.slot), id = modal.coin;
    if (!card || (!S.byId[id] && !modal.detail)) return;   // need at least symbol/name before pinning
    if (!S.byId[id]) S.byId[id] = marketFromDetail(modal.detail);
    S.slots[card.i] = id; store.set('slots', S.slots);
    card.last = null;
    loadChart(card, true);
    markSlots(id);
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && modal.coin) closeModal(); });

// Any element carrying data-coin opens the dossier (news tags inside links included).
document.addEventListener('click', e => {
  const el = e.target.closest('[data-coin]');
  if (!el || modalEl.contains(el)) return;
  e.preventDefault();
  openCoin(el.dataset.coin);
});

/* =========================================================
   Currency switch
   ========================================================= */
function markCurrency() {
  $$('#curSwitch button').forEach(b => b.classList.toggle('on', b.dataset.c === CUR.code));
}
async function setCurrency(code) {
  if (CUR.code === code || !CURRENCIES[code]) return;
  CUR = CURRENCIES[code];
  store.set('cur', code);
  markCurrency();
  showWhaleMin();
  whaleBox.innerHTML = '<div class="loading">RECALIBRATING…</div>';
  whaleFirst = true;
  await loadMarkets();
  S.cards.forEach(c => { c.last = null; loadChart(c, true); });
  loadGlobal(); loadTrending(); renderNews(); seedWhales(); loadBtcNet();
  if (modal.coin) openCoin(modal.coin);
}
$('#curSwitch').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setCurrency(b.dataset.c); });
markCurrency();

/* =========================================================
   Init
   ========================================================= */
(async function init() {
  tickClock(); renderSessions();
  setInterval(() => { tickClock(); renderSessions(); tickHalving(); }, 1000);

  buildCards();
  const [ok] = await Promise.all([loadMarkets(), loadBinanceSymbols()]);
  S.cards.forEach(c => loadChart(c, true));
  if (ok) renderTape();
  connectWS();
  seedWhales();
  boot.ready();
  const deep = /coin=([\w-]+)/.exec(location.hash);
  if (deep) openCoin(deep[1]);

  loadGlobal(); loadFng(); loadNews(); loadTrending(); loadBtcNet();

  setInterval(loadMarkets, 90e3);
  setInterval(() => S.cards.forEach(c => loadChart(c, false)), 60e3);
  setInterval(loadGlobal, 180e3);
  setInterval(loadFng, 30 * 60e3);
  setInterval(loadNews, 5 * 60e3);
  setInterval(loadTrending, 10 * 60e3);
  setInterval(loadBtcNet, 60e3);
  setInterval(loadBinanceSymbols, 30 * 60e3);
})();
