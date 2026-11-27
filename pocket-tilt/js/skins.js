// --- Bilye görünümleri ---
// price: altınla; ads: bu kadar reklam izleyince açılır; daily: 7 günlük ödülün son günü
const SKINS = [
  { id: 'steel', name: ['Çelik', 'Steel'], price: 0 },
  { id: 'copper', name: ['Bakır', 'Copper'], price: 200 },
  { id: 'gold', name: ['Altın', 'Gold'], price: 350 },
  { id: 'chrome', name: ['Siyah Krom', 'Black Chrome'], price: 450 },
  { id: 'pearl', name: ['İnci', 'Pearl'], price: 550 },
  { id: 'glass', name: ['Cam Misket', 'Glass Marble'], price: 700 },
  { id: 'cateye', name: ['Kedi Gözü', 'Cat\'s Eye'], price: 900 },
  { id: 'rainbow', name: ['Gökkuşağı', 'Rainbow'], ads: 3 },
  { id: 'nazar', name: ['Nazar Boncuğu', 'Evil Eye Bead'], price: 1100 },
  { id: 'football', name: ['Futbol', 'Football'], ads: 5 },
  { id: 'lava', name: ['Lav', 'Lava'], price: 1400 },
  { id: 'galaxy', name: ['Galaksi', 'Galaxy'], price: 1800 },
  { id: 'diamond', name: ['Elmas', 'Diamond'], daily: true }
];
const SKIN_STOPS = {
  pearl: ['#ffffff', '#fdf2f8', '#e3d3e6', '#9d8fa6'],
  diamond: ['#ffffff', '#d0f4ff', '#6fcbef', '#1f6d92'],
  lava: ['#ffb4a2', '#c0392b', '#4a0c0c', '#140303'],
  galaxy: ['#d0bfff', '#5f3dc4', '#24154d', '#0b0618'],
  football: ['#ffffff', '#f1f3f5', '#c3c9d1', '#5f6670']
};
// Metaller: tavan yansıması, koyu ufuk halkası, kenarda zeminin rengi
const METALS = {
  steel: ['#ffffff', '#e3e8ee', '#8d97a4', '#2b3038'],
  copper: ['#fff1e2', '#f4ad7a', '#b0571f', '#3b1704'],
  gold: ['#fffbe6', '#ffe07a', '#c78f0c', '#4f3300'],
  chrome: ['#eef1f5', '#6e7681', '#22272e', '#040506']
};
let envColor = '#8f9aa8'; // bilyenin kenarına yansıyan zemin rengi
function metal(c, x, y, r, m) {
  let g = c.createRadialGradient(x - r * 0.2, y - r * 0.24, 0, x, y, r);
  g.addColorStop(0, m[0]); g.addColorStop(0.3, m[1]); g.addColorStop(0.6, m[2]); g.addColorStop(0.8, m[3]);
  g.addColorStop(0.92, mixHex(m[3], envColor, 0.45)); g.addColorStop(1, mixHex(m[2], envColor, 0.4));
  circle(c, x, y, r); c.fillStyle = g; c.fill();
  g = c.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
  circle(c, x, y, r); c.fillStyle = g; c.fill();
  gloss(c, x, y, r, 0.3);
}
function gloss(c, x, y, r, rim) { // keskin parlama ve sağ alttan yansıyan ışık
  c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.42, r * 0.25, r * 0.15, -0.65, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; circle(c, x - r * 0.05, y - r * 0.55, r * 0.06); c.fill();
  if (rim) { c.lineCap = 'round'; c.beginPath(); c.arc(x, y, r * 0.82, 0.08 * Math.PI, 0.52 * Math.PI); c.strokeStyle = `rgba(255,255,255,${rim})`; c.lineWidth = r * 0.13; c.stroke(); }
}
function shade(c, x, y, r, stops) {
  const g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r);
  g.addColorStop(0, stops[0]); g.addColorStop(0.22, stops[1]); g.addColorStop(0.65, stops[2]); g.addColorStop(1, stops[3]);
  circle(c, x, y, r); c.fillStyle = g; c.fill();
}
function sphereOver(c, x, y, r, dark = 0.45) { // desenin üstüne küre gölgesi ve parlama
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(0,0,0,${dark})`);
  circle(c, x, y, r); c.fillStyle = g; c.fill();
  gloss(c, x, y, r, 0.22);
}
// Şeffaf cam: ortası açık, kenarı koyu; ışık camdan geçip sağ altta toplanır
function glassBody(c, x, y, r, tint) {
  const g = c.createRadialGradient(x - r * 0.12, y - r * 0.16, r * 0.05, x, y, r);
  g.addColorStop(0, tint[0]); g.addColorStop(0.62, tint[1]); g.addColorStop(0.9, tint[2]); g.addColorStop(1, tint[3]);
  circle(c, x, y, r); c.fillStyle = g; c.fill();
}
function glassFinish(c, x, y, r) {
  c.save(); circle(c, x, y, r); c.clip();
  const g = c.createRadialGradient(x + r * 0.32, y + r * 0.42, 0, x + r * 0.32, y + r * 0.42, r * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  circle(c, x, y, r * 0.965); c.lineWidth = r * 0.07; c.strokeStyle = 'rgba(10,40,70,.35)'; c.stroke();
  gloss(c, x, y, r, 0.4);
}
// Camın içindeki renkli şerit: merkezden kenara kıvrılan yaprak (oyuncak birimlerinde, merkez 0,0)
function vane(c, r, len, wid, bend) {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(r * len * 0.35, -r * wid, r * len * 0.75, -r * (wid - bend), r * len, r * bend);
  c.bezierCurveTo(r * len * 0.75, r * (wid + bend), r * len * 0.35, r * wid, 0, 0);
  c.closePath();
}
function drawMarble(c, x, y, r, rot, id) {
  const cat = id === 'cateye';
  glassBody(c, x, y, r, cat ? ['#f4fffb', '#b9ecdc', '#5fae9a', '#2f6f63'] : ['#f5fbff', '#bfe0f3', '#6aa6c8', '#2c5f80']);
  c.save(); circle(c, x, y, r * 0.97); c.clip(); c.translate(x, y); c.rotate(rot);
  if (cat) {
    // kedi gözü: ortada dört yapraklı renkli damar
    for (const [c1, c2, a] of [['#ff9a1f', '#c24a00', 0], ['#ffd23f', '#e08a00', Math.PI / 2], ['#ff9a1f', '#c24a00', Math.PI], ['#ffd23f', '#e08a00', 1.5 * Math.PI]]) {
      c.save(); c.rotate(a); vane(c, r, 0.9, 0.16, 0.02);
      const g = c.createLinearGradient(0, 0, r, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
      c.fillStyle = g; c.fill(); c.lineWidth = r * 0.035; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
      c.restore();
    }
  } else {
    // cam misket: camın ortasından geçen, uçları incelen S biçimli şerit; yan yana üç renk
    const N = 28, cl = (t) => [t * 0.86 * r, Math.sin(t * Math.PI) * 0.26 * r];
    const width = (t) => 0.48 * r * Math.pow(Math.cos(t * Math.PI / 2), 0.7);
    const side = (t, o) => {
      const [px, py] = cl(t), e = 0.001, [qx, qy] = cl(t + e), dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy);
      return [px - dy / d * width(t) * o, py + dx / d * width(t) * o];
    };
    [['#e8322f', '#ff9b8f'], ['#f5b400', '#ffe58a'], ['#1f7fe0', '#8fd0ff']].forEach(([col, light], k) => {
      const o0 = -0.5 + k / 3, o1 = o0 + 1 / 3;
      c.beginPath();
      for (let i = 0; i <= N; i++) { const [px, py] = side(-1 + 2 * i / N, o0); c[i ? 'lineTo' : 'moveTo'](px, py); }
      for (let i = N; i >= 0; i--) { const [px, py] = side(-1 + 2 * i / N, o1); c.lineTo(px, py); }
      c.closePath(); c.fillStyle = col; c.fill();
      c.beginPath();
      for (let i = 2; i <= N - 2; i++) { const [px, py] = side(-1 + 2 * i / N, (o0 + o1) / 2 - 0.06); c[i > 2 ? 'lineTo' : 'moveTo'](px, py); }
      c.lineWidth = r * 0.035; c.lineCap = 'round'; c.strokeStyle = light; c.stroke();
    });
  }
  if (cat) { circle(c, 0, 0, r * 0.12); c.fillStyle = '#ffe9a8'; c.fill(); }
  c.restore();
  glassFinish(c, x, y, r);
}
function drawNazar(c, x, y, r, rot) {
  // koyu lacivert cam boncuk; göz katmanları hafif öne (sağ alta) kaymış, boncuk dönerken göz de döner
  shade(c, x, y, r, ['#4f7dd8', '#1f4fb6', '#0b2c78', '#061a4a']);
  c.save(); circle(c, x, y, r); c.clip(); c.translate(x, y); c.rotate(rot);
  const ox = r * 0.08, oy = r * 0.06;
  for (const [col, k] of [['#ffffff', 0.66], ['#5ab4ff', 0.47], ['#0b1022', 0.25]]) { c.fillStyle = col; circle(c, ox, oy, r * k); c.fill(); }
  c.lineWidth = r * 0.05; c.strokeStyle = 'rgba(11,44,120,.5)'; circle(c, ox, oy, r * 0.66); c.stroke();
  c.restore();
  sphereOver(c, x, y, r, 0.35);
}
// Lav: koyu kabuk, kızgın çatlak ağı (sabit tohumla, oyuncak birimlerinde birim çember içinde)
const LAVA_CRACKS = (() => {
  const rand = rng(77), out = [];
  const grow = (x, y, a, n, w) => {
    const pts = [[x, y]];
    for (let i = 0; i < n; i++) {
      a += (rand() - 0.5) * 0.9; x += Math.cos(a) * 0.17; y += Math.sin(a) * 0.17; pts.push([x, y]);
      if (i === 1 && w > 0.06 && rand() < 0.7) grow(x, y, a + (rand() < 0.5 ? 1 : -1) * (0.7 + rand() * 0.5), 2, w * 0.55);
    }
    out.push({ pts, w });
  };
  for (let k = 0; k < 6; k++) { const a0 = k * TAU / 6 + rand() * 0.6; grow(Math.cos(a0) * 1.05, Math.sin(a0) * 1.05, a0 + Math.PI + (rand() - 0.5) * 0.7, 5, 0.1); }
  return out;
})();
function drawLava(c, x, y, r, rot) {
  shade(c, x, y, r, ['#5e3426', '#33170f', '#190906', '#070201']);
  c.save(); circle(c, x, y, r); c.clip();
  const glow = c.createRadialGradient(x + r * 0.25, y + r * 0.3, 0, x + r * 0.25, y + r * 0.3, r);
  glow.addColorStop(0, 'rgba(255,90,0,.4)'); glow.addColorStop(1, 'rgba(255,60,0,0)');
  c.fillStyle = glow; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.translate(x, y); c.rotate(rot); c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (pts) => { // noktalardan geçen yumuşak eğri
    c.beginPath(); c.moveTo(pts[0][0] * r, pts[0][1] * r);
    for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0] * r, pts[i][1] * r, (pts[i][0] + pts[i + 1][0]) / 2 * r, (pts[i][1] + pts[i + 1][1]) / 2 * r);
    const e = pts[pts.length - 1]; c.lineTo(e[0] * r, e[1] * r);
  };
  for (const [k, col] of [[2.2, 'rgba(255,80,0,.32)'], [1, '#ff6a00'], [0.42, '#ffe066']]) {
    c.strokeStyle = col;
    for (const { pts, w } of LAVA_CRACKS) { path(pts); c.lineWidth = r * w * k; c.stroke(); }
  }
  c.restore();
  sphereOver(c, x, y, r, 0.3);
}
function drawSkin(c, x, y, r, id, rot = 0) {
  if (METALS[id]) { metal(c, x, y, r, METALS[id]); return; }
  if (id === 'glass' || id === 'cateye') { drawMarble(c, x, y, r, rot, id); return; }
  if (id === 'nazar') { drawNazar(c, x, y, r, rot); return; }
  if (id === 'lava') { drawLava(c, x, y, r, rot); return; }
  if (id === 'pearl') {
    shade(c, x, y, r, SKIN_STOPS.pearl);
    const g = c.createLinearGradient(x - r, y - r, x + r, y + r); // sedef parıltısı
    g.addColorStop(0, 'rgba(255,180,220,.3)'); g.addColorStop(0.5, 'rgba(180,240,255,.25)'); g.addColorStop(1, 'rgba(255,240,180,.3)');
    circle(c, x, y, r); c.fillStyle = g; c.fill();
    gloss(c, x, y, r, 0.3);
    return;
  }
  c.save(); circle(c, x, y, r); c.clip();
  c.translate(x, y); c.rotate(rot);
  if (id === 'rainbow') {
    const g = c.createLinearGradient(-r, -r, r, r);
    ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, i) => g.addColorStop(i / 5, col));
    c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2);
  } else if (id === 'galaxy') {
    shade(c, 0, 0, r, SKIN_STOPS.galaxy);
    const g = c.createRadialGradient(r * 0.2, r * 0.1, 0, r * 0.2, r * 0.1, r * 0.7);
    g.addColorStop(0, 'rgba(255,120,200,.7)'); g.addColorStop(1, 'rgba(255,120,200,0)');
    c.fillStyle = g; circle(c, r * 0.2, r * 0.1, r * 0.7); c.fill();
    c.fillStyle = '#fff';
    for (const [a, b, s] of [[-0.5, -0.3, 0.07], [0.4, -0.5, 0.05], [0.1, 0.5, 0.06], [-0.6, 0.4, 0.04], [0.6, 0.2, 0.05], [-0.1, -0.7, 0.04]]) { circle(c, a * r, b * r, s * r); c.fill(); }
  } else if (id === 'football') {
    shade(c, 0, 0, r, SKIN_STOPS.football);
    c.fillStyle = '#1d1d1d';
    const pent = (cx, cy, s, a0) => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = a0 + i * TAU / 5; c.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } c.closePath(); c.fill(); };
    pent(0, 0, r * 0.32, -Math.PI / 2);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5 + Math.PI / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3, a); }
  } else if (id === 'diamond') {
    shade(c, 0, 0, r, SKIN_STOPS.diamond);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * 0.07;
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); c.lineTo(Math.cos(a + TAU / 16) * r, Math.sin(a + TAU / 16) * r); }
    for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); }
    c.stroke();
  }
  c.restore();
  sphereOver(c, x, y, r, 0.45);
}
const skinName = (s) => s.name[LANG === 'en' ? 1 : 0];
