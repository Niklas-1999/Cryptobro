# CRYPTOBRO — Project Documentation

> **Purpose of this file:** a complete handover for a new Claude session (or any developer).
> It explains what the dashboard is, how every part of the code works, which decisions were
> made and why, what is known to be imperfect, and the groundwork already discussed for the
> next project: an automated crypto trading bot.
>
> Last updated: 2026-10-04 (trading bot decisions added, see §13.4 and §13.5).

---

## Table of contents

1. [Project at a glance](#1-project-at-a-glance)
2. [The owner and their preferences](#2-the-owner-and-their-preferences)
3. [Project history (summary of the build chat)](#3-project-history-summary-of-the-build-chat)
4. [Repository, branches, deployment](#4-repository-branches-deployment)
5. [File structure and load order](#5-file-structure-and-load-order)
6. [Data sources (APIs)](#6-data-sources-apis)
7. [Code walkthrough, file by file](#7-code-walkthrough-file-by-file)
8. [Feature reference (every panel)](#8-feature-reference-every-panel)
9. [Persistent state and URL options](#9-persistent-state-and-url-options)
10. [Design system](#10-design-system)
11. [Known limitations and planned fixes](#11-known-limitations-and-planned-fixes)
12. [Development and testing workflow](#12-development-and-testing-workflow)
13. [Trading bot: groundwork, decisions, status](#13-trading-bot-groundwork-and-decisions-so-far)

---

## 1. Project at a glance

**CRYPTOBRO // Neural Market Terminal** is a single-page crypto market dashboard with an
ultra-futuristic, cyberpunk look (dark red by default, recolorable). It is **read-only**: the
owner does not trade on it. It collects everything relevant in one place: live prices, charts,
news, sentiment, market structure, large trades and Bitcoin network data.

| | |
|---|---|
| Live site | https://niklas-1999.github.io/Cryptobro/ |
| Repository | https://github.com/Niklas-1999/Cryptobro |
| Local path | `D:\Crypto_dashboard` (Windows 10) |
| Stack | Plain HTML + CSS + vanilla JavaScript. No framework, no build step, no npm dependencies. |
| Hosting | GitHub Pages, serving the `main` branch from the repository root |
| API keys | None. Every data source is free and keyless. |
| External assets | Google Fonts only (Orbitron, Rajdhani, Share Tech Mono) |

---

## 2. The owner and their preferences

- Lives in **Germany**. Wants **euro (€) as the default currency** with a switch to US dollars.
  In € mode numbers use **German formatting** (`75.965,86 €`, `2,59T €`, `+1,25%`).
  Interface text and dates stay in **English**.
- Loves the **cyberpunk / ultra-futuristic aesthetic** with lots of animation. Default theme is
  **dark red**; they asked for a color picker so any accent color is possible.
- Wants the dashboard to be **purely informational**. Nothing on it places trades.
- Works with a **stable `main` branch** and a **`test` branch** for new features. New features
  go to `test` first and are merged into `main` only when the owner approves.
- Is new to crypto market concepts. Asked for plain-language explanations of each panel
  (see [section 8](#8-feature-reference-every-panel)). Explanations should stay understandable
  and must not present anything as financial advice.
- Next goal: explore an **AI-assisted crypto trading bot**
  (see [section 13](#13-trading-bot-groundwork-and-decisions-so-far)).

---

## 3. Project history (summary of the build chat)

In chronological order:

1. **Initial build.** Owner asked for a cyberpunk, dark-red crypto dashboard on GitHub Pages:
   4 selectable price charts at the top, a news feed, plus any other useful features.
   Built: boot sequence, header stats, ticker tape, 4 live charts with a coin picker and
   timeframes, heatmap, Fear & Greed gauge, news, top movers, whale tape, trending, BTC network,
   global market sessions, and a top-100 table. Animated background (perspective grid, data
   rain, particles), scanlines, glitch effects.
2. **API research.** CryptoCompare/CoinDesk news APIs now require keys, so news switched to
   RSS feeds through rss2json. All other sources were verified to send CORS headers
   (`Access-Control-Allow-Origin: *`) so they work directly from the browser.
3. **First deploy.** Pushed to `main`. The owner enabled GitHub Pages manually
   (Settings → Pages → Deploy from branch `main`, folder `/`).
4. **Fixes after screenshots.** Loader overlay not hiding (missing `[hidden]` rule), long tickers
   overflowing heatmap tiles, mobile header overflow, whale tape empty at first (threshold
   lowered from $100K to 50K and the tape is now pre-filled from recent trades).
5. **Feature: € / $ switch** (€ default) and a **coin detail popup** ("dossier") that opens
   when any coin anywhere on the page is clicked.
6. **Explanations.** The owner asked what each panel means and how to use it. Plain-language
   summary in [section 8](#8-feature-reference-every-panel).
7. **Trading bot discussion** (no code). Feasibility, limits, risks and German tax rules.
   See [section 13](#13-trading-bot-groundwork-and-decisions-so-far).
8. **Rate-limit question.** The popup showed "SIGNAL LOST // RATE LIMITED". Explained that
   CoinGecko's free tier was rejecting requests; proposed fixes are **not yet built**
   (see [section 11](#11-known-limitations-and-planned-fixes)).
9. **Test branch + new features.** Created the `test` branch. Added **drag & drop panel
   rearranging** and a **theme color picker** (12 presets + any custom color). Verified with an
   automated browser test, pushed to `test`, previewed through raw.githack.
10. **This documentation**, then `test` merged into `main`.

---

## 4. Repository, branches, deployment

- **`main`** is the stable branch. GitHub Pages deploys it automatically, usually within a minute
  of a push.
- **`test`** is for new features. GitHub Pages cannot serve a second branch, so preview it at:
  `https://raw.githack.com/Niklas-1999/Cryptobro/test/index.html`
  (raw.githack serves files with correct content types; caches for a few minutes).
  Note: browser storage (layout, theme, chart picks) is per origin, so settings on the preview
  URL are separate from the live site.
- **Workflow agreed with the owner:** develop on `test` → owner checks the preview → merge into
  `main` only when asked.
- `.nojekyll` in the root stops GitHub Pages from running Jekyll over the files.
- **Git identity on this machine:** commits are authored as `Niklas <niklas@example.com>` (the
  locally configured identity). The owner was told and has not asked to change it.
- **Pushing:** Git Credential Manager handles GitHub authentication (it may open a browser login).
  The GitHub CLI (`gh`) is **not installed**.

---

## 5. File structure and load order

```
Crypto_dashboard/
├── index.html          Page skeleton: boot overlay, header, all panel shells, footer
├── css/style.css       All styling, animations, responsive rules, theme variables
├── js/theme.js         Theme engine (loaded in <head>, runs before first paint)
├── js/util.js          Helpers: DOM, storage, currency formatting, fetch, tooltip, colors
├── js/bg.js            Animated full-screen background canvas
├── js/chart.js         NeonChart: custom animated canvas line/area chart
├── js/app.js           Everything data-related: APIs, panels, live stream, popup, currency
├── js/layout.js        Drag & drop rearranging + the theme/config popover
├── README.md           Short public description
├── DOCUMENTATION.md    This file
├── CLAUDE.md           Short orientation for Claude sessions (auto-loaded by Claude Code)
└── .nojekyll
```

**Load order matters.** These are plain scripts that share globals; there are no modules:

1. `theme.js` in `<head>`, so the saved accent color applies before anything renders.
2. At the end of `<body>`: `util.js` → `bg.js` → `chart.js` → `app.js` → `layout.js`.
   - `util.js` defines `$`, `$$`, `store`, `CUR`, the formatters, `fetchJSON`, `tip`, etc.
   - `app.js` runs `init()` immediately. The synchronous part (`buildCards()`) creates the chart
     cards before `layout.js` runs, so `layout.js` can restore the saved card order.
   - `layout.js` expects `closePicker` and `tip` from earlier scripts.

---

## 6. Data sources (APIs)

All are called **directly from the browser** (CORS-enabled, no keys). The base URLs are
constants at the top of `js/app.js`.

| Source | Used for | Endpoints | Refresh | Limits / notes |
|---|---|---|---|---|
| **Binance REST** (`api.binance.com`, fallback `data-api.binance.vision`) | Symbol list and prices, chart candles, recent trades, polling fallback | `/api/v3/ticker/price`, `/api/v3/klines`, `/api/v3/aggTrades`, `/api/v3/ticker/24hr?type=MINI&symbols=[...]` | Symbols every 30 min; charts every 60 s | Generous limits. Prices are in **USDT**. The two hosts are tried in order; the one that works is remembered. |
| **Binance WebSocket** (`stream.binance.com:9443`, fallback `data-stream.binance.vision`) | Live prices of all USDT pairs (~1/s), live trades for 6 coins | Combined stream: `!miniTicker@arr` + `<sym>@aggTrade` for BTC, ETH, SOL, XRP, BNB, DOGE | Push | Reconnects with backoff and switches host every 2nd failure. Watchdog closes the socket after 20 s of silence. While disconnected, REST polling every 10 s. |
| **CoinGecko** (`api.coingecko.com/api/v3`) | Top-100 market data, global stats, trending, coin details, chart fallback | `/coins/markets` (with 7d sparkline and 1h/24h/7d changes), `/global`, `/search/trending`, `/coins/{id}`, `/coins/{id}/market_chart` | Markets 90 s, global 3 min, trending 10 min, details on demand (5-min cache) | **Free tier is strict: roughly 5–30 calls/min**, HTTP 429 when exceeded. Data is fetched directly in the display currency (`vs_currency=eur` or `usd`). |
| **alternative.me** | Fear & Greed index (31 days) | `https://api.alternative.me/fng/?limit=31` | 30 min | Updates once per day. |
| **mempool.space** | Bitcoin block height, fees, difficulty adjustment, hashrate | `/api/blocks/tip/height`, `/api/v1/fees/recommended`, `/api/v1/difficulty-adjustment`, `/api/v1/mining/hashrate/3d` | 60 s | No key. |
| **rss2json** | News (converts RSS to JSON with CORS) | `api.rss2json.com/v1/api.json?rss_url=` + feed URL | 5 min | Free tier: ~10 items per feed, daily cap. |

**News feeds:** Cointelegraph (`cointelegraph.com/rss`), CoinDesk
(`coindesk.com/arc/outboundfeeds/rss/`), Decrypt (`decrypt.co/feed`), Bitcoin Magazine
(`bitcoinmagazine.com/.rss/full/`). rss2json `pubDate` is UTC in the form
`YYYY-MM-DD HH:MM:SS`; it is parsed by appending `Z`.

**Rejected sources:** CryptoCompare / CoinDesk data API (now requires an API key).

---

## 7. Code walkthrough, file by file

### 7.1 `js/theme.js` — theme engine

- Exposes a global `Theme` object. The whole palette is derived from **one accent color**
  (default `#ff1744`, crimson).
- `Theme.apply(hex)` writes CSS custom properties on `<html>` as **RGB triplets** (e.g.
  `--acc: 255, 23, 68`) so CSS can use them with any alpha: `rgba(var(--acc), .3)`.
  - `--acc` is the exact chosen color.
  - `--k01` … `--k77` are the hue "normalized" (brightest channel scaled to 255), then multiplied
    toward black by the factor in the name (0.012 … 0.77). These are all dark backgrounds,
    borders and dim accents. Normalizing keeps backgrounds tinted even when a dark color is
    picked.
  - `--tx`, `--tx-dim`, `--tx-mute` are text colors (mixes of white and the accent).
  - It also updates `<meta name="theme-color">` and redraws the SVG favicon in the accent color.
  - It saves to `localStorage` key `cb:theme` and fires a `themechange` window event.
- Helpers for canvas code (which cannot read CSS variables cheaply):
  `Theme.a(alpha)` (accent), `Theme.tint(f, alpha)` (toward black),
  `Theme.light(w, alpha)` (toward white), `Theme.shades(n)` (hue-shifted shades, used for the
  dominance bar), `Theme.hex`, `Theme.DEFAULT`.

### 7.2 `js/util.js` — shared helpers

- `$(sel, root)`, `$$(sel, root)`: query helpers (`$$` returns an array).
- `store.get(key, default)` / `store.set(key, value)`: JSON `localStorage` wrapper. All keys are
  prefixed with `cb:`.
- `esc(s)`: HTML-escape. **Used for all API-provided text** inserted via `innerHTML`.
- **Currency:** `CURRENCIES = { eur: {loc: 'de-DE', sym: '€', suffix: true}, usd: {loc: 'en-US',
  sym: '$', suffix: false} }`. `CUR` is the active one (a mutable global, from `cb:cur`,
  default `eur`).
- Formatters (all locale-aware through `CUR.loc`):
  - `fmtPrice(v, bare)`: adaptive decimals (2 for ≥ 100, 3 for ≥ 1, 4 for ≥ 0.01, otherwise
    significant digits). `bare = true` omits the symbol (used on chart axes).
  - `fmtBig(v, sym = true)`: compact K/M/B/T.
  - `fmtNum(v, d)`: a plain number. `fmtPct(v, d)`: signed percentage.
  - `cls(v)` returns `'up'` or `'down'` for coloring. `timeAgo(ts)`.
- `fetchJSON(url, {timeout, retries})`: fetch with an abort timeout and simple retry.
- `countTo(el, to, fmt, ms)`: animated number count-up. `flash(el, dir)`: green/red flash.
- `tip`: a shared floating tooltip (`tip.show(html, x, y)`, `tip.hide()`).
- `heatColor(pct)`: red ↔ green by % change (saturates at ±8%). **Deliberately not themed.**
- `STABLES` + `isStable(c)`: excludes stablecoins (and gold tokens) from the heatmap, tape,
  movers and news tags.

### 7.3 `js/bg.js` — animated background

A full-screen fixed `<canvas id="bg">` behind everything, drawn every frame (paused when the tab
is hidden). Layers:

1. Synthwave perspective grid below a horizon at 62% height, lines scrolling toward the viewer.
2. A striped "sun" half-disc on the horizon.
3. "Data rain": columns of glyphs (`01₿Ξ◎$¥€`, hex digits, katakana).
4. Drifting particles.
5. Occasional horizontal glitch bars.

Colors come from `Theme.*` each frame, so the theme changes live. With
`prefers-reduced-motion`, only a single frame is drawn.

### 7.4 `js/chart.js` — `NeonChart`

A custom canvas chart, chosen over a library for full control of the neon look.

- `new NeonChart(hostElement)` creates a canvas, a `ResizeObserver`, an
  `IntersectionObserver` (it only draws when visible) and mouse handlers.
- `setData(points, intraday)`: `points` are `[{t: ms, p: price}]`. Starts an 1.1 s **draw-in
  animation** with a scan-head line.
- `setLive(price)`: sets the target price of the last point; the drawn value eases toward it each
  frame (smooth live ticking).
- Draws: dashed grid with price labels on the right; area gradient and a glowing line (green
  if the period is up, red if down); H/L markers; a dashed last-price line with a tag; a
  pulsing dot; a crosshair with a tooltip (time, price, Δ over the period).
- A single global `requestAnimationFrame` loop draws all instances (`NeonChart.all`).
- **Note:** instances are never destroyed. The popup reuses one instance for that reason.

### 7.5 `js/app.js` — data and UI (the main file)

**Constants and state** at the top: API bases, `FEEDS`, `WHALE_SYMS`,
`WHALE_MIN = 50_000`, `WHALE_MEGA = 500_000` (in display currency), the timeframe table
`TF`, `DEFAULT_COINS` (fallback if CoinGecko is down), and the state object `S`:

```
S.markets      CoinGecko top-100 array (in display currency)
S.byId         id -> market object;   S.symToId: 'BTC' -> 'bitcoin'
S.binPrices    'BTCUSDT' -> last REST price in USDT (also validates symbol mapping)
S.live         'BTCUSDT' -> {c,o,h,l,q} raw USDT values from the WebSocket
S.slots/S.tfs  coin id and timeframe per chart card (persisted)
S.cards        [{i, el, chart, req, last}] chart card objects
S.flow         recent trades for the 60-second order-flow bar
```

**Timeframes (`TF`)**

| Button | Binance interval × limit | CoinGecko fallback |
|---|---|---|
| 1H | 1m × 60 | 1 day, filtered to the last ~1.5 h |
| 24H | 15m × 96 | 1 day |
| 7D | 1h × 168 | 7 days |
| 30D | 4h × 180 | 30 days |
| 1Y | 1d × 365 | 365 days |

**Key mechanisms**

- **Binance symbol mapping, `binSym(coin)`:** CoinGecko id → `SYMBOL + 'USDT'`, accepted only
  if that Binance pair exists **and** its price (converted to the display currency) is within 8%
  of CoinGecko's price. This prevents ticker collisions (different coins sharing a symbol). If
  there is no match, the coin uses CoinGecko for its chart and has no live ticking.
- **Currency conversion:** CoinGecko data is requested directly in € or $. Binance quotes in
  USDT, so `rate()` returns the live `EURUSDT` price (USDT per €) in € mode, or 1 in $ mode.
  `liveOf(sym)` returns the live ticker divided by that rate. `fetchSeries()` also fetches
  `EURUSDT` candles with the same interval and converts **each candle with its own historical
  rate**, so long timeframes stay accurate. If `EURUSDT` is unavailable, the 8% sanity check
  fails and everything falls back to CoinGecko automatically.
- **`fetchSeries(coin, tfKey)`:** the single source of chart data for both the cards and the
  popup (Binance klines if mapped, otherwise CoinGecko `market_chart`).
- **Live stream:** `connectWS()` → `onTickers()` updates the cards, tape, table and the tab
  title (`BTC 75.965,86 € // CRYPTOBRO`), plus the popup if it is open. `onTrade()` feeds the
  whale tape and the order-flow aggregation. `seedWhales()` pre-fills the tape from the last
  1000 aggTrades of BTC/ETH/SOL.
- **Heatmap:** a squarified treemap (`squarify()`) of the top 30 non-stable coins. Area is
  `market_cap ^ 0.62` (compressed so BTC does not swallow everything). Positions are in %, and it
  re-renders on resize.
- **News tags, `newsTags(title)`:** matches top-40 coin names (case-insensitive) or symbols with
  3+ characters (case-sensitive, whole word) in headlines; at most 3 tags per headline.
- **Sessions:** NYSE/NASDAQ, LSE, XETRA, TSE, HKEX, ASX. Uses `Intl.DateTimeFormat` with each
  exchange's time zone; computes open/closed and a countdown to open or close. Holidays are
  not handled.
- **Coin popup ("dossier"):**
  - Any element with a `data-coin="<coingecko id>"` attribute opens it, through one delegated
    click listener on `document`. That covers the tape, heatmap, movers, trending, table rows,
    news tags, whale-tape symbols and each chart card's INFO button.
  - `openCoin(id)` renders immediately from the market data (`normMarket`), then fetches
    `/coins/{id}` (`normDetail`, cached 5 min per id + currency) for the description, links,
    categories, 14D–1Y performance, genesis date, algorithm and sentiment votes.
  - Coins outside the top 100 (e.g. from Trending) work too; their chart loads after the detail
    request reveals the symbol.
  - "Show in chart slot 1–4" maps to the **visual** order of the cards (`cardAt(n)`), because
    cards can be rearranged.
  - Descriptions are converted to plain text via `DOMParser` and escaped. Links must pass the
    `safeUrl()` check (http/https only).
- **Currency switch, `setCurrency(code)`:** stores the choice, reloads markets, charts, global
  stats, trending and BTC data, re-renders the news, re-seeds the whale tape, and re-opens the
  popup.
- **Boot sequence:** a typed log with a progress bar. It ends when the log finishes **and** the
  market data is loaded, after 6 s at the latest, or on click.

### 7.6 `js/layout.js` — drag & drop + config popover

- **Zones:** `#charts` (the 4 cards, keyed `chart0`–`chart3`) and `.grid` (panels keyed by
  their `p-*` class, e.g. `p-fng`). Panels move only within their own zone.
- A grip button (`.grip`, 6 dots) is injected into each panel header (`.ph`) and each card top
  (`.cc-top`).
- **Dragging:** custom pointer events (works with mouse and touch; `touch-action: none` on the
  grip).
  - On grab, a striped `.drop-slot` placeholder is inserted with the panel's span classes and
    height. The panel becomes `position: fixed` and follows the pointer, tilting slightly with
    its velocity.
  - `elementFromPoint` finds the panel under the pointer. Wide panels (more than 60% of the zone
    width) split top/bottom; others split left/right.
  - Siblings slide into place with a **FLIP animation** (Web Animations API).
  - The page auto-scrolls near the top and bottom edges.
  - On drop, the panel animates into the slot. The new order is saved to `cb:layoutCharts` /
    `cb:layoutGrid`.
- On load, the saved orders are restored. Default orders are captured first for "Reset layout".
- **Config popover** (opened by the glowing dot `#themeBtn` in the header): 12 presets
  (Crimson, Blood, Solar, Amber, Gold, Toxic, Matrix, Cyan, Ice, Ultraviolet, Neon Pink, Ghost),
  a native color input, a hex text field (applies live), and **Reset layout** / **Reset color**.

### 7.7 `css/style.css`

- `:root` holds the theme triplets (defaults matching crimson, overwritten by `theme.js`) and
  semantic variables built from them: `--red`, `--red-dim`, `--red-deep`, `--crimson`,
  `--line`, `--line2`, `--glow`, `--panel`, `--txt*`, `--bg*`.
  **The variables keep the `--red` name for history, but they now mean "accent".**
- **Fixed, deliberately un-themed colors:** `--up` `#00ff9c`, `--down` `#ff2a4d`, `--amber`,
  `--cyan`, the glitch colors (cyan/magenta), the Fear & Greed gradient and the heatmap
  red/green. They carry meaning.
- Panels: `clip-path` with cut corners, neon corner brackets and diagonals drawn with gradients
  in `::before`, a scanning line under each header, and a staggered `panelIn` entry animation.
- Layout: a 12-column CSS grid with `grid-auto-flow: row dense`. Breakpoints at 1500 px (2 chart
  columns), 1250 px (header wraps, panels at half width) and 860 px (single column, stacked
  header, full-screen popup). `prefers-reduced-motion` is respected.
- Global rule: `[hidden] { display: none !important; }` (toggle visibility with `el.hidden`).

---

## 8. Feature reference (every panel)

Plain-language meaning, as explained to the owner. None of this is financial advice.

| Panel | What it shows | How to read / use it |
|---|---|---|
| **Header stats** | Total market cap (+24h change), 24h volume, BTC/ETH dominance, Fear & Greed, active coins; the dominance bar underneath | Rising BTC dominance means money is moving into Bitcoin (caution or early rally). Falling BTC dominance in a rising market means money is flowing into altcoins ("alt season", high risk appetite). |
| **Ticker tape** | Top 30 coins, live price and 24h % | Hover pauses it; click a coin for its popup. |
| **4 chart cards** | Chosen coins (click the name to change), 1H–1Y, live price, 24h badge, period badge, 24h high/low, volume, market cap | The chart line is green when the period is up, red when down. H/L markers show the period's high and low. |
| **01 Market heatmap** | Top 30 by market cap, colored by 24h change | Shows at a glance whether the market moves together or is mixed. |
| **02 Fear & Greed** | 0–100 sentiment score: 0–24 extreme fear, 25–44 fear, 45–55 neutral, 56–75 greed, 76–100 extreme greed; plus history | Mainly a **contrarian** indicator: extreme fear has often been a buying opportunity, extreme greed often means overheated. It is a mood gauge, not a timing tool, and updates once a day. |
| **03 News feed** | Four sources merged, newest first; coin tags with 24h %; "NEW" for items under 1 hour old | Explains *why* things move. Tags open the coin popup. |
| **04 Top movers** | 10 biggest 24h gainers and losers in the top 100 (no stablecoins) | Find out why something moves; look for sector patterns. Chasing yesterday's top gainer is a classic mistake. |
| **05 Whale tape** | Live Binance trades ≥ 50K (BTC, ETH, SOL, XRP, BNB, DOGE); 🐋 for ≥ 500K; the order-flow bar shows aggressive buy vs. sell volume over 60 s (all trades) | BUY means an aggressive buyer, SELL an aggressive seller. Very short-term (seconds to minutes), one exchange only. |
| **06 Trending signal** | Most-searched coins on CoinGecko in 24 h, with rank and 24h % | Measures **attention**, not quality. Small coins trending with huge gains are usually hype or pump-and-dump. A list full of memecoins signals a speculative market. |
| **07 BTC network** | Block height; hashrate (EH/s); halving countdown (next at block 1,050,000, about spring 2028); difficulty adjustment estimate and progress; fees in sat/vB (fast / 30 min / 1 h / economy) | A rising hashrate signals miner confidence. Historically, bull runs followed in the 12–18 months after halvings (not guaranteed). High fees mean heavy network demand; check fees before moving BTC. |
| **08 Global sessions** | Stock exchanges open/closed with countdowns | Crypto trades 24/7, but volatility often picks up when NY opens (15:30 German time). |
| **09 Market matrix** | Top 100: price (live), 1h/24h/7d, market cap, volume, 7-day sparkline; sortable | Click a header to sort; click a row for the popup. |
| **Coin popup** | Live price, own chart, market cap, FDV, volume, vol/mcap, 24h range slider, performance 1H–1Y, supply (circulating/total/max), ATH/ATL with dates, sentiment, categories, description, links, "show in slot" buttons | Opened from any coin. Close with ✕, Esc or a click outside. |

---

## 9. Persistent state and URL options

**`localStorage` keys** (all prefixed `cb:`; per browser and per origin):

| Key | Content |
|---|---|
| `cb:slots` | Coin ids of the 4 chart cards (by card index, not visual position) |
| `cb:tfs` | Timeframe per card |
| `cb:cur` | `"eur"` or `"usd"` |
| `cb:theme` | Accent hex color |
| `cb:modalTf` | Last timeframe used in the popup |
| `cb:layoutCharts` | Visual order of the cards, e.g. `["chart1","chart2","chart0","chart3"]` |
| `cb:layoutGrid` | Visual order of the grid panels, e.g. `["p-fng","p-heat",...]` |

**URL hash options:**

- `#skipboot` skips the boot animation (used for testing and screenshots).
- `#coin=<coingecko-id>` opens that coin's popup on load, e.g. `#coin=solana`.
- Both combine: `#skipboot&coin=bitcoin`.

---

## 10. Design system

- **Fonts:** Orbitron (headings, logo, clock), Share Tech Mono (all numbers and labels),
  Rajdhani (body text, news headlines).
- **Panel header pattern:** `[grip] [NN badge] PANEL_NAME ........ META TEXT`. Names use
  UPPER_SNAKE with a technical suffix (e.g. `FEAR_GREED.IDX`). Every panel has a 2-digit id
  badge.
- **Effects:** glitch text (logo), CRT scanlines, vignette, a sweeping scan band, neon glows,
  flashing prices on ticks, staggered entry animations, the boot sequence, count-up numbers.
- **Voice / copy:** cyberpunk terminal flavor ("ACQUIRING SIGNAL…", "DECRYPTING DOSSIER…",
  "UPLINK ESTABLISHED. WELCOME BACK, CHOOM."), always in English.
- **Up / down** are always green `#00ff9c` / red `#ff2a4d`, regardless of the theme.

---

## 11. Known limitations and planned fixes

1. **CoinGecko rate limits (most noticeable).** Clicking through many coins or timeframes quickly
   can exceed the free tier. The popup chart then shows "SIGNAL LOST // RATE LIMITED" (this text
   appears for **any** chart-loading failure, so it can be misleading), and the description shows
   "DOSSIER UNAVAILABLE". There is no automatic retry.
   **Proposed but not built (owner was offered these):**
   - auto-retry with a visible countdown
   - caching chart series per coin + timeframe
   - pausing background CoinGecko polling while rate-limited
   - precise error messages (rate limit / network / no data)
2. Market sessions ignore public holidays.
3. Whale thresholds are fixed (50K / 500K in display currency) and only cover 6 Binance pairs.
4. `NeonChart` instances are never destroyed (fine with the current fixed number of charts).
5. The page is animation-heavy (background canvas plus up to 5 charts at 60 fps plus backdrop
   blur). Fine on normal hardware; headless/software rendering is very slow.
6. The Binance mapping relies on the symbol + 8% price check. Coins not listed on Binance have no
   live ticking (their CoinGecko price updates every 90 s).
7. rss2json's free tier caps items and daily requests.

---

## 12. Development and testing workflow

**Environment:** Windows 10, Git Bash and PowerShell, Python 3.10, Node 24, Microsoft Edge
(no Chrome). The working directory is `D:\Crypto_dashboard`.

- **Run locally:** `python -m http.server 8765` in the project folder, then open
  `http://localhost:8765/#skipboot`.
- **Syntax check:** `node --check js/app.js` (works for all the plain scripts).
- **Screenshots:** headless Edge:
  `msedge.exe --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080
  --virtual-time-budget=15000 --user-data-dir=<fresh dir> --screenshot=<file.png> <url>`.
  Use a **fresh `--user-data-dir`** each time, or the CSS/JS may be cached.
- **Interactive tests (drag & drop, clicks):** a Node script that starts headless Edge with
  `--remote-debugging-port`, connects to the page target over the DevTools protocol (Node's
  built-in `WebSocket`), sends `Input.dispatchMouseEvent`, reads state with `Runtime.evaluate`,
  and captures screenshots with `Page.captureScreenshot`. Rendering is slow in headless mode, so
  use few mouse-move steps. **Kill leftover headless Edge processes** afterwards (filter by
  `--remote-debugging-port` in the command line), or the next run cannot open the port.
- **Shell quirk:** some long multi-line heredocs in the Bash tool failed with "unexpected EOF".
  It is more reliable to write scripts and patches to a scratch file and run them.
- **Line endings:** Git converts LF to CRLF on Windows (harmless warnings).

---

## 13. Trading bot: groundwork and decisions so far

The owner wants to explore an **AI-assisted crypto trading bot** in a new chat. This is what was
discussed and agreed (no bot code exists yet).

### 13.1 Feasibility and reality check

- **Automation is easy.** Exchange APIs (Binance, Kraken, Bitvavo, …) allow placing orders.
  A bot can react within milliseconds to the same feeds the dashboard uses.
- **An LLM is not a fast trader.** One LLM call takes about 1–10 s, versus microseconds for
  professional firms. LLMs are good at **reading and summarizing** (news, sentiment, context),
  not at predicting prices. Calling an LLM on every tick is also expensive.
- **The edge problem.** Everything on the dashboard is public data that millions of traders and
  bots already see. Simple public-signal rules are usually already "priced in". Most retail bots
  lose money, mainly from **fees and slippage** (~0.1%+ per trade), **overfitting** to past data,
  and **regime changes** (bull vs. bear market).

### 13.2 Recommended architecture

1. **A rules-based core** that makes the actual trading decisions with clear, testable logic
   (e.g. trend-following, rebalancing, DCA that increases buys in extreme fear).
2. **AI as advisor or filter, not the trigger.** For example, an LLM reads the news every
   ~15 minutes and can flag "major negative event → pause buying".
3. **Hard risk limits in plain code that the AI cannot override:** max position size, max daily
   loss, max number of trades, a kill switch.
4. **Staged rollout:** backtest on historical data → **paper trading** (virtual money, live
   prices) for weeks → only then small real amounts.

### 13.3 Practical constraints

- The bot **cannot run on GitHub Pages**. It needs a 24/7 server (a small VPS at about €5/month,
  or a Raspberry Pi). It should live in a **separate repo/folder** (e.g. `Cryptobro-bot`),
  because it handles secrets.
- **API key safety:** trading permission only, **withdrawals disabled**, IP-whitelisted to the
  server. Keys go in environment variables or a secrets file outside git, **never** in a public
  site or a commit.
- **German tax rules (as discussed; verify current law or ask a tax advisor):**
  - Crypto sold within **one year** of buying is taxable as a private sale (§23 EStG).
  - Gains are tax-free only while total short-term gains stay **under €1,000 per year**
    (Freigrenze since 2024; exceeding it makes the whole amount taxable).
  - Holding **longer than one year** is tax-free.
  - A high-frequency bot creates many taxable events; tools like CoinTracking or Blockpit help
    with reporting.
- Exchange availability for German residents should be checked (e.g. Binance, Kraken, Bitvavo,
  Bitpanda).

### 13.4 Decisions (second planning chat, 2026-10-04)

- **Goal:** option C (eventually real profit), but for now purely an experiment to learn about
  AI agents and trading bots. No profit expected yet. Taxes are dealt with after the
  experimental phase (the bot logs every trade to `data/trades.csv` anyway).
- **Approach:** no fixed strategy. Once a day an AI reads a market brief and decides a target
  portfolio. Because Claude's training data covers past prices, backtesting an LLM is
  meaningless; **forward paper trading against simple benchmark bots** is the test.
- **Principle: "the AI proposes, code disposes."** Hard risk limits in code; the AI never sees
  keys or places orders.
- **Capital:** €100 (virtual now, real later). Universe: top 20 coins with a Kraken EUR pair
  (stablecoins, exchange tokens and privacy coins excluded); the AI holds a few of them.
- **AI:** headless Claude Code (`claude -p`) on the owner's **Claude Pro** plan, so no extra
  cost. (Anthropic announced and then paused moving `claude -p` to a separate monthly credit;
  the API, at a few € per month, is the fallback.)
- **Hosting:** the owner's PC for now (Windows scheduled task: at logon + hourly, at most one
  run per day). A Hetzner VPS later.
- **Exchange:** Kraken recommended (MiCA license via Ireland, EUR pairs, mature API, official
  ccxt/Freqtrade support). Bitvavo is cheaper but less mature for bots. No account needed
  until live trading.
- **Reporting:** a markdown file per day, plus a Cryptobro dashboard panel later. The owner does
  **not** use Telegram.
- **Costs:** ~€0 until the owner is confident in the paper results.
- The owner asked for a security walkthrough (API keys, server) before going live.

### 13.5 Status: `Cryptobro-bot` (built 2026-10-04)

- Local repo `D:\Cryptobro-bot` (Python 3.10, standard library only). Its own `README.md` and
  `CLAUDE.md` describe it. Not yet on GitHub (it should be a **private** repo).
- Paper trading started 2026-10-04 with €100 for the AI plus three benchmarks
  (`HODL_BTC`, `HODL_TOP10`, `TREND_BTC`).
- `data/status.json` is written each day for a future **bot panel** on the dashboard. Open
  question: how the static GitHub Pages site gets that data (e.g. published to a branch, or a
  local-only view).

### 13.6 Reusable pieces from the dashboard

- Binance REST + WebSocket handling with host fallback and reconnect: `binance()`,
  `connectWS()`, `scheduleWS()`, the watchdog, `pollTickers()`.
- USDT → EUR conversion with historical per-candle rates: `rate()`, `liveOf()`,
  `fetchSeries()`.
- CoinGecko ↔ Binance symbol mapping with a sanity check: `binSym()`.
- Order-flow aggregation (aggressive buy vs. sell): `onTrade()` + the 60 s window.
- Sentiment inputs: Fear & Greed (alternative.me), trending (CoinGecko), news (rss2json feeds).

**Important:** this code is written for the browser. A server bot would most likely be written
in Python or Node.js; the logic transfers, but not the files as-is.
