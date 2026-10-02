/* =========================================================
   Layout — drag & drop panel arrangement + theme/config popover
   ========================================================= */
(() => {
  /* ---------------- drag & drop ---------------- */
  const ZONES = [
    { el: $('#charts'), key: 'layoutCharts' },
    { el: $('.grid'), key: 'layoutGrid' }
  ];
  $$('.grid > .panel').forEach(p => { p.dataset.panel = [...p.classList].find(c => c.startsWith('p-')); });

  const items = z => $$(':scope > [data-panel]', z.el);
  const order = z => items(z).map(e => e.dataset.panel);
  const defaults = new Map(ZONES.map(z => [z, order(z)]));
  const arrange = (z, keys) => keys.forEach(k => {
    const e = z.el.querySelector(`:scope > [data-panel="${k}"]`);
    if (e) z.el.appendChild(e);
  });
  ZONES.forEach(z => { const o = store.get(z.key); if (Array.isArray(o)) arrange(z, o); });

  const GRIP = '<button class="grip" title="Drag to rearrange" aria-label="Drag to rearrange"><i></i><i></i><i></i></button>';
  ZONES.forEach(z => items(z).forEach(p => {
    const host = $('.ph', p) || $('.cc-top', p);
    if (host && !$('.grip', host)) host.insertAdjacentHTML('afterbegin', GRIP);
  }));

  /** Animate siblings from their old to their new positions (FLIP). */
  function flip(zone, mutate) {
    const els = [...zone.el.children].filter(e => !e.classList.contains('dragging'));
    const before = new Map(els.map(e => [e, e.getBoundingClientRect()]));
    mutate();
    els.forEach(e => {
      const a = before.get(e), b = e.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    });
  }

  let D = null;

  document.addEventListener('pointerdown', e => {
    const grip = e.target.closest('.grip');
    if (!grip || e.button > 0) return;
    const panel = grip.closest('[data-panel]');
    const zone = ZONES.find(z => z.el === panel?.parentElement);
    if (!zone) return;
    e.preventDefault();
    closePicker();
    tip.hide();
    const r = panel.getBoundingClientRect();
    const slot = document.createElement('div');
    slot.className = 'drop-slot ' + [...panel.classList].filter(c => c.startsWith('p-')).join(' ');
    slot.style.height = r.height + 'px';
    slot.innerHTML = '<span>DROP ZONE</span>';
    panel.before(slot);
    panel.style.animation = 'none';
    Object.assign(panel.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 350 });
    panel.classList.add('dragging');
    document.body.classList.add('is-dragging');
    D = { panel, zone, slot, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, vx: 0, last: '' };
    requestAnimationFrame(autoScroll);
  });

  document.addEventListener('pointermove', e => {
    if (!D) return;
    D.vx = D.vx * 0.7 + (e.clientX - D.x) * 0.3;
    D.x = e.clientX; D.y = e.clientY;
    D.panel.style.left = D.x - D.dx + 'px';
    D.panel.style.top = D.y - D.dy + 'px';
    D.panel.style.transform = `rotate(${Math.max(-4, Math.min(4, D.vx * 0.25))}deg) scale(1.02)`;
    findTarget();
  });

  function findTarget() {
    const t = document.elementFromPoint(D.x, D.y)?.closest('[data-panel], .drop-slot');
    if (!t || t === D.slot || t.parentElement !== D.zone.el) return;
    const r = t.getBoundingClientRect();
    const wide = r.width > D.zone.el.clientWidth * 0.6;
    const after = wide ? D.y > r.top + r.height / 2 : D.x > r.left + r.width / 2;
    const sig = t.dataset.panel + after;
    if (sig === D.last) return;
    D.last = sig;
    let ref = after ? t.nextElementSibling : t;
    if (ref === D.panel) ref = D.panel.nextElementSibling;
    if (ref === D.slot) return;
    flip(D.zone, () => D.zone.el.insertBefore(D.slot, ref));
  }

  function autoScroll() {
    if (!D) return;
    const edge = 80;
    let v = 0;
    if (D.y < edge) v = -(edge - D.y) / 3;
    else if (D.y > innerHeight - edge) v = (D.y - (innerHeight - edge)) / 3;
    if (v) { scrollBy(0, v); D.last = ''; findTarget(); }
    requestAnimationFrame(autoScroll);
  }

  function drop() {
    if (!D) return;
    const { panel, slot, zone } = D;
    D = null;
    document.body.classList.remove('is-dragging');
    const r = slot.getBoundingClientRect();
    panel.classList.add('dropping');
    Object.assign(panel.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', transform: 'none' });
    setTimeout(() => {
      slot.replaceWith(panel);
      for (const k of ['position', 'left', 'top', 'width', 'height', 'zIndex', 'transform']) panel.style[k] = '';
      panel.classList.remove('dragging', 'dropping');
      panel.classList.add('dropped');
      setTimeout(() => panel.classList.remove('dropped'), 700);
      store.set(zone.key, order(zone));
    }, 260);
  }
  document.addEventListener('pointerup', drop);
  document.addEventListener('pointercancel', drop);

  function resetLayout() {
    ZONES.forEach(z => {
      store.set(z.key, null);
      flip(z, () => arrange(z, defaults.get(z)));
    });
  }

  /* ---------------- config popover ---------------- */
  const PRESETS = [
    ['CRIMSON', '#ff1744'], ['BLOOD', '#c4001d'], ['SOLAR', '#ff6d00'], ['AMBER', '#ffb000'],
    ['GOLD', '#ffd700'], ['TOXIC', '#39ff14'], ['MATRIX', '#00ff9c'], ['CYAN', '#00e5ff'],
    ['ICE', '#7df9ff'], ['ULTRAVIOLET', '#9d4dff'], ['NEON PINK', '#ff2bd6'], ['GHOST', '#d8d8ff']
  ];
  const btn = $('#themeBtn');
  const pop = document.createElement('div');
  pop.className = 'cfg';
  pop.hidden = true;
  pop.innerHTML = `
    <header>// SYSTEM_CONFIG</header>
    <label>ACCENT COLOR</label>
    <div class="cfg-sw">${PRESETS.map(([n, c]) => `<button data-c="${c}" title="${n}" style="--c:${c}"></button>`).join('')}</div>
    <div class="cfg-custom">
      <label class="cfg-pick" title="Pick any color"><input type="color" id="cfgColor"><span>CUSTOM</span></label>
      <input id="cfgHex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex color">
    </div>
    <label>LAYOUT</label>
    <p>Drag the <span class="grip-demo"><i></i><i></i><i></i></span> handle in any panel header to rearrange. Your layout is saved automatically.</p>
    <div class="cfg-btns"><button data-act="layout">RESET LAYOUT</button><button data-act="color">RESET COLOR</button></div>`;
  document.body.appendChild(pop);
  const colorIn = $('#cfgColor', pop), hexIn = $('#cfgHex', pop);

  const sync = () => {
    colorIn.value = Theme.hex;
    if (document.activeElement !== hexIn) hexIn.value = Theme.hex.toUpperCase();
    $$('.cfg-sw button', pop).forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === Theme.hex.toLowerCase()));
  };
  addEventListener('themechange', sync);

  const place = () => {
    const r = btn.getBoundingClientRect();
    pop.style.top = r.bottom + 10 + 'px';
    pop.style.left = Math.max(10, Math.min(innerWidth - pop.offsetWidth - 10, r.right - pop.offsetWidth)) + 'px';
  };
  const open = () => { pop.hidden = false; sync(); place(); pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in'); };
  const close = () => { pop.hidden = true; };
  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  addEventListener('resize', () => !pop.hidden && place());
  addEventListener('scroll', () => !pop.hidden && place(), { passive: true });
  document.addEventListener('mousedown', e => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  pop.addEventListener('click', e => {
    const sw = e.target.closest('.cfg-sw button');
    if (sw) Theme.apply(sw.dataset.c);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'layout') resetLayout();
    if (act === 'color') Theme.apply(Theme.DEFAULT);
  });
  colorIn.addEventListener('input', () => Theme.apply(colorIn.value));
  hexIn.addEventListener('input', () => {
    const v = hexIn.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) Theme.apply(v.startsWith('#') ? v : '#' + v);
  });
  hexIn.addEventListener('blur', sync);
  sync();
})();
