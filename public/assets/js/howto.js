/* =========================================================
   "Como funciona": cena 2D em canvas controlada pelo scroll.
   window.__howto.p (0 → 1) é definido por main.js:
   0–.25 entupido · .25–.5 cabo avançando · .5–.75 triturando · .75–1 água correndo
   ========================================================= */
(() => {
  const cv = document.getElementById("howtoCanvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const state = (window.__howto ||= { p: 0 });
  const W = 1000, H = 690;
  let scale = 1, dpr = 1;

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    scale = Math.min(cv.width / W, cv.height / H);
  }
  resize();
  addEventListener("resize", resize);

  /* ---------- geometria ---------- */
  const FLOOR = 270;
  const PY = 520, PR = 70, WALL = 18;      // centro, raio interno e espessura do cano
  const TOP = PY - PR, BOT = PY + PR;
  const SHAFT_X0 = 336, SHAFT_X1 = 412;    // caixa de inspeção
  const PIPE_X0 = SHAFT_X0;
  const CLOG_X = 720;
  const DRUM = { x: 140, y: FLOOR - 86, r: 62 };
  const ENTRY = { x: (SHAFT_X0 + SHAFT_X1) / 2, y: FLOOR };

  // obstrução: bolhas pré-sorteadas
  const rnd = (a, b) => a + Math.random() * (b - a);
  const blobs = Array.from({ length: 46 }, () => {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
    const kind = Math.random();
    return { x: Math.cos(a) * rr * 34, y: Math.sin(a) * rr * (PR - 8), r: rnd(10, 22), c: kind < .45 ? "#6b4a28" : kind < .75 ? "#8a6438" : kind < .9 ? "#d1a23f" : "#3a2716", d: Math.random() };
  });
  const hairs = Array.from({ length: 14 }, () => ({ x: rnd(-30, 30), y: rnd(-PR + 10, PR - 10), a: rnd(0, Math.PI), l: rnd(20, 50) }));
  // crostas de sujeira nas paredes
  const crust = Array.from({ length: 60 }, () => ({ x: rnd(PIPE_X0 + 80, W), top: Math.random() < .5, w: rnd(20, 70), h: rnd(4, 12) }));

  const debris = [];
  const flow = Array.from({ length: 70 }, () => ({ x: rnd(PIPE_X0, W), y: rnd(0, 1), v: rnd(.6, 1.4), r: rnd(1.5, 3.5) }));

  /* ---------- utilidades ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function drawBackground() {
    // parede da casa
    let g = ctx.createLinearGradient(0, 0, 0, FLOOR);
    g.addColorStop(0, "#0b1424"); g.addColorStop(1, "#142036");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    // azulejos
    ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FLOOR); ctx.stroke(); }
    for (let y = 0; y < FLOOR; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // luz ambiente
    g = ctx.createRadialGradient(700, 60, 10, 700, 60, 420);
    g.addColorStop(0, "rgba(36,164,218,.18)"); g.addColorStop(1, "rgba(36,164,218,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    // piso
    g = ctx.createLinearGradient(0, FLOOR - 8, 0, FLOOR + 14);
    g.addColorStop(0, "#3c4a60"); g.addColorStop(1, "#1d2636");
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR - 6, W, 22);
    // solo
    g = ctx.createLinearGradient(0, FLOOR + 16, 0, H);
    g.addColorStop(0, "#3d2b1d"); g.addColorStop(.6, "#2a1d13"); g.addColorStop(1, "#160f09");
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR + 16, W, H);
    ctx.fillStyle = "rgba(90,65,44,.5)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 197) % W, y = FLOOR + 40 + ((i * 89) % (H - FLOOR - 50));
      if (y > TOP - WALL - 10 && y < BOT + WALL + 10 && x > PIPE_X0 - 20) continue;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + (i % 5) * 2, 3 + (i % 3), 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function pipeGrad(y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "#2a3344"); g.addColorStop(.35, "#d7dee8"); g.addColorStop(.6, "#7d8899"); g.addColorStop(1, "#1c2330");
    return g;
  }
  function pipeGradV(x0, x1) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#2a3344"); g.addColorStop(.35, "#d7dee8"); g.addColorStop(.6, "#7d8899"); g.addColorStop(1, "#1c2330");
    return g;
  }

  function drawPipeBody() {
    // interior
    ctx.fillStyle = "#0a1220";
    ctx.fillRect(PIPE_X0, TOP, W - PIPE_X0, PR * 2);
    ctx.fillRect(SHAFT_X0, FLOOR + 16, SHAFT_X1 - SHAFT_X0, TOP - FLOOR);
    const ig = ctx.createLinearGradient(0, TOP, 0, BOT);
    ig.addColorStop(0, "rgba(255,255,255,.05)"); ig.addColorStop(.5, "rgba(0,0,0,0)"); ig.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = ig; ctx.fillRect(PIPE_X0, TOP, W - PIPE_X0, PR * 2);
  }

  function drawPipeWalls(clean) {
    // crosta de sujeira (some ao limpar)
    ctx.save();
    ctx.globalAlpha = 1 - clean;
    for (const c of crust) {
      ctx.fillStyle = "#5a3e22";
      ctx.beginPath();
      if (c.top) ctx.ellipse(c.x, TOP + 2, c.w / 2, c.h, 0, 0, Math.PI);
      else ctx.ellipse(c.x, BOT - 2, c.w / 2, c.h, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // paredes do cano
    ctx.fillStyle = pipeGrad(TOP - WALL, TOP);
    ctx.fillRect(SHAFT_X1, TOP - WALL, W - SHAFT_X1, WALL);
    ctx.fillStyle = pipeGrad(BOT, BOT + WALL);
    ctx.fillRect(SHAFT_X0 - WALL, BOT, W - SHAFT_X0 + WALL, WALL);
    // paredes da caixa de inspeção (concreto)
    const cg = ctx.createLinearGradient(SHAFT_X0 - WALL, 0, SHAFT_X0, 0);
    cg.addColorStop(0, "#5d646f"); cg.addColorStop(1, "#8b929c");
    ctx.fillStyle = cg; ctx.fillRect(SHAFT_X0 - WALL, FLOOR + 10, WALL, BOT - FLOOR - 10);
    ctx.fillStyle = cg; ctx.fillRect(SHAFT_X1, FLOOR + 10, WALL, TOP - WALL - FLOOR - 10 + WALL);
    // luvas/juntas
    ctx.fillStyle = pipeGrad(TOP - WALL - 6, TOP + 2);
    for (const x of [560, 860, 960]) {
      rr(x, TOP - WALL - 6, 22, WALL + 6, 3); ctx.fill();
      ctx.fillStyle = pipeGrad(BOT - 2, BOT + WALL + 6);
      rr(x, BOT - 2, 22, WALL + 8, 3); ctx.fill();
      ctx.fillStyle = pipeGrad(TOP - WALL - 6, TOP + 2);
    }
    // tampa da caixa aberta
    ctx.save();
    ctx.translate(SHAFT_X1 + 30, FLOOR - 4);
    ctx.rotate(-0.12);
    const tg = ctx.createLinearGradient(0, -10, 0, 4);
    tg.addColorStop(0, "#9aa1ab"); tg.addColorStop(1, "#5d646f");
    ctx.fillStyle = tg; rr(0, -12, 96, 12, 2); ctx.fill();
    ctx.restore();
  }

  function drawWater(t, L, R, flowAmt, shaftLevel) {
    // L/R: nível (0–1) antes/depois da obstrução; shaftLevel: altura extra na caixa
    const lvl = (f) => BOT - f * (BOT - TOP);
    ctx.save();
    ctx.beginPath(); ctx.rect(PIPE_X0, TOP, W - PIPE_X0, PR * 2); ctx.rect(SHAFT_X0, FLOOR + 16, SHAFT_X1 - SHAFT_X0, TOP - FLOOR); ctx.clip();
    const dirty = 1 - flowAmt;
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const top = mix([128, 108, 64], [127, 214, 255], 1 - dirty);
    const bot = mix([58, 47, 28], [13, 79, 143], 1 - dirty);
    const g = ctx.createLinearGradient(0, TOP - 100, 0, BOT);
    g.addColorStop(0, `rgba(${top},.95)`); g.addColorStop(1, `rgba(${bot},.95)`);
    ctx.fillStyle = g;
    // trecho antes da obstrução (com ondas)
    const yL = lvl(L);
    const xEnd = flowAmt > 0.02 ? W : CLOG_X;
    ctx.beginPath();
    ctx.moveTo(PIPE_X0, BOT);
    const surf = (x) => (flowAmt > 0.02 ? yL + (lvl(R) - yL) * clamp01((x - PIPE_X0) / (W - PIPE_X0)) : yL) + Math.sin(x * 0.035 - t * (3 + flowAmt * 6)) * 3;
    for (let x = PIPE_X0; x <= xEnd; x += 8) ctx.lineTo(x, surf(x));
    ctx.lineTo(xEnd, BOT); ctx.closePath(); ctx.fill();
    // água subindo pela caixa de inspeção (refluxo)
    if (shaftLevel > 0) {
      const ys = TOP - shaftLevel * (TOP - FLOOR - 30);
      ctx.beginPath(); ctx.moveTo(SHAFT_X0, TOP + 2);
      for (let x = SHAFT_X0; x <= SHAFT_X1; x += 6) ctx.lineTo(x, ys + Math.sin(x * 0.12 + t * 4) * 2.5);
      ctx.lineTo(SHAFT_X1, TOP + 2); ctx.closePath(); ctx.fill();
    }
    // filete depois da obstrução
    if (flowAmt <= 0.02) {
      ctx.fillStyle = `rgba(${bot},.8)`;
      ctx.fillRect(CLOG_X, lvl(R), W - CLOG_X, BOT - lvl(R));
    }
    // brilho/correnteza
    if (flowAmt > 0.02) {
      ctx.globalAlpha = flowAmt;
      for (const f of flow) {
        f.x += f.v * (2 + flowAmt * 9);
        if (f.x > W) f.x = PIPE_X0;
        const y = surf(f.x) + 6 + f.y * (BOT - surf(f.x) - 10);
        ctx.fillStyle = "rgba(220,245,255,.7)";
        ctx.fillRect(f.x, y, 10 + f.v * 14, 1.6);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawClog(t, health, warn) {
    if (health <= 0.01) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(PIPE_X0, TOP, W - PIPE_X0, PR * 2); ctx.clip();
    ctx.translate(CLOG_X, PY);
    if (warn > 0) {
      const a = (0.35 + 0.35 * Math.sin(t * 6)) * warn;
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
      g.addColorStop(0, `rgba(236,50,53,${a})`); g.addColorStop(1, "rgba(236,50,53,0)");
      ctx.fillStyle = g; ctx.fillRect(-120, -PR, 240, PR * 2);
    }
    for (const b of blobs) {
      if (b.d > health) continue;
      const k = Math.min(1, (health - b.d) * 4 + 0.2);
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(b.x * (0.6 + 0.4 * health), b.y, b.r * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(20,12,6,.8)"; ctx.lineWidth = 1.6;
    for (const h of hairs) {
      if (h.x / 60 + .5 > health + .2) continue;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.quadraticCurveTo(h.x + Math.cos(h.a) * h.l, h.y - 14, h.x + Math.cos(h.a + 1) * h.l, h.y + Math.sin(h.a) * 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMachine(t, spin) {
    const F = FLOOR;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(170, F - 2, 140, 10, 0, 0, Math.PI * 2); ctx.fill();
    // chassi
    let g = ctx.createLinearGradient(0, F - 150, 0, F - 22);
    g.addColorStop(0, "#ff6a5e"); g.addColorStop(.45, "#ec3235"); g.addColorStop(1, "#a5161b");
    ctx.fillStyle = g; rr(50, F - 150, 240, 128, 18); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.18)"; rr(60, F - 143, 150, 10, 5); ctx.fill();
    // motor
    g = ctx.createLinearGradient(0, F - 190, 0, F - 146);
    g.addColorStop(0, "#5c6675"); g.addColorStop(.5, "#c9d2dd"); g.addColorStop(1, "#3a4250");
    ctx.fillStyle = g; rr(206, F - 190, 76, 44, 8); ctx.fill();
    ctx.fillStyle = "#1a2130";
    for (let i = 0; i < 5; i++) ctx.fillRect(215 + i * 13, F - 183, 6, 30);
    // tambor
    ctx.fillStyle = "#121925"; ctx.beginPath(); ctx.arc(DRUM.x, DRUM.y, DRUM.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#596274"; ctx.lineWidth = 6; ctx.stroke();
    ctx.save(); ctx.translate(DRUM.x, DRUM.y); ctx.rotate(spin);
    ctx.strokeStyle = "#aab4c2"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.1) { const r = 7 + a * 2.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.stroke();
    ctx.fillStyle = "#ec3235"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // marca
    ctx.fillStyle = "#fff"; ctx.font = "800 28px Sora, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("DBM", 248, F - 78);
    ctx.font = "700 11px Inter, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText("ROTATIVA", 248, F - 58);
    // guidão e rodas
    ctx.strokeStyle = "#8892a2"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(58, F - 140); ctx.lineTo(28, F - 226); ctx.lineTo(8, F - 226); ctx.stroke();
    for (const x of [86, 256]) {
      ctx.fillStyle = "#0d121b"; ctx.beginPath(); ctx.arc(x, F - 18, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#596274"; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = "#9aa5b4"; ctx.beginPath(); ctx.arc(x, F - 18, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = spin ? "#25d366" : "#5a6270";
    ctx.shadowColor = "#25d366"; ctx.shadowBlur = spin ? 14 : 0;
    ctx.beginPath(); ctx.arc(72, F - 126, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function label(text, x, y, lx, ly, alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = "700 15px Inter, sans-serif";
    const w = ctx.measureText(text).width + 26;
    ctx.fillStyle = "rgba(5,10,20,.85)"; rr(x - w / 2, y - 30, w, 30, 15); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.stroke();
    ctx.fillStyle = "#eef3fa"; ctx.textAlign = "center"; ctx.fillText(text, x, y - 10);
    ctx.restore();
  }

  // caminho do cabo: saída do tambor → caixa → cano (comprimento em px)
  const cablePts = (() => {
    const pts = [];
    const p0 = { x: DRUM.x + 40, y: DRUM.y + 44 }, c = { x: ENTRY.x - 10, y: FLOOR - 70 }, p1 = { x: ENTRY.x, y: FLOOR + 30 };
    for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push({ x: (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * c.x + u * u * p1.x, y: (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * c.y + u * u * p1.y }); }
    for (let y = FLOOR + 40; y <= PY - 30; y += 10) pts.push({ x: ENTRY.x, y });
    for (let i = 1; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI / 2; pts.push({ x: ENTRY.x + 30 + Math.cos(a) * 30, y: PY - 30 + Math.sin(a) * 30 }); }
    for (let x = ENTRY.x + 40; x <= CLOG_X - 30; x += 10) pts.push({ x, y: PY });
    let L = 0; pts[0].l = 0;
    for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].l = L; }
    return { pts, L };
  })();

  function drawCable(t, k, drilling) {
    if (k <= 0) return;
    const { pts, L } = cablePts;
    const len = k * L;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    let head = pts[0], prev = pts[0];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].l > len) { const u = (len - pts[i - 1].l) / (pts[i].l - pts[i - 1].l); head = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u }; prev = pts[i - 1]; break; }
      ctx.lineTo(pts[i].x, pts[i].y); head = pts[i]; prev = pts[i - 1];
    }
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = "#2b3240"; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = "#c9d2dd"; ctx.lineWidth = 5; ctx.stroke();
    ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 60;
    ctx.strokeStyle = "#6b7585"; ctx.lineWidth = 5; ctx.stroke();
    ctx.setLineDash([]);
    // ponteira giratória
    const ang = Math.atan2(head.y - prev.y, head.x - prev.x);
    ctx.translate(head.x + (drilling ? Math.sin(t * 60) * 1.5 : 0), head.y + (drilling ? Math.cos(t * 50) * 1.5 : 0));
    ctx.rotate(ang);
    ctx.fillStyle = "#ec3235"; rr(-14, -9, 16, 18, 4); ctx.fill();
    const sp = t * 40;
    for (let i = 0; i < 3; i++) {
      const s = Math.sin(sp + i * 2.09);
      ctx.fillStyle = s > 0 ? "#eef2f6" : "#7d8899";
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(26, s * 16); ctx.lineTo(22, s * 16 + (s > 0 ? -4 : 4)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#d7dee8"; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(16, 0); ctx.lineTo(0, 7); ctx.fill();
    if (drilling) {
      ctx.strokeStyle = "rgba(255,200,120,.8)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const a = rnd(-1, 1), d = rnd(20, 40); ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24 + Math.cos(a) * d, Math.sin(a) * d); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawDebris(spawn, flowAmt) {
    if (spawn > 0 && Math.random() < spawn) {
      for (let i = 0; i < 2; i++) debris.push({ x: CLOG_X + rnd(-20, 10), y: PY + rnd(-PR + 8, PR - 8), vx: rnd(.6, 2.4), vy: rnd(-.6, .6), r: rnd(2, 5), c: Math.random() < .3 ? "#d1a23f" : "#6b4a28", life: 1 });
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(PIPE_X0, TOP, W - PIPE_X0, PR * 2); ctx.clip();
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.x += d.vx * (1 + flowAmt * 4); d.y += d.vy; d.life -= 0.006;
      if (d.y < TOP + 4 || d.y > BOT - 4) d.vy *= -1;
      if (d.x > W + 10 || d.life <= 0) { debris.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, d.life * 2);
      ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawHud(p, rot, flowAmt) {
    ctx.save();
    ctx.font = "700 12px Inter, sans-serif"; ctx.textAlign = "left";
    const y = 54;
    const bars = [["ROTAÇÃO", rot, "#f5a524"], ["FLUXO", flowAmt, "#25d366"]];
    bars.forEach(([label, v, c], i) => {
      const x = W - 450 + i * 230;
      ctx.fillStyle = "rgba(5,10,20,.75)"; rr(x - 12, y - 24, 210, 44, 12); ctx.fill();
      ctx.fillStyle = "rgba(238,243,250,.65)"; ctx.fillText(label, x, y - 6);
      ctx.fillStyle = "rgba(255,255,255,.1)"; rr(x, y + 2, 186, 6, 3); ctx.fill();
      ctx.fillStyle = c; rr(x, y + 2, Math.max(4, 186 * v), 6, 3); ctx.fill();
    });
    ctx.restore();
  }

  /* ---------- loop ---------- */
  let visible = false, last = performance.now(), t = 0, spin = 0, cur = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) resize(); }, { threshold: 0 }).observe(cv);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    cur += (state.p - cur) * Math.min(1, dt * 6);
    const p = cur;

    const s1 = seg(p, .25, .5), s2 = seg(p, .5, .75), s3 = seg(p, .75, 1);
    const extend = ease(s1) * (1 - ease(s3) * .75);
    const health = 1 - ease(s2);
    const flowAmt = ease(s3);
    const rotating = s1 > 0 && s3 < 1;
    if (rotating) spin += dt * (4 + s2 * 14);
    const L = 1 - flowAmt * 0.45, R = 0.12 + flowAmt * 0.38;
    const shaft = (1 - ease(seg(p, .62, .82))) * (0.35 + 0.1 * Math.sin(t * 1.2)) * (1 - s2 * .6);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#070d19"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale, 0, 0, scale, (cv.width - W * scale) / 2, (cv.height - H * scale) / 2);

    drawBackground();
    drawPipeBody();
    drawWater(t, L, R, flowAmt, shaft);
    drawClog(t, health, 1 - s1);
    drawDebris(s2 > 0 && s2 < 1 ? 0.9 : 0, flowAmt);
    drawCable(t, extend, s2 > 0 && s2 < 1);
    drawPipeWalls(ease(seg(p, .55, .95)));
    drawMachine(t, rotating ? spin : 0);
    label("Caixa de inspeção", SHAFT_X1 + 120, FLOOR + 80, SHAFT_X1 + 4, FLOOR + 110, 1 - s3);
    label("Obstrução", CLOG_X + 90, TOP - WALL - 40, CLOG_X + 20, TOP - 6, (1 - s1) * health);
    label("Cabo de aço girando", CLOG_X - 150, BOT + WALL + 64, CLOG_X - 120, PY + 4, s1 >= 1 && s3 < .3 ? 1 - s3 * 3.3 : 0);
    label("Água correndo livre", W - 160, BOT + WALL + 64, W - 120, BOT - 18, s3);
    drawHud(p, rotating ? 0.35 + s2 * 0.6 - s3 * 0.3 : 0, flowAmt);
  }
  requestAnimationFrame(frame);
})();
