/* =========================================================
   Theme engine — derives the whole palette from one accent color.
   Loaded in <head> so the saved theme applies before first paint.
   ========================================================= */
const Theme = (() => {
  const DEFAULT = '#ff1744';
  // tint factors used by the stylesheet (--kNN = accent scaled toward black)
  const TINTS = { k01: .012, k02: .02, k04: .04, k05: .05, k07: .07, k11: .11, k16: .16, k23: .23, k47: .47, k54: .54, k77: .77 };
  const root = document.documentElement;
  let hex = DEFAULT, rgb = [255, 23, 68], norm = rgb;

  const parse = h => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  // brightest version of the hue: keeps backgrounds tinted even for dark picks
  const normalize = c => { const m = Math.max(...c); return m ? c.map(v => (v * 255) / m) : [128, 128, 128]; };
  const mix = (w, k) => norm.map(v => 255 * w + v * k);      // white * w + accent * k

  function apply(h, save = true) {
    const c = parse(h);
    if (!c) return;
    hex = toHex(c); rgb = c; norm = normalize(c);
    const set = (name, arr) => root.style.setProperty(name, arr.map(Math.round).join(', '));
    set('--acc', rgb);
    for (const [k, f] of Object.entries(TINTS)) set('--' + k, norm.map(v => v * f));
    set('--tx', mix(.85, .15));
    set('--tx-dim', mix(.457, .233));
    set('--tx-mute', mix(.207, .22));
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', toHex(norm.map(v => v * .04)));
    const icon = document.querySelector('link[rel=icon]');
    if (icon) icon.href = 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><polygon points='32,3 58,18 58,46 32,61 6,46 6,18' fill='${toHex(norm.map(v => v * .07))}' stroke='${hex}' stroke-width='4'/><text x='32' y='42' font-family='monospace' font-size='28' font-weight='bold' fill='${hex}' text-anchor='middle'>C</text></svg>`);
    if (save) try { localStorage.setItem('cb:theme', JSON.stringify(hex)); } catch {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: hex }));
  }

  /** n related shades (hue-shifted / darkened) for multi-series bars. */
  function shades(n) {
    const [r, g, b] = rgb.map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    const s = mx ? d / mx : 0;
    const steps = [[0, 1], [0, .72], [28, 1], [44, 1], [0, .5], [-22, 1], [-38, .85], [0, .35], [16, .62]];
    return Array.from({ length: n }, (_, i) => {
      const [dh, v] = steps[i % steps.length];
      const hh = (((h + dh) % 360) + 360) % 360, c = v * Math.max(s, .15), x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = v - c;
      const [rr, gg, bb] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
      return toHex([rr + m, gg + m, bb + m].map(t => t * 255));
    });
  }

  let saved = DEFAULT;
  try { saved = JSON.parse(localStorage.getItem('cb:theme')) || DEFAULT; } catch {}
  apply(saved, false);

  return {
    DEFAULT,
    apply,
    shades,
    get hex() { return hex; },
    /** accent with alpha, for canvas drawing */
    a: alpha => `rgba(${rgb.join(',')},${alpha})`,
    /** accent hue scaled toward black (f = 0..1) */
    tint: (f, alpha = 1) => `rgba(${norm.map(v => Math.round(v * f)).join(',')},${alpha})`,
    /** accent hue mixed toward white (w = 0..1) */
    light: (w, alpha = 1) => `rgba(${norm.map(v => Math.round(255 * w + v * (1 - w))).join(',')},${alpha})`
  };
})();
