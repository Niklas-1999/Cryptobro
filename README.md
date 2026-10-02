# CRYPTOBRO // Neural Market Terminal

A cyberpunk, dark-red crypto market dashboard — one page with everything at a glance. Pure HTML/CSS/JS, no build step, no API keys.

**Live:** https://niklas-1999.github.io/Cryptobro/

## Features
- **€ / $ switch** — euro by default (German number format), toggle in the top-right
- **Coin dossier** — click any coin anywhere (charts, ticker, heatmap, movers, trending, table, news tags, whale tape) for a popup with chart, stats, performance, supply, ATH/ATL, description and links. Deep link: `#coin=solana`
- **4 live price charts** — pick any top-100 coin per slot (click the coin name), timeframes 1H / 24H / 7D / 30D / 1Y. Selections are remembered.
- **Live prices** streamed via Binance WebSocket (ticker tape, charts, table flash on every tick)
- **Global stats** — total market cap, 24h volume, BTC/ETH dominance, dominance bar
- **Market heatmap** — top 30 coins, colored by 24h change
- **Fear & Greed index** — animated gauge + 30-day history
- **News feed** — Cointelegraph, CoinDesk, Decrypt, Bitcoin Magazine, with coin tags on headlines
- **Top movers** — 24h gainers & losers in the top 100
- **Whale tape** — live large trades (≥ $50K) on BTC/ETH/SOL/XRP/BNB/DOGE + 60s buy/sell order flow
- **Trending coins** — most searched on CoinGecko
- **BTC network** — block height, hashrate, halving countdown, difficulty adjustment, mempool fees
- **Global sessions** — NYSE, LSE, XETRA, TSE, HKEX, ASX open/closed with countdowns
- **Market matrix** — sortable top-100 table with 7-day sparklines

## Data sources (all free, keyless)
Binance · CoinGecko · alternative.me · mempool.space · rss2json (news RSS)

## Run locally
Any static server works, e.g. `python -m http.server` and open http://localhost:8000.
Append `#skipboot` to the URL to skip the boot animation.

*Not financial advice.*
