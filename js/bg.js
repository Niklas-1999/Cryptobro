/* =========================================================
   Background — perspective neon grid, data rain, particles
   ========================================================= */
(() => {
  const cv = document.getElementById('bg');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr, rain = [], dust = [];
  const GLYPHS = '01₿Ξ◎$¥€ABCDEF0123456789アイウエオカキクケコ';

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.floor(W / 26);
    rain = Array.from({ length: cols }, (_, i) => ({
      x: i * 26 + 8, y: Math.random() * -H, v: 0.6 + Math.random() * 1.8, len: 6 + (Math.random() * 14 | 0),
      on: Math.random() < 0.35, seed: Math.random() * 1000
    }));
    dust = Array.from({ length: Math.round(W * H / 26000) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3,
      vx: (Math.random() - .5) * .15, vy: -Math.random() * .3 - .05, a: Math.random()
    }));
  }

  function grid(t) {
    const horizon = H * 0.62;
    const vx = W / 2;
    // glow at horizon
    const g = ctx.createLinearGradient(0, horizon - 120, 0, horizon + 40);
    g.addColorStop(0, 'rgba(255,0,60,0)');
    g.addColorStop(.8, 'rgba(255,0,60,.10)');
    g.addColorStop(1, 'rgba(255,0,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 120, W, 160);

    // sun ring
    const sr = Math.min(W, H) * 0.16;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
    const sg = ctx.createLinearGradient(0, horizon - sr, 0, horizon);
    sg.addColorStop(0, 'rgba(255,40,80,.18)');
    sg.addColorStop(1, 'rgba(120,0,30,.04)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(vx, horizon, sr, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(5,0,2,.9)';
    for (let i = 0; i < 7; i++) {
      const yy = horizon - sr * 0.08 - i * sr * 0.12 - ((t * 0.01) % (sr * 0.12));
      ctx.fillRect(vx - sr, yy, sr * 2, 2 + i * 0.6);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
    ctx.lineWidth = 1;
    // vertical lines converging at vanishing point
    for (let i = -24; i <= 24; i++) {
      const xb = vx + i * W * 0.09;
      const a = 0.22 - Math.abs(i) * 0.006;
      ctx.strokeStyle = `rgba(255,23,68,${Math.max(a, .04)})`;
      ctx.beginPath(); ctx.moveTo(vx + i * 6, horizon); ctx.lineTo(xb, H); ctx.stroke();
    }
    // horizontal lines moving toward viewer
    const speed = (t * 0.00025) % 1;
    for (let i = 0; i < 22; i++) {
      const z = (i + speed) / 22;
      const y = horizon + Math.pow(z, 2.4) * (H - horizon);
      ctx.strokeStyle = `rgba(255,23,68,${0.05 + z * 0.28})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRain(t) {
    ctx.font = '13px "Share Tech Mono", monospace';
    for (const c of rain) {
      if (!c.on) { if (Math.random() < 0.0008) { c.on = true; c.y = -c.len * 16; } continue; }
      c.y += c.v;
      for (let k = 0; k < c.len; k++) {
        const y = c.y - k * 16;
        if (y < -16 || y > H) continue;
        const a = (1 - k / c.len) * 0.22;
        const ch = GLYPHS[(Math.floor(c.seed + k * 7 + t / 180) % GLYPHS.length + GLYPHS.length) % GLYPHS.length];
        ctx.fillStyle = k === 0 ? `rgba(255,200,210,${a * 2})` : `rgba(255,23,68,${a})`;
        ctx.fillText(ch, c.x, y);
      }
      if (c.y - c.len * 16 > H) { c.on = Math.random() < 0.5; c.y = -Math.random() * H * 0.5; }
    }
  }

  function drawDust() {
    for (const p of dust) {
      p.x += p.vx; p.y += p.vy; p.a += 0.01;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
      const a = 0.25 + Math.sin(p.a) * 0.2;
      ctx.fillStyle = `rgba(255,60,90,${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  let glitchUntil = 0;
  function frame(t) {
    if (!document.hidden) {
      ctx.clearRect(0, 0, W, H);
      grid(t);
      drawRain(t);
      drawDust();
      // occasional horizontal glitch bars
      if (t > glitchUntil && Math.random() < 0.004) glitchUntil = t + 120 + Math.random() * 200;
      if (t < glitchUntil) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(255,23,68,${Math.random() * 0.12})`;
          ctx.fillRect(0, Math.random() * H, W, Math.random() * 6 + 1);
        }
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
