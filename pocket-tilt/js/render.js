// --- Çizim ---
// Oyuncak birimlerinden piksele: px boyutlu kare tuvalde merkez (px/2, px/2), ölçek px/(VIEW*2)
function setViewPx(c, px) { const k = px / (VIEW * 2); c.setTransform(k, 0, 0, k, px / 2, px / 2); return k; }
function shape(c, lv, half, corner) {
  if (lv.shape === 'round') circle(c, 0, 0, half); else rrect(c, -half, -half, half * 2, half * 2, corner);
}
function icePath(c, z) {
  c.beginPath();
  if (z.r === undefined) { c.rect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1); return; }
  c.arc(z.x, z.y, z.r, 0, TAU);
  if (z.r0) { c.moveTo(z.x + z.r0, z.y); c.arc(z.x, z.y, z.r0, 0, TAU, true); }
}
function drawIce(c, z) {
  c.save();
  icePath(c, z); c.fillStyle = 'rgba(222,245,255,.72)'; c.fill('evenodd'); c.clip('evenodd');
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.6;
  const rand = rng(29);
  for (let i = 0; i < 70; i++) { const x = rand() * 200 - 100, y = rand() * 200 - 100, l = 6 + rand() * 12; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * 0.6); c.stroke(); }
  c.restore();
  icePath(c, z); c.strokeStyle = 'rgba(120,180,220,.8)'; c.lineWidth = 1.2; c.stroke();
}
function drawWall(c, w, hw) {
  if (w.t === 'a') { c.lineWidth = hw * 2; c.beginPath(); c.arc(w.cx, w.cy, w.r, w.a0, w.a1); c.stroke(); return; }
  if (w.x1 === w.x2 && w.y1 === w.y2) { circle(c, w.x1, w.y1, hw); c.fill(); return; }
  c.lineWidth = hw * 2; c.beginPath(); c.moveTo(w.x1, w.y1); c.lineTo(w.x2, w.y2); c.stroke();
}
// Işık sol üstten gelir: gölgeler sağ alta düşer
function drawHole(c, x, y) {
  let g = c.createLinearGradient(x - HOLE_R, y - HOLE_R, x + HOLE_R, y + HOLE_R); // havşa kenarı
  g.addColorStop(0, 'rgba(0,0,0,.32)'); g.addColorStop(0.55, 'rgba(0,0,0,.06)'); g.addColorStop(1, 'rgba(255,255,255,.42)');
  circle(c, x, y, HOLE_R + 1.7); c.fillStyle = g; c.fill();
  g = c.createRadialGradient(x + 1.4, y + 1.9, 0.4, x, y, HOLE_R);
  g.addColorStop(0, '#000'); g.addColorStop(0.55, '#040404'); g.addColorStop(0.86, '#171717'); g.addColorStop(1, '#2c2c2c');
  circle(c, x, y, HOLE_R); c.fillStyle = g; c.fill();
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, HOLE_R - 1, 0.95 * Math.PI, 1.75 * Math.PI); c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 2.2; c.stroke();
  c.beginPath(); c.arc(x, y, HOLE_R - 0.8, 0.05 * Math.PI, 0.7 * Math.PI); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.1; c.stroke();
}
function drawDimple(c, x, y, kk) {
  if (kk) { // renkli yuva halkası
    circle(c, x, y, DIMPLE_R + 2.4); c.strokeStyle = tint(COLORS[kk].base, -0.25, 0.6); c.lineWidth = 3.2; c.stroke();
    circle(c, x - 0.3, y - 0.4, DIMPLE_R + 2.4); c.strokeStyle = COLORS[kk].base; c.lineWidth = 2.4; c.stroke();
  }
  let g = c.createLinearGradient(x - DIMPLE_R, y - DIMPLE_R, x + DIMPLE_R, y + DIMPLE_R);
  g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(0.55, 'rgba(0,0,0,.14)'); g.addColorStop(1, 'rgba(255,255,255,.3)');
  circle(c, x, y, DIMPLE_R); c.fillStyle = g; c.fill();
  g = c.createRadialGradient(x + 1, y + 1.3, 0.5, x, y, DIMPLE_R);
  g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(0.75, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
  circle(c, x, y, DIMPLE_R); c.fillStyle = g; c.fill();
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, DIMPLE_R - 0.9, 0.05 * Math.PI, 0.7 * Math.PI); c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1.3; c.stroke();
  c.beginPath(); c.arc(x, y, DIMPLE_R + 0.7, 1.05 * Math.PI, 1.6 * Math.PI); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.stroke();
}
// Kasa, baskı, buz, delikler, yuvalar, duvarlar: bölüm boyunca değişmez, bir kez çizilir
function paintStatic(c, lv, px) {
  const k = setViewPx(c, px), round = lv.shape === 'round', big = px >= 220;
  c.clearRect(-VIEW, -VIEW, VIEW * 2, VIEW * 2);
  // masaya değen gölge (yumuşak geniş gölge CSS ile kasanın altında)
  c.save();
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 5 * k; c.shadowOffsetX = 1.2 * k; c.shadowOffsetY = 2.6 * k;
  shape(c, lv, 116, 20); c.fillStyle = lv.rim; c.fill();
  c.restore();
  // kalıp plastik gövde
  let g = c.createLinearGradient(-116, -116, 116, 116);
  g.addColorStop(0, tint(lv.rim, 0.28)); g.addColorStop(0.42, lv.rim); g.addColorStop(1, tint(lv.rim, -0.32));
  shape(c, lv, 116, 20); c.fillStyle = g; c.fill();
  c.save(); shape(c, lv, 116, 20); c.clip();
  grainFill(c, k, 0.22, -120, -120, 240, 240);
  g = c.createRadialGradient(-74, -86, 4, -74, -86, 92); // parlak plastik ışıltısı
  g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.35, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(-120, -120, 240, 240);
  c.restore();
  g = c.createLinearGradient(-116, -116, 116, 116); // dış pah
  g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.45, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
  shape(c, lv, 115.2, 19.4); c.lineWidth = 1.6; c.strokeStyle = g; c.stroke();
  g = c.createLinearGradient(-104, -104, 104, 104); // iç pah: gövdeden içeri inen basamak
  g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.5, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(255,255,255,.55)');
  shape(c, lv, 104.2, 10); c.lineWidth = 1.4; c.strokeStyle = g; c.stroke();
  if (big) {
    const spots = round ? [0.25, 0.75, 1.25, 1.75].map((a) => [Math.cos(a * Math.PI) * 110, Math.sin(a * Math.PI) * 110])
      : [[-108, -108], [108, -108], [-108, 108], [108, 108]];
    spots.forEach(([x, y], i) => screw(c, x, y, 2.7, 0.4 + i * 1.1));
    emboss(c, lv, lv.daily ? '★ ' + fmtDay(lv) + ' ★' : 'No. ' + lv.id, tint(lv.rim, -0.06));
  }
  shape(c, lv, 103, 9); c.fillStyle = 'rgba(0,0,0,.42)'; c.fill();
  // basılı karton zemin
  c.save();
  shape(c, lv, 100, 7); c.clip();
  c.fillStyle = lv.bg; c.fillRect(-100, -100, 200, 200);
  c.lineCap = 'round'; c.lineJoin = 'round';
  lv.art(c, lv);
  grainFill(c, k, luma(lv.bg) > 0.5 ? 0.5 : 0.35, -100, -100, 200, 200);
  for (const z of lv.ice) drawIce(c, z);
  for (const [x, y] of lv.holes) drawHole(c, x, y);
  for (const [x, y, kk] of lv.dimples) drawDimple(c, x, y, kk);
  // duvarlar: gölge, yan yüz, üst yüz, ışık kenarı
  c.lineCap = 'round';
  c.save();
  c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = 2.6 * k; c.shadowOffsetX = 1.5 * k; c.shadowOffsetY = 2.4 * k;
  for (const w of lv.walls) { c.strokeStyle = c.fillStyle = tint(w.color || lv.wall, -0.32); c.save(); c.translate(0.55, 0.9); drawWall(c, w, w.hw); c.restore(); }
  c.restore();
  for (const w of lv.walls) { c.strokeStyle = c.fillStyle = w.color || lv.wall; drawWall(c, w, w.hw); }
  for (const w of lv.walls) {
    c.save(); c.translate(-0.42, -0.6); c.strokeStyle = c.fillStyle = 'rgba(255,255,255,.55)';
    drawWall(c, w, w.hw * 0.38); c.restore();
  }
  for (const w of lv.walls) if (w.color) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.2; c.beginPath(); c.arc(w.x1 - 1.4, w.y1 - 1.6, w.hw * 0.45, 0, TAU); c.stroke(); }
  // kapak kenarının zemine düşen gölgesi
  c.save();
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 7 * k; c.shadowOffsetX = 2.4 * k; c.shadowOffsetY = 3.6 * k;
  c.beginPath(); c.rect(-140, -140, 280, 280); outline(c, lv, 100, 7); c.fillStyle = '#000'; c.fill('evenodd');
  c.restore();
  c.restore();
}
const fmtDay = (lv) => lv.id.slice(6).split('-').reverse().join('.');
// Kapak camı: yansımalar, ince çizikler (bilyelerin üstüne çizilir)
function paintGlass(c, lv, px) {
  const k = setViewPx(c, px), round = lv.shape === 'round';
  c.save(); shape(c, lv, 100, 7); c.clip();
  let g = c.createLinearGradient(-100, -100, 60, 60);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,.03)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(-100, -100, 200, 200);
  // pencere yansıması: iki eğik şerit
  c.save(); c.rotate(-Math.PI / 4);
  g = c.createLinearGradient(0, -78, 0, -40);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,.13)'); g.addColorStop(0.7, 'rgba(255,255,255,.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(-150, -78, 300, 38);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-150, -33, 300, 5);
  c.restore();
  c.lineCap = 'round';
  if (round) {
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3.2; c.beginPath(); c.arc(0, 0, 90, 1.08 * Math.PI, 1.38 * Math.PI); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 90, 1.43 * Math.PI, 1.5 * Math.PI); c.stroke();
  } else {
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-91, -36); c.lineTo(-36, -91); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-28, -91); c.lineTo(-19, -91); c.stroke();
  }
  // çizikler ve toz
  if (px >= 220) {
    const rand = rng(lv.id.length * 97 + lv.walls.length * 13 + lv.holes.length);
    c.lineWidth = 0.35;
    for (let i = 0; i < 16; i++) {
      const x = rand() * 180 - 90, y = rand() * 180 - 90, a = rand() * TAU, l = 3 + rand() * 9;
      c.strokeStyle = `rgba(255,255,255,${0.06 + rand() * 0.1})`;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.12})`; circle(c, rand() * 200 - 100, rand() * 200 - 100, 0.25 + rand() * 0.45); c.fill(); }
  }
  // cam kenarının parlaması
  g = c.createLinearGradient(-100, -100, 100, 100);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.18)');
  shape(c, lv, 99.4, 6.6); c.lineWidth = 1.1; c.strokeStyle = g; c.stroke();
  c.restore();
}
function buildLayers() {
  const px = cv.width;
  envColor = L.bg;
  $('toyShadow').style.borderRadius = L.shape === 'round' ? '50%' : S * 20 / 240 + 'px';
  for (const cnv of [layer, glass]) { cnv.width = cnv.height = px; }
  paintStatic(layer.getContext('2d'), L, px);
  const g = glass.getContext('2d'); g.clearRect(0, 0, px, px); paintGlass(g, L, px);
}
// Bölüm seçimi ve mağaza için küçük oyuncak resmi
function toyThumb(lv, px) {
  const cnv = document.createElement('canvas'); cnv.width = cnv.height = px;
  const c = cnv.getContext('2d'), env = envColor;
  paintStatic(c, lv, px);
  setViewPx(c, px);
  envColor = lv.bg;
  for (const [x, y, k] of lv.balls) drawBall(c, { x, y, c: k || 0, rot: 0, fall: 0 });
  envColor = env;
  c.setTransform(1, 0, 0, 1, 0, 0);
  paintGlass(c, lv, px);
  return cnv;
}
function drawBall(c, b, alpha = 1) {
  const k = b.fall ? 1 - Math.min(1, b.fall) * 0.55 : 1, r = BALL_R * k;
  if (!b.fall) { // yumuşak gölge, ışık sol üstten
    const g = c.createRadialGradient(b.x + 1.7, b.y + 2.5, 0, b.x + 1.7, b.y + 2.5, r * 1.3);
    g.addColorStop(0, `rgba(0,0,0,${0.5 * alpha})`); g.addColorStop(0.55, `rgba(0,0,0,${0.3 * alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    circle(c, b.x + 1.7, b.y + 2.5, r * 1.3); c.fillStyle = g; c.fill();
  }
  c.globalAlpha = (b.fall ? 1 - Math.min(1, b.fall) * 0.8 : 1) * alpha;
  if (b.c) drawColorBall(c, b.x, b.y, r, COLORS[b.c], b.c);
  else drawSkin(c, b.x, b.y, r, b.skin || save.skin, b.rot);
  c.globalAlpha = 1;
}
function drawColorBall(c, x, y, r, col, idx) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.36, r * 0.05, x, y, r);
  g.addColorStop(0, col.light); g.addColorStop(0.5, col.base); g.addColorStop(0.85, col.dark); g.addColorStop(1, mixHex(col.dark, envColor, 0.35));
  circle(c, x, y, r); c.fillStyle = g; c.fill();
  if (save.settings.symbols) { // renk körlüğü için şekil işareti
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath();
    const s = r * 0.42;
    if (idx === 1) { c.arc(x, y, s * 0.7, 0, TAU); }
    else if (idx === 2) { c.rect(x - s * 0.6, y - s * 0.6, s * 1.2, s * 1.2); }
    else if (idx === 3) { c.moveTo(x, y - s); c.lineTo(x + s * 0.9, y + s * 0.6); c.lineTo(x - s * 0.9, y + s * 0.6); c.closePath(); }
    else { c.moveTo(x, y - s); c.lineTo(x + s, y); c.lineTo(x, y + s); c.lineTo(x - s, y); c.closePath(); }
    c.fill();
  }
  gloss(c, x, y, r, 0.28);
}

// --- Parçacıklar, ipucu hayaleti, sarsıntı ---
let parts = [], ghost = null, shakeT = 0;
function burst(x, y, color, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = 30 + Math.random() * 60;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.45 + Math.random() * 0.25, color, size: 1.2 + Math.random() * 1.6, kind: 'spark' });
  }
}
function confettiBurst(n = 90) {
  const cols = ['#36C5E8', '#FFC93C', '#ff6b6b', '#7EE2A8', '#da77f2', '#ffffff'];
  for (let i = 0; i < n; i++) {
    parts.push({ x: (Math.random() - 0.5) * 230, y: -125 - Math.random() * 60, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80,
      life: 0, max: 2.6 + Math.random(), color: cols[i % cols.length], size: 2 + Math.random() * 2.5, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, kind: 'conf' });
  }
}
function updateParts(dt) {
  for (const p of parts) {
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'spark') { p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; } else { p.vy += 90 * dt; p.vx *= 1 - 0.8 * dt; p.rot += p.vr * dt; }
  }
  parts = parts.filter((p) => p.life < p.max);
  if (ghost) ghost.t += dt;
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
}
function drawParts(c) {
  for (const p of parts) {
    const a = 1 - p.life / p.max;
    c.globalAlpha = Math.max(0, a); c.fillStyle = p.color;
    if (p.kind === 'spark') { circle(c, p.x, p.y, p.size * (0.5 + a)); c.fill(); }
    else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); c.restore(); }
  }
  c.globalAlpha = 1;
}
function ghostPos(g, d) { // rota üzerinde d birim ilerideki nokta
  const pts = g.pts;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l) { const u = d / l; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; }
    d -= l;
  }
  return pts[pts.length - 1];
}
function drawGhost(c) {
  const g = ghost, speed = 140, d = g.t * speed;
  if (d > g.len + speed * 1.2) { ghost = null; return; }
  const fade = d > g.len ? 1 - (d - g.len) / (speed * 1.2) : Math.min(1, g.t * 3);
  for (let i = 1; i <= 8; i++) {
    const [x, y] = ghostPos(g, Math.max(0, d - i * 9));
    c.globalAlpha = fade * (0.35 - i * 0.04); c.fillStyle = '#FFE066'; circle(c, x, y, BALL_R * (1 - i * 0.07)); c.fill();
  }
  const [x, y] = ghostPos(g, Math.min(d, g.len));
  c.globalAlpha = fade * 0.75; c.fillStyle = '#FFF3BF'; circle(c, x, y, BALL_R); c.fill();
  c.lineWidth = 1.5; c.strokeStyle = '#FFC93C'; c.stroke();
  c.globalAlpha = 1;
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!L) return;
  ctx.drawImage(layer, 0, 0);
  setViewPx(ctx, cv.width);
  if (ghost) drawGhost(ctx);
  for (const b of balls) if (b.fall) drawBall(ctx, b);
  for (const b of balls) if (!b.fall) drawBall(ctx, b);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(glass, 0, 0);
  setViewPx(ctx, cv.width);
  drawParts(ctx);
  const sx = shakeT ? (Math.random() - 0.5) * 10 * shakeT / 0.3 : 0, sy = shakeT ? (Math.random() - 0.5) * 10 * shakeT / 0.3 : 0;
  cv.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) rotateX(${(-tilt.y * 6).toFixed(2)}deg) rotateY(${(tilt.x * 6).toFixed(2)}deg)`;
}
// Tuvali görünen ekrandaki .stage alanına yerleştir
function layoutStage() {
  const st = document.querySelector('.screen.on .stage');
  const sh = $('toyShadow');
  if (!st) { cv.style.visibility = sh.style.visibility = 'hidden'; return; }
  const r = st.getBoundingClientRect(), size = Math.max(120, Math.floor(Math.min(r.width, r.height, 640)));
  cv.style.visibility = sh.style.visibility = 'visible';
  const left = r.left + (r.width - size) / 2, top = r.top + (r.height - size) / 2, inset = size * 4 / 240;
  cv.style.left = left + 'px'; cv.style.top = top + 'px';
  Object.assign(sh.style, { left: left + inset + 'px', top: top + inset + 'px', width: size - inset * 2 + 'px', height: size - inset * 2 + 'px',
    borderRadius: L && L.shape === 'round' ? '50%' : size * 20 / 240 + 'px' });
  if (size !== S || cv.width !== Math.round(size * devicePixelRatio)) {
    S = size;
    cv.style.width = cv.style.height = S + 'px';
    cv.width = cv.height = Math.round(S * devicePixelRatio);
    if (L) buildLayers();
  }
  draw();
}
