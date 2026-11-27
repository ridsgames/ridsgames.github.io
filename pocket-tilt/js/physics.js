// --- Fizik ---
// Oyuncak içi 200 birim: yuvarlakta merkezden kenara 100, karede -100..100
function closest(w, x, y) {
  if (w.t === 's') {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, l2 = dx * dx + dy * dy;
    let u = l2 ? ((x - w.x1) * dx + (y - w.y1) * dy) / l2 : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return [w.x1 + u * dx, w.y1 + u * dy];
  }
  const a = Math.atan2(y - w.cy, x - w.cx);
  let rel = (a - w.a0) % TAU; if (rel < 0) rel += TAU;
  if (rel <= w.a1 - w.a0) return [w.cx + Math.cos(a) * w.r, w.cy + Math.sin(a) * w.r];
  const p0 = [w.cx + Math.cos(w.a0) * w.r, w.cy + Math.sin(w.a0) * w.r], p1 = [w.cx + Math.cos(w.a1) * w.r, w.cy + Math.sin(w.a1) * w.r];
  return (x - p0[0]) ** 2 + (y - p0[1]) ** 2 < (x - p1[0]) ** 2 + (y - p1[1]) ** 2 ? p0 : p1;
}
function onIce(z, x, y) {
  if (z.r === undefined) return x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2;
  const d = Math.hypot(x - z.x, y - z.y);
  return d < z.r && d > (z.r0 || 0);
}
function bounce(b, nx, ny, e) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
  if (vn < -25 && !demo) Sfx.click(-vn);
}
function collide(b) {
  const lim = 100 - BALL_R;
  if (L.shape === 'round') {
    const d = Math.hypot(b.x, b.y);
    if (d > lim) { const nx = -b.x / d, ny = -b.y / d; b.x = -nx * lim; b.y = -ny * lim; bounce(b, nx, ny, E_WALL); }
  } else {
    if (b.x > lim) { b.x = lim; bounce(b, -1, 0, E_WALL); } else if (b.x < -lim) { b.x = -lim; bounce(b, 1, 0, E_WALL); }
    if (b.y > lim) { b.y = lim; bounce(b, 0, -1, E_WALL); } else if (b.y < -lim) { b.y = -lim; bounce(b, 0, 1, E_WALL); }
  }
  for (const w of L.walls) {
    if (b.x < w.box[0] || b.y < w.box[1] || b.x > w.box[2] || b.y > w.box[3]) continue;
    const m = BALL_R + w.hw, [qx, qy] = closest(w, b.x, b.y), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= m * m) continue;
    const d = Math.sqrt(d2);
    if (d < 1e-6) continue;
    const nx = dx / d, ny = dy / d;
    b.x = qx + nx * m; b.y = qy + ny * m;
    bounce(b, nx, ny, E_WALL);
  }
}
function step() {
  const ax = tilt.x * TILT_G, ay = tilt.y * TILT_G;
  simTime += DT;
  for (const b of balls) {
    if (b.fall) continue;
    const iced = L.ice.length && L.ice.some((z) => onIce(z, b.x, b.y));
    let fx = iced ? ax * ICE_SLIDE : ax, fy = iced ? ay * ICE_SLIDE : ay, damp = iced ? FRICTION * ICE : FRICTION;
    for (const [x, y] of L.dimples) {
      const dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy < DIMPLE_R * DIMPLE_R) { fx -= dx / DIMPLE_R * WELL * TILT_G; fy -= dy / DIMPLE_R * WELL * TILT_G; damp += WELL_DAMP; }
    }
    let nearHole = false;
    for (const [x, y] of L.holes) {
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
      if (d < HOLE_R - 1) { b.fall = 1e-3; b.x = x; b.y = y; if (!demo) onFall(b); break; }
      if (d < HOLE_R + 2) { fx -= dx / d * HOLE_PULL * TILT_G; fy -= dy / d * HOLE_PULL * TILT_G; }
      if (d < HOLE_R + BALL_R + 10) nearHole = true;
    }
    if (b.fall) continue;
    // Kaldığın yerden devam için güvenli nokta: deliklerden uzakta, yavaşken
    if (!nearHole && simTime - b.safeAt > 0.25) { b.safe = [b.x, b.y]; b.safeAt = simTime; }
    b.vx += fx * DT; b.vy += fy * DT;
    const k = Math.max(0, 1 - damp * DT); b.vx *= k; b.vy *= k;
    const s = Math.hypot(b.vx, b.vy);
    if (s > MAX_V) { b.vx *= MAX_V / s; b.vy *= MAX_V / s; }
    b.x += b.vx * DT; b.y += b.vy * DT;
    b.rot += b.vx * DT / BALL_R; // desenli bilyeler yuvarlanırken dönsün
  }
  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
    const a = balls[i], c = balls[j];
    if (a.fall || c.fall) continue;
    const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, m = 2 * BALL_R;
    if (d2 >= m * m || d2 === 0) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, o = (m - d) / 2;
    a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o;
    const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
    if (vn < 0) {
      const k = (1 + E_BALL) / 2 * vn;
      a.vx += k * nx; a.vy += k * ny; c.vx -= k * nx; c.vy -= k * ny;
      if (vn < -25 && !demo) Sfx.click(-vn);
    }
  }
  for (const b of balls) if (!b.fall) collide(b);
  // Yuvaya oturma ve bitiş
  let full = true;
  L.dimples.forEach(([x, y, k], i) => {
    let held = false;
    for (const b of balls) {
      if (b.fall) continue;
      const d = Math.hypot(b.x - x, b.y - y), sp = Math.hypot(b.vx, b.vy);
      if (d < DIMPLE_R * 0.55 && sp < 80) {
        if (b.dimple !== i) { b.dimple = i; if (!demo) onSeat(b, x, y, k); }
        held = held || (sp < 40 && (!k || b.c === k));
      } else if (b.dimple === i && d > DIMPLE_R) b.dimple = -1;
    }
    if (!held) full = false;
  });
  winHold = full && !demo ? winHold + DT : 0;
  if (winHold > 0.5) win();
}
