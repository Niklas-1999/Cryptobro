# CRYPTOBRO — orientation for Claude

Cyberpunk crypto market dashboard (read-only, no trading). Plain HTML/CSS/vanilla JS, no build
step, no API keys. **Read `DOCUMENTATION.md` for full details** (architecture, APIs, every
mechanism, known limitations, trading-bot groundwork).

## Key facts
- Live: https://niklas-1999.github.io/Cryptobro/ (GitHub Pages serves `main`, repo root)
- Repo: https://github.com/Niklas-1999/Cryptobro. `gh` CLI is not installed; pushes go through
  Git Credential Manager.
- Scripts share globals; load order matters: `theme.js` (head) → `util.js` → `bg.js` →
  `chart.js` → `app.js` → `layout.js`.
- Data: Binance REST + WebSocket (USDT, converted to € via EURUSDT), CoinGecko (strict free rate
  limit!), alternative.me, mempool.space, rss2json.

## Owner's rules and preferences
- **Branch workflow:** new features go to the `test` branch first (preview:
  https://raw.githack.com/Niklas-1999/Cryptobro/test/index.html). Merge into `main` only when
  the owner asks. Keep `main` stable.
- **€ is the default currency** with German number formatting; interface text and dates stay
  English.
- Keep the cyberpunk aesthetic (animations, glow, terminal-style copy). The accent color is
  themeable: use the CSS variables (`--red` = accent, `rgba(var(--acc), a)`) and the `Theme.*`
  helpers in canvas code. Never hard-code the accent red. Up/down green/red stay fixed.
- Explain market concepts in plain language; never present anything as financial advice.
- Test changes in a real (headless Edge) browser before pushing; see `DOCUMENTATION.md` §12.

## Sister project: the trading bot
An AI-assisted paper-trading bot lives in a **separate repo** at `D:\Cryptobro-bot` (its own
README/CLAUDE.md). Decisions and status: `DOCUMENTATION.md` §13.4 and §13.5.
