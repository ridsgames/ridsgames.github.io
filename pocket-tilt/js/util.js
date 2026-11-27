// --- Yardımcılar ---
function rng(seed) { // sabit tohumlu rastgele (labirentler her açılışta aynı olsun)
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function seg(x1, y1, x2, y2, hw = 2.5) { return { t: 's', x1, y1, x2, y2, hw }; }
function post(x, y, r, color) { return { t: 's', x1: x, y1: y, x2: x, y2: y, hw: r, color }; }
function ring(cx, cy, r, gapAt, gap, hw = 2) { return { t: 'a', cx, cy, r, a0: gapAt + gap / 2, a1: gapAt + TAU - gap / 2, hw }; }
function fmt(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
