/* =========================================================
   NeonChart — lightweight animated canvas line/area chart
   ========================================================= */
class NeonChart {
  constructor(host) {
    this.host = host;
    this.cv = document.createElement('canvas');
    host.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.data = [];          // [{t, p}]
    this.anim = 1;           // draw-in progress 0..1
    this.animStart = 0;
    this.live = null;        // smoothed display value of the last point
    this.target = null;
    this.hover = null;
    this.intraday = true;
    this.visible = true;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(host);
    this.cv.addEventListener('mousemove', e => {
      const r = this.cv.getBoundingClientRect();
      this.hover = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
    });
    this.cv.addEventListener('mouseleave', () => { this.hover = null; tip.hide(); });
    NeonChart.all.push(this);
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = Math.max(10, r.width); this.H = Math.max(10, r.height);
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setData(points, intraday) {
    this.data = points;
    this.intraday = intraday;
    this.anim = 0;
    this.animStart = performance.now();
    const last = points[points.length - 1];
    this.live = this.target = last ? last.p : null;
  }

  /** Push a live price into the last point (smoothly animated). */
  setLive(price) {
    if (!this.data.length || !price) return;
    this.target = price;
  }

  get color() {
    if (this.data.length < 2) return '#ff1744';
    return (this.live ?? this.data[this.data.length - 1].p) >= this.data[0].p ? '#00ff9c' : '#ff2a4d';
  }

  rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  fmtTime(t, full) {
    const d = new Date(t);
    if (this.intraday && !full) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const ds = d.toLocaleDateString([], { month: 'short', day: '2-digit' });
    return full ? ds + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ds;
  }

  draw(now) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    const d = this.data;
    if (d.length < 2) return;

    // ease live value toward target
    if (this.target != null) {
      this.live += (this.target - this.live) * 0.12;
      d[d.length - 1] = { t: d[d.length - 1].t, p: this.live };
    }
    if (this.anim < 1) this.anim = Math.min(1, (now - this.animStart) / 1100);
    const ease = 1 - Math.pow(1 - this.anim, 3);

    const padL = 4, padR = 62, padT = 12, padB = 18;
    const w = W - padL - padR, h = H - padT - padB;
    let min = Infinity, max = -Infinity, iMin = 0, iMax = 0;
    d.forEach((pt, i) => { if (pt.p < min) { min = pt.p; iMin = i; } if (pt.p > max) { max = pt.p; iMax = i; } });
    const span = (max - min) || max * 0.01 || 1;
    const lo = min - span * 0.1, hi = max + span * 0.12;
    const t0 = d[0].t, t1 = d[d.length - 1].t;
    const X = t => padL + ((t - t0) / ((t1 - t0) || 1)) * w;
    const Y = p => padT + (1 - (p - lo) / (hi - lo)) * h;
    const col = this.color;

    // grid
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (h * i) / 4;
      ctx.strokeStyle = 'rgba(255,23,68,.09)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,190,200,.45)';
      ctx.textAlign = 'left';
      ctx.fillText(fmtPrice(hi - ((hi - lo) * i) / 4).replace('$', ''), padL + w + 6, y);
    }
    ctx.textAlign = 'center';
    for (let i = 0; i <= 3; i++) {
      const x = padL + (w * i) / 3;
      ctx.strokeStyle = 'rgba(255,23,68,.06)';
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + h); ctx.stroke();
      const t = t0 + ((t1 - t0) * i) / 3;
      ctx.fillStyle = 'rgba(255,190,200,.35)';
      ctx.textAlign = i === 0 ? 'left' : i === 3 ? 'right' : 'center';
      ctx.fillText(this.fmtTime(t), x, H - 7);
    }

    // clip for draw-in
    const clipX = padL + w * ease;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, clipX + 1, H); ctx.clip();

    // area
    const path = new Path2D();
    d.forEach((pt, i) => { const x = X(pt.t), y = Y(pt.p); i ? path.lineTo(x, y) : path.moveTo(x, y); });
    const area = new Path2D(path);
    area.lineTo(X(t1), padT + h); area.lineTo(X(t0), padT + h); area.closePath();
    const g = ctx.createLinearGradient(0, padT, 0, padT + h);
    g.addColorStop(0, this.rgba(col, .32));
    g.addColorStop(.6, this.rgba(col, .06));
    g.addColorStop(1, this.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill(area);

    // glow line + crisp line
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.rgba(col, .5);
    ctx.lineWidth = 4;
    ctx.shadowColor = col; ctx.shadowBlur = 16;
    ctx.stroke(path);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.stroke(path);
    ctx.restore();

    // scan head during draw-in
    if (this.anim < 1) {
      const sg = ctx.createLinearGradient(clipX - 40, 0, clipX, 0);
      sg.addColorStop(0, 'rgba(255,23,68,0)');
      sg.addColorStop(1, 'rgba(255,23,68,.35)');
      ctx.fillStyle = sg;
      ctx.fillRect(clipX - 40, padT, 40, h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(clipX, padT, 1.5, h);
      return;
    }

    // high / low markers
    const mark = (i, label, above) => {
      const x = X(d[i].t), y = Y(d[i].p);
      ctx.fillStyle = 'rgba(255,220,225,.75)';
      ctx.textAlign = x > padL + w * 0.8 ? 'right' : x < padL + w * 0.2 ? 'left' : 'center';
      ctx.fillText(`${label} ${fmtPrice(d[i].p)}`, x, above ? y - 8 : y + 9);
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    };
    mark(iMax, 'H', true);
    mark(iMin, 'L', false);

    // last price line + label
    const last = d[d.length - 1];
    const ly = Y(last.p), lx = X(last.t);
    ctx.strokeStyle = this.rgba(col, .55);
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(padL + w, ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(padL + w + 1, ly); ctx.lineTo(padL + w + 6, ly - 8); ctx.lineTo(W, ly - 8); ctx.lineTo(W, ly + 8); ctx.lineTo(padL + w + 6, ly + 8);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.fillText(fmtPrice(last.p).replace('$', ''), padL + w + 8, ly + 0.5);

    // pulsing live dot
    const ph = (now % 1600) / 1600;
    ctx.strokeStyle = this.rgba(col, 1 - ph);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 3 + ph * 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // crosshair
    if (this.hover && this.hover.x >= padL && this.hover.x <= padL + w) {
      const tt = t0 + ((this.hover.x - padL) / w) * (t1 - t0);
      let lo2 = 0, hi2 = d.length - 1;
      while (hi2 - lo2 > 1) { const m = (lo2 + hi2) >> 1; d[m].t < tt ? (lo2 = m) : (hi2 = m); }
      const pt = Math.abs(d[lo2].t - tt) < Math.abs(d[hi2].t - tt) ? d[lo2] : d[hi2];
      const x = X(pt.t), y = Y(pt.p);
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + h); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      const chg = (pt.p / d[0].p - 1) * 100;
      tip.show(
        `<div class="row"><span>TIME</span><b>${this.fmtTime(pt.t, true)}</b></div>` +
        `<div class="row"><span>PRICE</span><b>${fmtPrice(pt.p)}</b></div>` +
        `<div class="row"><span>Δ PERIOD</span><b class="${cls(chg)}">${fmtPct(chg)}</b></div>`,
        this.hover.cx, this.hover.cy
      );
    }
  }
}
NeonChart.all = [];

(function loop(now) {
  for (const c of NeonChart.all) if (c.visible && !document.hidden) c.draw(now);
  requestAnimationFrame(loop);
})(performance.now());
