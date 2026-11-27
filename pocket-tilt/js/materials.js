// --- Malzemeler: renk yardımcıları ve kodla üretilen dokular ---
function hexRGB(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
// t > 0 beyaza, t < 0 siyaha doğru
function tint(hex, t, a = 1) {
  const [r, g, b] = hexRGB(hex), to = t > 0 ? 255 : 0, k = Math.abs(t);
  const m = (v) => Math.round(v + (to - v) * k);
  return `rgba(${m(r)},${m(g)},${m(b)},${a})`;
}
function mixHex(a, b, t) {
  const p = hexRGB(a), q = hexRGB(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const luma = (hex) => { const [r, g, b] = hexRGB(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// Kâğıt lifi ve plastik pürüzü için gri gürültü (soft-light ile bindirilir)
let grainCanvas = null;
function grainTexture() {
  if (grainCanvas) return grainCanvas;
  const n = 160, cnv = document.createElement('canvas');
  cnv.width = cnv.height = n;
  const c = cnv.getContext('2d'), img = c.createImageData(n, n), rand = rng(71);
  for (let i = 0; i < n * n; i++) {
    const v = 128 + (rand() - 0.5) * 120 + (rand() < 0.02 ? (rand() - 0.5) * 160 : 0);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = Math.max(0, Math.min(255, v));
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  // birkaç uzun lif
  c.globalAlpha = 0.18; c.lineWidth = 0.6;
  for (let i = 0; i < 70; i++) {
    const x = rand() * n, y = rand() * n, a = rand() * TAU, l = 4 + rand() * 10;
    c.strokeStyle = rand() < 0.5 ? '#000' : '#fff';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  grainCanvas = cnv;
  return cnv;
}
// Dokuyu oyuncak birimli bir tuvale cihaz pikseli ölçeğinde döşer
function grainFill(c, k, alpha, x, y, w, h) {
  const p = c.createPattern(grainTexture(), 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(Math.max(1, devicePixelRatio * 0.7) / k));
  c.save();
  c.globalCompositeOperation = 'soft-light'; c.globalAlpha = alpha;
  c.fillStyle = p; c.fillRect(x, y, w, h);
  c.restore();
}
// Yolun dış çerçevesini (beginPath olmadan) ekler
function outline(c, lv, half, corner) {
  if (lv.shape === 'round') { c.moveTo(half, 0); c.arc(0, 0, half, 0, TAU); return; }
  const x = -half, y = -half, w = half * 2, h = half * 2, r = corner;
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// Kasadaki vida
function screw(c, x, y, r, rot) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,.35)'; circle(c, x + 0.35, y + 0.5, r * 1.05); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d5dbe3'); g.addColorStop(0.8, '#8a93a0'); g.addColorStop(1, '#4b525c');
  circle(c, x, y, r); c.fillStyle = g; c.fill();
  c.translate(x, y); c.rotate(rot);
  c.strokeStyle = 'rgba(40,46,56,.85)'; c.lineWidth = r * 0.32; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-r * 0.62, 0); c.lineTo(r * 0.62, 0); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * 0.12;
  c.beginPath(); c.moveTo(-r * 0.55, r * 0.2); c.lineTo(r * 0.55, r * 0.2); c.stroke();
  c.restore();
}
// Kasanın altına kabartma yazı (oyuncak üstündeki model numarası gibi)
function emboss(c, lv, text, base) {
  c.save();
  c.font = '800 6.4px "Baloo 2", "Arial Rounded MT Bold", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const draw = (dx, dy, col) => {
    c.fillStyle = col;
    if (lv.shape !== 'round') { c.fillText(text, dx, 109.6 + dy); return; }
    // yay üzerinde harf harf
    const r = 109.6, chars = [...text], widths = chars.map((ch) => c.measureText(ch).width + 0.5);
    let a = Math.PI / 2 + widths.reduce((s, w) => s + w, 0) / r / 2;
    chars.forEach((ch, i) => {
      a -= widths[i] / 2 / r;
      c.save(); c.translate(Math.cos(a) * r + dx, Math.sin(a) * r + dy); c.rotate(a - Math.PI / 2); c.fillText(ch, 0, 0); c.restore();
      a -= widths[i] / 2 / r;
    });
  };
  draw(-0.35, -0.45, 'rgba(255,255,255,.38)');
  draw(0.35, 0.45, 'rgba(0,0,0,.32)');
  draw(0, 0, base);
  c.restore();
}
// Panellerin karton dokusu (CSS arka planı için saydam benekler)
function grainCSS() {
  const n = 140, cnv = document.createElement('canvas');
  cnv.width = cnv.height = n;
  const c = cnv.getContext('2d'), rand = rng(5);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rand() < 0.6 ? `rgba(120,90,40,${0.05 + rand() * 0.07})` : `rgba(255,255,255,${0.2 + rand() * 0.3})`;
    c.fillRect(Math.floor(rand() * n), Math.floor(rand() * n), 1 + (rand() < 0.15), 1);
  }
  return cnv.toDataURL();
}
