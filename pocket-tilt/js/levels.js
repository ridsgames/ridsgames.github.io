// --- Labirent üretimi ---
// Kare labirent. opts: starts/goals [[satır, sütun, renk]], every (her kaçıncı dönüşe köşe tuzağı), dead (kaç çıkmaz sokağa tuzak)
function maze(n, seed, opts = {}) {
  const rand = rng(seed), cell = 200 / n, X = c => -100 + c * cell, Y = r => -100 + r * cell;
  const right = [...Array(n)].map(() => Array(n).fill(true)); // hücrenin sağında duvar var mı
  const down = [...Array(n)].map(() => Array(n).fill(true));  // hücrenin altında duvar var mı
  const seen = [...Array(n)].map(() => Array(n).fill(false));
  const stack = [[n - 1, 0]]; seen[n - 1][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen[a][b]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(rand() * nb.length)];
    if (a === r) right[r][Math.min(b, c)] = false; else down[Math.min(a, r)][c] = false;
    seen[a][b] = true; stack.push([a, b]);
  }
  // Aynı çizgideki duvarları birleştir
  const walls = [];
  for (let c = 0; c < n - 1; c++) for (let r = 0; r < n; r++) {
    if (!right[r][c]) continue;
    let e = r; while (e + 1 < n && right[e + 1][c]) e++;
    walls.push(seg(X(c + 1), Y(r), X(c + 1), Y(e + 1))); r = e;
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) {
    if (!down[r][c]) continue;
    let e = c; while (e + 1 < n && down[r][e + 1]) e++;
    walls.push(seg(X(c), Y(r + 1), X(e + 1), Y(r + 1))); c = e;
  }
  const open = (r, c, dr, dc) => dc === 1 ? c < n - 1 && !right[r][c] : dc === -1 ? c > 0 && !right[r][c - 1]
    : dr === 1 ? r < n - 1 && !down[r][c] : r > 0 && !down[r - 1][c];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]], key = (r, c) => r * n + c;
  const starts = opts.starts || [[n - 1, 0, 0]], goals = opts.goals || [[0, n - 1, 0]];
  // Her bilyenin başlangıcından kendi hedefine giden yol
  const paths = starts.map(([sr, sc], i) => {
    const prev = { [key(sr, sc)]: null }, q = [[sr, sc]];
    while (q.length) {
      const [r, c] = q.shift();
      for (const [dr, dc] of DIRS) {
        if (!open(r, c, dr, dc) || key(r + dr, c + dc) in prev) continue;
        prev[key(r + dr, c + dc)] = [r, c]; q.push([r + dr, c + dc]);
      }
    }
    const path = [];
    for (let p = [goals[i][0], goals[i][1]]; p; p = prev[key(p[0], p[1])]) path.unshift(p);
    return path;
  });
  const centre = (r, c) => [X(c) + cell / 2, Y(r) + cell / 2];
  const holes = [];
  if (opts.every) {
    // Yol dönerken dış köşeye delik: içten dönen bilye geçer, savrulan düşer
    const off = cell * (opts.cornerOffset || 0.245), path = paths[0];
    for (let i = 1, turn = 0; i < path.length - 1; i++) {
      const d1 = [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]];
      const d2 = [path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]];
      if (d1[0] === d2[0] && d1[1] === d2[1]) continue;
      if (turn++ % opts.every) continue;
      const [x, y] = centre(path[i][0], path[i][1]);
      holes.push([x + (d1[1] - d2[1]) * off, y + (d1[0] - d2[0]) * off]);
    }
  }
  if (opts.dead) {
    // Yolların dışındaki çıkmaz sokaklardan bazılarına delik
    const used = new Set(paths.flat().map(([r, c]) => key(r, c))), dead = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!used.has(key(r, c)) && DIRS.filter(([dr, dc]) => open(r, c, dr, dc)).length === 1) dead.push(centre(r, c));
    }
    for (let i = dead.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [dead[i], dead[j]] = [dead[j], dead[i]]; }
    holes.push(...dead.slice(0, opts.dead));
  }
  return {
    walls, holes: opts.goalClearance ? holes.filter(([x, y]) => goals.every(([r, c]) => {
      const [gx, gy] = centre(r, c); return Math.hypot(x - gx, y - gy) >= opts.goalClearance;
    })) : holes, route: paths[0].map(([r, c]) => centre(r, c)),
    balls: starts.map(([r, c, k]) => [...centre(r, c), k]), dimples: goals.map(([r, c, k]) => [...centre(r, c), k])
  };
}
// Yuvarlak (halkalı) labirent: R halka, merkezde hedef yuva, başlangıç dış halkanın altında. opts.dead: çıkmaz sokak tuzağı sayısı
function polarMaze(R, seed, opts = {}) {
  const rand = rng(seed), r0 = 22, rw = (100 - r0) / R, rings = [{ n: 1, rin: 0, rout: r0 }];
  for (let k = 1, n = 6; k <= R; k++) {
    const rin = r0 + (k - 1) * rw;
    if (k > 1 && TAU * rin / (2 * n) >= 30) n *= 2; // hücreler çok genişlerse ikiye böl
    rings.push({ n, rin, rout: rin + rw });
  }
  const id = (k, j) => k ? `${k},${j}` : '0', edges = [];
  for (let k = 1; k <= R; k++) {
    const { n, rin, rout } = rings[k], da = TAU / n;
    for (let j = 0; j < n; j++) {
      const a = (j + 1) * da;
      edges.push([id(k, j), id(k, (j + 1) % n), seg(Math.cos(a) * rin, Math.sin(a) * rin, Math.cos(a) * rout, Math.sin(a) * rout, 2)]);
      const inner = k === 1 ? id(0) : id(k - 1, Math.floor(j / (n / rings[k - 1].n)));
      edges.push([id(k, j), inner, { t: 'a', cx: 0, cy: 0, r: rin, a0: j * da, a1: (j + 1) * da, hw: 2 }]);
    }
  }
  const adj = {};
  for (const e of edges) for (const [p, q] of [[e[0], e[1]], [e[1], e[0]]]) (adj[p] = adj[p] || []).push([q, e]);
  // Yayılan ağaç: açılan kenarlarda duvar yok
  const seen = new Set([id(0)]), stack = [id(0)], openE = new Set(), tree = {};
  while (stack.length) {
    const cur = stack[stack.length - 1], nb = adj[cur].filter(([q]) => !seen.has(q));
    if (!nb.length) { stack.pop(); continue; }
    const [q, e] = nb[Math.floor(rand() * nb.length)];
    openE.add(e); seen.add(q); stack.push(q);
    (tree[cur] = tree[cur] || []).push([q, e]); (tree[q] = tree[q] || []).push([cur, e]);
  }
  // Duvarlar; aynı yarıçaptaki bitişik yayları birleştir
  const walls = edges.filter((e) => !openE.has(e)).map((e) => e[2]), arcs = walls.filter((w) => w.t === 'a').sort((a, b) => a.r - b.r || a.a0 - b.a0);
  const merged = [];
  for (const w of arcs) {
    const p = merged[merged.length - 1];
    if (p && p.r === w.r && Math.abs(p.a1 - w.a0) < 1e-9) p.a1 = w.a1; else merged.push({ ...w });
  }
  const centre = (c) => {
    if (c === id(0)) return [0, 0];
    const [k, j] = c.split(',').map(Number), { n, rin, rout } = rings[k], a = (j + 0.5) * TAU / n;
    return [Math.cos(a) * (rin + rout) / 2, Math.sin(a) * (rin + rout) / 2];
  };
  const door = (w) => w.t === 'a' ? [Math.cos((w.a0 + w.a1) / 2) * w.r, Math.sin((w.a0 + w.a1) / 2) * w.r] : [(w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2];
  const startCell = id(R, Math.floor(Math.PI / 2 / (TAU / rings[R].n)));
  // Başlangıçtan merkeze yol: hücre ortaları ve aradaki kapılar
  const prev = { [startCell]: null }, q = [startCell];
  while (q.length) { const c = q.shift(); for (const [nx, e] of tree[c] || []) if (!(nx in prev)) { prev[nx] = [c, e]; q.push(nx); } }
  const route = [centre(id(0))], onPath = new Set([id(0)]);
  for (let c = id(0); prev[c]; c = prev[c][0]) { route.unshift(centre(prev[c][0]), door(prev[c][1][2])); onPath.add(prev[c][0]); }
  const holes = [];
  if (opts.dead) {
    const dead = Object.keys(tree).filter((c) => !onPath.has(c) && tree[c].length === 1).map(centre);
    for (let i = dead.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [dead[i], dead[j]] = [dead[j], dead[i]]; }
    holes.push(...dead.slice(0, opts.dead));
  }
  return { walls: [...walls.filter((w) => w.t !== 'a'), ...merged], holes, route, balls: [[...centre(startCell), 0]], dimples: [[0, 0, 0]] };
}
// --- Oyuncak resimleri (oyuncak birimleriyle çizilir) ---
function confetti(c, seed, n, colors, size) {
  const rand = rng(seed);
  for (let i = 0; i < n; i++) { c.fillStyle = colors[i % colors.length]; circle(c, rand() * 200 - 100, rand() * 200 - 100, size * (0.6 + rand() * 0.8)); c.fill(); }
}
function star(c, x, y, R, r, color) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
  c.closePath(); c.fillStyle = color; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.2)'; c.stroke();
}
function artMaze(c, L) {
  confetti(c, 11, 320, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.18)'], 1);
  for (const [x, y, k] of L.balls) { circle(c, x, y, 11); c.fillStyle = k ? COLORS[k].light : 'rgba(46,160,67,.4)'; c.fill(); }
  for (const [x, y, k] of L.dimples) star(c, x, y, 15, 7, k ? COLORS[k].light : '#ffcf33');
}
function artSpace(c, L) {
  confetti(c, 5, 90, ['rgba(255,255,255,.75)', 'rgba(255,255,255,.35)', 'rgba(255,224,102,.6)'], 1.1);
  const g = c.createRadialGradient(-5, -5, 2, 0, 0, 20); g.addColorStop(0, '#fff3bf'); g.addColorStop(1, L.planet || '#ff922b');
  circle(c, 0, 0, 20); c.fillStyle = g; c.fill();
}
function artPitch(c) {
  for (let i = 0; i < 8; i += 2) { c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(-100, -100 + i * 25, 200, 25); }
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-100, 20); c.lineTo(100, 20); c.stroke();
  circle(c, 0, 20, 24); c.stroke(); circle(c, 0, 20, 2.5); c.fillStyle = '#fff'; c.fill();
  c.strokeRect(-62, -100, 124, 52);
  c.save(); c.beginPath(); c.rect(-36, -100, 72, 36); c.clip();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-36, -100, 72, 36);
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1;
  for (let k = -110; k < 40; k += 7) { c.beginPath(); c.moveTo(k, -100); c.lineTo(k + 40, -60); c.moveTo(k + 40, -100); c.lineTo(k, -60); c.stroke(); }
  c.restore();
}
function artRooms(c, L) {
  confetti(c, 9, 70, ['rgba(255,135,135,.35)', 'rgba(116,192,252,.35)', 'rgba(255,212,59,.45)'], 3);
  const pal = ['#ff8787', '#74c0fc', '#ffd43b', '#8ce99a', '#da77f2', '#ffa94d'];
  L.dimples.forEach(([x, y, k], i) => { circle(c, x, y, 16); c.fillStyle = k ? COLORS[k].light : pal[i % pal.length]; c.fill(); });
  c.fillStyle = 'rgba(250,82,82,.35)';
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.ellipse(Math.cos(a) * 14, Math.sin(a) * 14, 10, 6, a, 0, TAU); c.fill(); }
  circle(c, 0, 0, 7); c.fillStyle = '#fab005'; c.fill();
}
function artDie(c, L) {
  rrect(c, -92, -92, 184, 184, 22); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.08)'; c.stroke();
  for (const [x, y, k] of L.dimples) { circle(c, x, y, 15); c.fillStyle = k ? COLORS[k].light : '#1d1d1d'; c.fill(); }
}
function artDomino(c) {
  rrect(c, -58, -96, 116, 192, 14); c.fillStyle = '#fbf6ea'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.15)'; c.stroke();
  c.fillStyle = '#1d1d1d';
  for (const [x, y] of [[30, -72], [-30, -28], [-30, 28], [0, 50], [30, 72]]) { circle(c, x, y, 13); c.fill(); }
}
function artTint(c, L) {
  confetti(c, 17, 80, ['rgba(255,255,255,.5)', 'rgba(0,0,0,.05)'], 2.4);
  for (const [x, y, k] of L.dimples) { circle(c, x, y, 26); c.fillStyle = k ? COLORS[k].light : '#74c0fc'; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1; }
}
function artCorners(c, L) {
  confetti(c, 19, 120, ['rgba(255,255,255,.4)', 'rgba(0,0,0,.05)'], 2);
  for (const [x, y, k] of L.dimples) {
    c.fillStyle = COLORS[k].light; c.globalAlpha = 0.6;
    c.fillRect(Math.min(x * 48 / 74, x * 100 / 74), Math.min(y * 48 / 74, y * 100 / 74), 52, 52); c.globalAlpha = 1;
  }
}

function artGolf(c, L) { // çim şeritleri, bayrak, başlama noktası
  for (let i = -6; i < 6; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,60,0,.06)'; c.save(); c.rotate(-0.5); c.fillRect(i * 34, -160, 34, 320); c.restore(); }
  const [hx, hy] = L.dimples[0], [bx, by] = L.balls[0];
  circle(c, hx, hy, 19); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill(); // yeşil alan
  c.strokeStyle = '#f1f3f5'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy - 30); c.stroke();
  c.beginPath(); c.moveTo(hx, hy - 30); c.lineTo(hx - 20, hy - 24); c.lineTo(hx, hy - 18); c.closePath(); c.fillStyle = '#e8463a'; c.fill();
  circle(c, bx, by, 14); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); // başlama halısı
}
function artSmile(c) {
  confetti(c, 21, 60, ['rgba(255,255,255,.55)', 'rgba(255,212,59,.5)'], 2.4);
  circle(c, 0, 0, 90); c.fillStyle = '#ffd43b'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#f59f00'; c.stroke();
  const g = c.createRadialGradient(-30, -40, 4, 0, 0, 90); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
  circle(c, 0, 0, 89); c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,105,135,.4)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 56, 16, 13, 9, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#fff'; c.strokeStyle = '#7a4a00'; c.lineWidth = 2;
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 30, -28, 15, 18, 0, 0, TAU); c.fill(); c.stroke(); }
  c.lineWidth = 4; c.lineCap = 'round';
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 30, -50, 13, 1.25 * Math.PI, 1.75 * Math.PI); c.stroke(); }
}
function artOwl(c) {
  confetti(c, 23, 70, ['rgba(255,255,255,.7)', 'rgba(255,255,255,.3)', 'rgba(255,224,102,.55)'], 1.2);
  c.fillStyle = '#fff3bf'; circle(c, 58, -62, 16); c.fill(); c.fillStyle = '#24335c'; circle(c, 66, -68, 14); c.fill(); // hilal
  c.strokeStyle = '#6b4226'; c.lineWidth = 9; c.beginPath(); c.moveTo(-100, 86); c.quadraticCurveTo(0, 78, 100, 90); c.stroke(); // dal
  c.fillStyle = '#8d5a3b';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 30, -56); c.lineTo(s * 60, -84); c.lineTo(s * 62, -40); c.closePath(); c.fill(); }
  c.beginPath(); c.ellipse(0, 12, 70, 76, 0, 0, TAU); c.fill();
  c.fillStyle = '#a9714b'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 62, 24, 16, 42, s * 0.25, 0, TAU); c.fill(); } // kanatlar
  c.beginPath(); c.ellipse(0, 40, 42, 44, 0, 0, TAU); c.fillStyle = '#e8c9a0'; c.fill();
  c.strokeStyle = 'rgba(141,90,59,.55)'; c.lineWidth = 2;
  for (const [x, y] of [[-12, 26], [12, 26], [-24, 42], [0, 42], [24, 42], [-12, 58], [12, 58]]) { c.beginPath(); c.moveTo(x - 5, y - 2); c.lineTo(x, y + 3); c.lineTo(x + 5, y - 2); c.stroke(); }
  c.fillStyle = '#fff3d6'; for (const s of [-1, 1]) { circle(c, s * 34, -20, 27); c.fill(); }
  c.beginPath(); c.moveTo(-8, -4); c.lineTo(8, -4); c.lineTo(0, 12); c.closePath(); c.fillStyle = '#f59f00'; c.fill();
  c.fillStyle = '#f59f00'; for (const s of [-1, 1]) for (const d of [-6, 0, 6]) { c.beginPath(); c.ellipse(s * 22 + d, 82, 3, 6, 0, 0, TAU); c.fill(); }
}
function artSnowman(c) {
  confetti(c, 25, 90, ['rgba(255,255,255,.9)', 'rgba(255,255,255,.5)'], 1.8);
  c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 104, 130, 34, 0, 0, TAU); c.fill(); // kar
  for (const [y, r] of [[38, 48], [-38, 28]]) {
    const g = c.createRadialGradient(-r * 0.35, y - r * 0.35, r * 0.1, 0, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dbe9f5');
    circle(c, 0, y, r); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(80,120,160,.35)'; c.stroke();
  }
  c.fillStyle = '#d6336c'; rrect(c, -27, -14, 54, 10, 5); c.fill(); rrect(c, 12, -10, 11, 26, 4); c.fill(); // atkı
  c.fillStyle = '#212529'; rrect(c, -27, -68, 54, 7, 3); c.fill(); rrect(c, -17, -92, 34, 26, 3); c.fill();
  c.fillStyle = '#e03131'; c.fillRect(-17, -74, 34, 5);
  c.fillStyle = '#212529'; for (const s of [-1, 1]) { circle(c, s * 10, -44, 3.2); c.fill(); }
  for (let i = 0; i < 5; i++) { circle(c, -12 + i * 6, -26 + Math.abs(i - 2) * -1.6 + 2, 1.8); c.fill(); }
  c.beginPath(); c.moveTo(0, -39); c.lineTo(26, -35); c.lineTo(0, -32); c.closePath(); c.fillStyle = '#f76707'; c.fill();
}
function artClock(c) {
  circle(c, 0, 0, 96); c.fillStyle = '#fffdf5'; c.fill();
  c.strokeStyle = '#495057'; c.lineCap = 'butt';
  for (let i = 0; i < 60; i++) {
    const a = i * TAU / 60, big = i % 5 === 0, r0 = big ? 82 : 87;
    c.lineWidth = big ? 3 : 1.2; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 93, Math.sin(a) * 93); c.stroke();
  }
  c.fillStyle = '#868e96'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [n, a] of [[1, -60], [2, -30], [4, 30], [5, 60], [7, 120], [8, 150], [10, 210], [11, 240]]) c.fillText(n, Math.cos(a * Math.PI / 180) * 70, Math.sin(a * Math.PI / 180) * 70);
}
function artPinball(c, L) {
  confetti(c, 27, 80, ['rgba(255,255,255,.55)', 'rgba(102,217,232,.5)', 'rgba(247,131,172,.5)'], 1.3);
  for (const w of L.walls) if (w.color && w.x1 === w.x2 && w.y1 === w.y2) { // tampon parıltısı
    const g = c.createRadialGradient(w.x1, w.y1, w.hw, w.x1, w.y1, w.hw + 12); g.addColorStop(0, w.color + 'aa'); g.addColorStop(1, w.color + '00');
    circle(c, w.x1, w.y1, w.hw + 12); c.fillStyle = g; c.fill();
  }
  for (const [x, y, k] of L.dimples) { const col = k ? COLORS[k].light : '#ffd43b'; circle(c, x, y, 15); c.fillStyle = col + '59'; c.fill(); c.lineWidth = 2; c.strokeStyle = col; c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.35)';
  for (const y of [-40, -28]) { c.beginPath(); c.moveTo(0, y - 8); c.lineTo(9, y + 2); c.lineTo(-9, y + 2); c.closePath(); c.fill(); }
}
function artDaisy(c, L) {
  confetti(c, 29, 80, ['rgba(255,255,255,.6)', 'rgba(255,169,77,.5)', 'rgba(218,119,242,.4)'], 2);
  const [cx, cy] = [0, -8];
  c.strokeStyle = '#2f9e44'; c.lineWidth = 7; c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(-14, 60, 6, 110); c.stroke();
  c.fillStyle = '#51cf66'; c.beginPath(); c.ellipse(-22, 74, 20, 8, 0.6, 0, TAU); c.fill();
  for (const [x, y, k] of L.dimples) {
    const a = Math.atan2(y - cy, x - cx);
    c.save(); c.translate(cx, cy); c.rotate(a);
    c.beginPath(); c.ellipse(46, 0, 34, 18, 0, 0, TAU); c.fillStyle = k ? COLORS[k].light : '#ffffff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.12)'; c.stroke();
    c.restore();
  }
}
function artPool(c, L) {
  c.fillStyle = 'rgba(0,0,0,.14)'; rrect(c, -100, -100, 200, 200, 7); c.fill();
  c.fillStyle = '#1f9d55'; rrect(c, -90, -90, 180, 180, 4); c.fill();
  const g = c.createRadialGradient(0, -10, 10, 0, 0, 130); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  c.fillStyle = g; c.fillRect(-90, -90, 180, 180);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-90, 48); c.lineTo(90, 48); c.stroke();
  circle(c, 0, 48, 2.5); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); circle(c, 0, -48, 2.5); c.fill();
  c.fillStyle = '#f1e3b1'; for (const k of [-45, 45]) for (const s of [-1, 1]) { c.save(); c.translate(k, s * 95); c.rotate(Math.PI / 4); c.fillRect(-2.2, -2.2, 4.4, 4.4); c.restore(); }
  c.fillStyle = '#16120e'; for (const [x, y] of L.dimples) { circle(c, x, y, 12.5); c.fill(); } // cepler
}
function artBowling(c) {
  for (let i = -5; i <= 5; i++) { c.fillStyle = i % 2 ? 'rgba(120,70,20,.08)' : 'rgba(255,255,255,.08)'; c.fillRect(i * 18 - 9, -100, 18, 200); }
  c.fillStyle = 'rgba(70,40,10,.28)'; for (const s of [-1, 1]) c.fillRect(s > 0 ? 64 : -100, -30, 36, 130); // oluklar
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-100, -100, 200, 70); // lobut alanı
  c.fillStyle = '#c0392b';
  for (const x of [-36, -18, 0, 18, 36]) { const y = 30 + Math.abs(x) * 0.4; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 4.5, y + 3); c.lineTo(x - 4.5, y + 3); c.closePath(); c.fill(); }
  c.fillStyle = 'rgba(60,30,10,.45)'; c.fillRect(-62, 58, 124, 2.5); // faul çizgisi
}
function artEggs(c, L) {
  c.fillStyle = 'rgba(224,49,49,.18)'; for (let i = -6; i < 6; i++) { c.fillRect(i * 20, -100, 10, 200); c.fillRect(-100, i * 20, 200, 10); } // pötikare örtü
  c.fillStyle = '#e9dcc3'; rrect(c, -58, -94, 116, 134, 10); c.fill(); c.lineWidth = 2; c.strokeStyle = '#cdb894'; c.stroke();
  for (const [x, y] of L.dimples) {
    const g = c.createRadialGradient(x - 4, y - 5, 3, x, y, 18); g.addColorStop(0, '#d8c7a6'); g.addColorStop(1, '#f3e9d6');
    circle(c, x, y, 17); c.fillStyle = g; c.fill();
  }
}

function artTraffic(c, L) {
  confetti(c, 31, 40, ['rgba(255,255,255,.6)'], 2);
  c.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, s] of [[-66, -64, 1], [70, -20, 0.8], [-62, 40, 0.9]]) for (const [dx, dy, r] of [[-12, 2, 10], [0, -4, 13], [13, 2, 10]]) { circle(c, x + dx * s, y + dy * s, r * s); c.fill(); }
  c.fillStyle = '#495057'; c.fillRect(-6, 84, 12, 20); // direk
  rrect(c, -34, -88, 68, 176, 14); c.fillStyle = '#343a40'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#212529'; c.stroke();
  for (const [x, y, k] of L.dimples) {
    circle(c, x, y, 20); c.fillStyle = '#212529'; c.fill();
    const g = c.createRadialGradient(x - 5, y - 6, 2, x, y, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, COLORS[k].light); g.addColorStop(1, COLORS[k].base);
    circle(c, x, y, 17); c.fillStyle = g; c.fill();
  }
}
function artWheel(c, L) {
  for (const [x, y, k] of L.dimples) {
    const a = Math.atan2(y, x);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 110, a - Math.PI / 4, a + Math.PI / 4); c.closePath();
    c.fillStyle = COLORS[k].light; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
  }
  circle(c, 0, 0, 48); c.fillStyle = '#ffffff'; c.fill();
}
function artRainbow(c, L) {
  const cy = 40, bands = [[200, 1], [84, 3], [62, 4], [40, 2]];
  for (const [r, k] of bands) { c.beginPath(); c.moveTo(-r, cy); c.arc(0, cy, r, Math.PI, TAU); c.closePath(); c.fillStyle = COLORS[k].light; c.globalAlpha = 0.45; c.fill(); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(255,255,255,.95)';
  for (const s of [-1, 1]) for (const [dx, dy, r] of [[-14, 4, 11], [0, -3, 14], [14, 4, 11]]) { circle(c, s * 51 + dx, cy + 6 + dy, r); c.fill(); }
}

function artPalette(c, L) { // ahşap boya paleti, başparmak deliği, boya lekeleri
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -5; i < 5; i++) c.fillRect(i * 22, -100, 2, 200);
  c.beginPath(); c.moveTo(-60, -84); c.bezierCurveTo(10, -104, 96, -70, 92, 4); c.bezierCurveTo(88, 70, 30, 96, -24, 88);
  c.bezierCurveTo(-60, 82, -52, 50, -76, 36); c.bezierCurveTo(-98, 22, -100, -60, -60, -84); c.closePath();
  c.fillStyle = '#e3b778'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#b5833f'; c.stroke();
  circle(c, -52, 8, 13); c.fillStyle = '#c99a5b'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a2702f'; c.stroke(); // başparmak deliği
  for (const [x, y, k] of L.dimples) {
    c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i * TAU / 12, r = 18 + (i % 2 ? 2.5 : -1.5); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fillStyle = COLORS[k].base; c.fill();
  }
  const [w] = L.walls; // fırça ucu
  c.save(); c.translate(w.x2, w.y2); c.rotate(Math.atan2(w.y2 - w.y1, w.x2 - w.x1));
  c.fillStyle = '#adb5bd'; c.fillRect(-2, -5, 10, 10); c.beginPath(); c.moveTo(8, -5); c.quadraticCurveTo(26, 0, 8, 5); c.closePath(); c.fillStyle = '#e03131'; c.fill();
  c.restore();
}
function artTarget(c, L) { // okçuluk hedefi: her halka kendi renginde
  const bands = [[100, 1], [76, 2], [51, 3], [27, 4]];
  for (const [r, k] of bands) { circle(c, 0, 0, r); c.fillStyle = COLORS[k].light; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1; }
  confetti(c, 33, 50, ['rgba(255,255,255,.45)'], 1.6);
}

// --- Bölümler ---
// Renkli bilye yalnızca kendi rengindeki yuvaya sayılır (0: renksiz çelik)
const COLORS = [null,
  { base: '#e03131', light: '#ff8787', dark: '#7a1010' },
  { base: '#1c7ed6', light: '#74c0fc', dark: '#0b3d73' },
  { base: '#f59f00', light: '#ffe066', dark: '#8a5a00' },
  { base: '#2f9e44', light: '#8ce99a', dark: '#145a24' }];
function rooms(n, dist = 54, alt = false, colors = []) { // merkezden açılan odalar; alt: tek sıradakiler dışa açılır
  const walls = [], dimples = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * TAU / n, x = Math.cos(a) * dist, y = Math.sin(a) * dist;
    walls.push(ring(x, y, 18, alt && i % 2 ? a : a + Math.PI, 1.4)); dimples.push([x, y, colors[i] || 0]);
  }
  return { walls, dimples };
}
function cluster(k, r, colors = []) { // merkezde toplu başlayan bilyeler
  return [...Array(k)].map((_, i) => { const a = Math.PI / 2 + 0.3 + i * TAU / k; return [Math.cos(a) * r, Math.sin(a) * r, colors[i] || 0]; });
}
function arcRoute(r, a0, a1) {
  const n = Math.ceil(Math.abs(a1 - a0) / 0.25);
  return [...Array(n + 1)].map((_, i) => { const a = a0 + (a1 - a0) * i / n; return [Math.cos(a) * r, Math.sin(a) * r]; });
}
const PIPS = { c: [0, 0], tl: [-52, -52], tr: [52, -52], ml: [-52, 0], mr: [52, 0], bl: [-52, 52], br: [52, 52] };
const FACES = [['c'], ['tr', 'bl'], ['tr', 'c', 'bl'], ['tl', 'tr', 'bl', 'br'], ['tl', 'tr', 'c', 'bl', 'br'], ['tl', 'tr', 'ml', 'mr', 'bl', 'br']];
const DIE_RIMS = ['#e8463a', '#2f6fd8', '#2f9e44', '#7b3fa0', '#f08c00', '#1f2a44'];
function die(k, colors) { // colors: yuva renkleri ve sırasıyla bilye renkleri
  return { name: `${t('dice', 'Zar')} ${k}`, shape: 'square', rim: DIE_RIMS[k - 1], bg: '#fbf6ea', art: artDie,
    dimples: FACES[k - 1].map((p, i) => [...PIPS[p], colors ? colors[0][i] : 0]), balls: [...Array(k)].map((_, i) => [(i - (k - 1) / 2) * 26, 84, colors ? colors[1][i] : 0]) };
}
const MAZE_PAL = [['#2f6fd8', '#e9cf9c'], ['#7b3fa0', '#bfe3c0'], ['#e8463a', '#cfe3f7'], ['#f08c00', '#eadcff'], ['#1f9e89', '#ffe3c2']];
function M(i, n, seed, opts, extra) { // kare labirent bölümü
  return { shape: 'square', rim: MAZE_PAL[i % 5][0], bg: MAZE_PAL[i % 5][1], wall: '#ffffff', art: artMaze, maze: [n, seed, opts], ...extra };
}
const SPACE_PAL = [['#ff922b', '#1d2b53', '#ffd8a8', '#ff922b'], ['#22b8cf', '#1b2a4a', '#c5f6fa', '#3bc9db'], ['#f06595', '#2b1d4f', '#ffdeeb', '#f783ac'], ['#fab005', '#123d4a', '#fff3bf', '#ffd43b']];
const onCircle = (r, deg, cy = 0) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r + cy];
function space(i) { const [rim, bg, wall, planet] = SPACE_PAL[i % 4]; return { shape: 'round', rim, bg, wall, planet, art: artSpace }; }
function P(i, R, seed, opts, extra) { return { ...space(i), polar: [R, seed, opts], ...extra }; } // halkalı labirent bölümü
// Elle çizilmiş halkalar: rings [yarıçap, boşluk açısı, boşluk genişliği], bars [açı, iç, dış] (derece), holes [açı, yarıçap]
// path: başlangıçtan hedefe sırayla [yarıçap, başlangıç açısı, bitiş açısı] yayları
function ringsLevel(i, rings, bars, holes, path, extra) {
  const D = Math.PI / 180;
  return { ...space(i), dimples: [[0, 0]], balls: [onCircle(path[0][0], path[0][1])],
    walls: [...rings.map(([r, at, gap]) => ring(0, 0, r, at * D, gap)), ...bars.map(([a, r0, r1]) => seg(...onCircle(r0, a), ...onCircle(r1, a)))],
    holes: holes.map(([a, r]) => onCircle(r, a)), route: [...path.flatMap(([r, a0, a1]) => arcRoute(r, a0 * D, a1 * D)), [0, 0]], ...extra };
}
const corners = [[-1, -1, 1], [1, -1, 2], [-1, 1, 3], [1, 1, 4]];
const WORLDS = [
  { name: t('w1', 'Labirentler'), levels: [
    // 21 ve 25 oyuncu geri bildirimiyle yer değiştirdi. 26–30: uzun rota, dar koridor, artan buz.
    M(0, 3, 1),
    M(1, 4, 3),
    M(2, 4, 5),
    M(3, 5, 332),
    M(4, 5, 513),
    M(0, 4, 14, { dead: 2 }),
    M(1, 5, 57, { dead: 3 }),
    M(2, 6, 45),
    M(3, 8, 63),
    M(4, 5, 558, { every: 3, dead: 2 }),
    M(0, 6, 19, { every: 3, dead: 3 }),
    M(1, 6, 11, { every: 3, dead: 3 }, { name: t('lvIce', 'Buz'), ice: [{ x1: -62, y1: -62, x2: 62, y2: 62 }] }),
    M(2, 6, 151, { every: 2, dead: 4 }),
    M(3, 7, 283, { every: 3, dead: 3 }),
    M(4, 7, 41, { every: 3, dead: 4 }),
    M(0, 7, 374, { every: 2, dead: 5 }),
    M(1, 6, 59, { every: 2, dead: 4 }, { name: t('lvIceTraps', 'Buzlu Tuzaklar'), ice: [{ x1: -100, y1: -34, x2: 100, y2: 34 }] }),
    M(2, 7, 339, { every: 2, dead: 6 }),
    M(3, 7, 25, { every: 2, dead: 7 }),
    M(4, 8, 66, { every: 3, dead: 7 }),
    M(4, 8, 125, { every: 2, dead: 9 }),
    M(1, 8, 19, { every: 2, dead: 7 }),
    M(2, 8, 118, { every: 2, dead: 6 }, { name: t('lvIcyMaze', 'Buzlu Labirent'), ice: [{ x1: -100, y1: -100, x2: 100, y2: 100 }] }),
    M(3, 8, 11, { every: 2, dead: 8 }),
    M(0, 8, 26, { every: 2, dead: 6 }),
    // Bilye çapı 12, duvar kalınlığı 5: serbest yanal pay 8 → 5.22 → 3 birim.
    // Dar labirentlerde dış köşe delikleri yolun ortasını kapatmayacak kadar dışarıda tutulur.
    M(1, 8, 127, { every: 1, dead: 8, cornerOffset: 0.32, goalClearance: 17 }, { name: t('lvExpertPath', 'Ustalık Yolu') }),
    M(2, 9, 239, { every: 1, dead: 8, cornerOffset: 0.32, goalClearance: 17 }, { name: t('lvNarrowPass', 'Dar Geçit') }),
    M(3, 9, 977, { every: 1, dead: 8, cornerOffset: 0.32, goalClearance: 17 }, { name: t('lvFrozenTurns', 'Buzlu Kıvrımlar'), ice: [{ x1: -66, y1: -66, x2: 66, y2: 66 }] }),
    M(4, 10, 912, { every: 1, dead: 8, cornerOffset: 0.32, goalClearance: 17 }, { name: t('lvFinalTrial', 'Son Sınav'), ice: [{ x1: -100, y1: -100, x2: 100, y2: 35 }] }),
    M(0, 10, 891, { every: 1, dead: 8, cornerOffset: 0.32, goalClearance: 17 }, { name: t('lvEdgeImpossible', 'İmkânsızın Eşiği'), ice: [{ x1: -100, y1: -100, x2: 100, y2: 100 }] })
  ] },
  { name: t('w2', 'Yuvalar'), levels: [
    // yuva sayısı hiç geri düşmez (en fazla 6); aynı sayıda engelsizden engelliye, buz pistleri sonda
    die(1),
    { name: t('lvGolf', 'Mini Golf'), shape: 'square', rim: '#1f9e89', bg: '#5cb85c', wall: '#fffaf0', art: artGolf,
      walls: [seg(-100, 25, 38, 25), seg(-38, -35, 100, -35)], dimples: [[62, -66]], balls: [[-70, 66]],
      route: [[-70, 66], [70, 64], [70, -5], [-70, -5], [-70, -68], [62, -66]] },
    die(2),
    { name: t('lvOwl', 'Baykuş'), shape: 'round', rim: '#5f3dc4', bg: '#24335c', wall: '#f59f00', art: artOwl,
      walls: [ring(-34, -20, 22, Math.PI / 2, 1.25), ring(34, -20, 22, Math.PI / 2, 1.25)],
      dimples: [[-34, -20], [34, -20]], balls: [[-22, 72], [22, 72]] },
    { name: t('lvSmile', 'Gülen Yüz'), shape: 'round', rim: '#f08c00', bg: '#99e9f2', art: artSmile,
      walls: [{ t: 'a', cx: 0, cy: 8, r: 50, a0: 0.18 * Math.PI, a1: 0.82 * Math.PI, hw: 3.5, color: '#c92a2a' }],
      dimples: [[-30, -28], [30, -28]], balls: [[-18, 82], [18, 82]] },
    die(3),
    { name: t('lvSnowman', 'Kardan Adam'), shape: 'round', rim: '#1c7ed6', bg: '#cfe8ff', wall: '#7a4a24', art: artSnowman,
      walls: [seg(-36, 6, -76, -28), seg(36, 6, 76, -28)],
      dimples: [[0, 12], [0, 38], [0, 64]], balls: [[-72, 46], [72, 46], [-40, 80]] },
    { name: t('lvRooms3', 'Üç Oda'), shape: 'round', rim: '#14a3a3', bg: '#fff1d6', wall: '#5f3dc4', art: artRooms,
      ...rooms(3), balls: cluster(3, 10) },
    { name: t('lvGoal', 'Gol!'), shape: 'square', rim: '#1f2a44', bg: '#2f9e44', wall: '#ffffff', art: artPitch,
      walls: [seg(-36, -100, -36, -64), seg(36, -100, 36, -64), seg(-36, -64, -20, -64), seg(36, -64, 20, -64),
        post(-48, -22, 6, '#2f6fd8'), post(0, -36, 6, '#2f6fd8'), post(48, -22, 6, '#2f6fd8'), post(-24, 14, 6, '#2f6fd8'), post(24, 14, 6, '#2f6fd8')],
      dimples: [[-18, -82], [0, -82], [18, -82]], balls: [[-40, 76], [0, 84], [40, 76]] },
    { name: t('lvRink', 'Buz Pisti'), shape: 'round', rim: '#f08c00', bg: '#e7f5ff', art: artTint, ice: [{ x: 0, y: 0, r: 100 }],
      holes: [[0, 2], [-70, -36], [70, -36]], dimples: [[0, -45], [39, 22], [-39, 22]], balls: [[-40, 74], [0, 84], [40, 74]] },
    die(4),
    { name: t('lvClock', 'Saat'), shape: 'round', rim: '#e8463a', bg: '#fffdf5', wall: '#1f2a44', art: artClock,
      walls: [post(0, 0, 6), seg(0, 0, ...onCircle(40, -150), 3), seg(0, 0, ...onCircle(58, -30), 2.5)],
      dimples: [-90, 0, 90, 180].map((d) => onCircle(62, d)), balls: [[0, 26], [-24, 14], [24, 14], [0, -24]] },
    { name: t('lvRooms4', 'Dört Oda'), shape: 'round', rim: '#5f3dc4', bg: '#e5dbff', wall: '#ffffff', art: artRooms,
      ...rooms(4, 58), balls: cluster(4, 16) },
    { name: t('lvPinball', 'Pinball'), shape: 'square', rim: '#e64980', bg: '#1b2a4a', wall: '#dee2e6', art: artPinball,
      walls: [post(-40, -18, 9, '#ff6b6b'), post(40, -18, 9, '#4dabf7'), post(0, 14, 9, '#ffd43b'), post(-62, 30, 7, '#69db7c'), post(62, 30, 7, '#da77f2'),
        seg(-94, 52, -50, 72), seg(94, 52, 50, 72)],
      dimples: [[-54, -70], [-18, -70], [18, -70], [54, -70]], balls: [[-30, 84], [-10, 86], [10, 86], [30, 84]] },
    { name: t('lvRink2', 'Buz Pisti 2'), shape: 'square', rim: '#1c7ed6', bg: '#e7f5ff', art: artTint, ice: [{ x1: -100, y1: -100, x2: 100, y2: 100 }],
      walls: [post(0, -50, 8), post(50, 0, 8), post(0, 50, 8), post(-50, 0, 8)],
      holes: [[-84, -84], [84, -84], [-84, 84], [84, 84]], dimples: corners.map(([sx, sy]) => [sx * 50, sy * 50]), balls: cluster(4, 14) },
    { name: t('lvIcyRooms', 'Buzlu Odalar'), shape: 'round', rim: '#14a3a3', bg: '#e3fafc', wall: '#1c7ed6', art: artRooms, ice: [{ x: 0, y: 0, r: 100 }],
      ...rooms(4, 58, true), holes: [45, 135, 225, 315].map((d) => onCircle(62, d)), balls: cluster(4, 16) },
    die(5),
    { name: t('lvDomino', 'Domino'), shape: 'square', rim: '#1f2a44', bg: '#2b8a3e', wall: '#495057', art: artDomino,
      walls: [seg(-58, 0, -16, 0), seg(16, 0, 58, 0)],
      dimples: [[30, -72], [-30, -28], [-30, 28], [0, 50], [30, 72]], balls: [[-80, -50], [-80, 10], [-80, 70], [80, -20], [80, 40]] },
    { name: t('lvDaisy', 'Papatya'), shape: 'round', rim: '#1c7ed6', bg: '#c0eb75', art: artDaisy,
      walls: [post(0, -8, 17, '#fab005')],
      dimples: [-90, -18, 54, 126, 198].map((d) => onCircle(58, d, -8)), balls: [[-36, 76], [-12, 84], [12, 84], [36, 76], [0, 62]] },
    { name: t('lvRooms5', 'Beş Oda'), shape: 'round', rim: '#e64980', bg: '#fff0f6', wall: '#862e9c', art: artRooms,
      ...rooms(5, 58), balls: cluster(5, 20) },
    die(6),
    { name: t('lvEggs', 'Yumurta Kutusu'), shape: 'square', rim: '#f08c00', bg: '#fff5f5', wall: '#cdb894', art: artEggs,
      walls: [seg(0, -90, 0, 36), ...[-90, -48, -6, 36].map((y) => seg(-56, y, 56, y))],
      dimples: [-69, -27, 15].flatMap((y) => [[-28, y], [28, y]]), balls: [-60, -40, -20, 20, 40, 60].map((x) => [x, 70]) },
    { name: t('lvPool', 'Bilardo'), shape: 'square', rim: '#7a4a24', bg: '#0f5132', wall: '#14532d', art: artPool,
      walls: [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => seg(sx * 100, sy * 70, sx * 70, sy * 100, 3)), // köşe bantları: köşeye bilye yığılmasın
      dimples: [[-78, -78], [78, -78], [-88, 0], [88, 0], [-78, 78], [78, 78]],
      balls: [[0, -14], [-7, -2], [7, -2], [-14, 10], [0, 10], [14, 10]] },
    { name: t('lvBowling', 'Bovling'), shape: 'square', rim: '#e8463a', bg: '#e2b779', wall: '#8b5a2b', art: artBowling,
      walls: [seg(-62, -30, -62, 100), seg(62, -30, 62, 100)],
      dimples: [[0, -20], [-16, -46], [16, -46], [-32, -72], [0, -72], [32, -72]], balls: [-40, -24, -8, 8, 24, 40].map((x) => [x, 84]) },
    { name: t('lvRooms6', 'Altı Oda'), shape: 'round', rim: '#1f2a44', bg: '#e3fafc', wall: '#e8590c', art: artRooms,
      ...rooms(6, 58, true), balls: cluster(6, 20) }
  ] },
  { name: t('w3', 'Halkalar'), levels: [
    // çukur sayısı hiç geri düşmez; aynı sayıda az halkalıdan çok halkalıya, buzlu olan sonda. Renkler konuma göre döner
    P(0, 2, 63),
    P(1, 2, 1),
    ringsLevel(2, [[76, 270, 0.29], [51, 90, 0.43], [27, 0, 0.82]], [], [], [[88, 90, -90], [63, -90, -270], [39, 90, 0]], { name: t('lvRings', 'Halkalar'), logo: true }),
    P(3, 3, 2),
    P(0, 3, 131),
    P(1, 3, 234),
    P(2, 4, 570),
    P(3, 2, 200, { dead: 1 }),
    P(0, 2, 36, { dead: 3 }),
    P(1, 3, 283, { dead: 2 }),
    P(2, 4, 427, { dead: 2 }),
    ringsLevel(3, [[76, 270, 0.29], [51, 150, 0.43], [27, 330, 0.82]], [[0, 51, 100], [60, 27, 51]], [[320, 89], [315, 63.5], [100, 39]],
      [[88, 90, 270], [63.5, 270, 150], [39, 150, 330]], { name: t('lvRings2', 'Halkalar 2') }),
    P(0, 3, 144, { dead: 3 }),
    P(1, 3, 565, { dead: 4 }),
    P(2, 3, 1, { dead: 3 }, { name: t('lvIceRings', 'Buzlu Halkalar'), ice: [{ x: 0, y: 0, r: 100, r0: 48 }] }),
    P(3, 3, 15, { dead: 4 }),
    P(0, 4, 3, { dead: 4 }),
    P(1, 4, 508, { dead: 4 }),
    P(2, 3, 6, { dead: 5 }, { name: t('lvIceRings2', 'Buzlu Halkalar 2'), ice: [{ x: 0, y: 0, r: 100 }] }),
    P(3, 4, 22, { dead: 5 }),
    P(0, 4, 255, { dead: 7 }),
    ringsLevel(1, [[80, 270, 0.3], [60, 30, 0.42], [40, 210, 0.62], [20, 0, 1.3]], [[0, 80, 100], [150, 60, 80], [300, 40, 60], [250, 20, 40]],
      [[35, 91], [315, 91], [205, 70], [85, 70], [345, 50], [255, 50]], [[91, 90, 270], [70, 270, 390], [50, 30, 210], [30, 210, 0]], { name: t('lvRings3', 'Halkalar 3') }),
    P(2, 4, 49, { dead: 6 }),
    P(3, 4, 48, { dead: 7 }, { name: t('lvIceRings3', 'Buzlu Halkalar 3'), ice: [{ x: 0, y: 0, r: 100 }] }),
    P(0, 4, 333, { dead: 7 })
  ] },
  { name: t('w4', 'Renkler'), levels: [
    // yalnız renk bölümleri; renkli bilye sayısı hiç geri düşmez (2, 3, 4, 5, 6)
    { name: t('lvTwo', 'İki Renk'), shape: 'round', rim: '#e64980', bg: '#f8f0fc', art: artTint,
      dimples: [[-45, -10, 1], [45, -10, 2]], balls: [[-58, 62, 1], [58, 62, 2]] },
    M(1, 4, 11, { starts: [[3, 0, 1], [3, 3, 2]], goals: [[0, 3, 1], [0, 0, 2]] }, { name: t('lvPair', 'Çift Labirent'), par: 60 }),
    M(3, 5, 600, { starts: [[4, 0, 1], [4, 4, 2]], goals: [[0, 4, 1], [0, 0, 2]] }, { name: t('lvPair2', 'Çift Labirent 2'), par: 90 }),
    { name: t('lvThree', 'Üç Renk'), shape: 'round', rim: '#1c7ed6', bg: '#f1f3f5', art: artTint,
      dimples: [[0, -52, 1], [45, 26, 2], [-45, 26, 3]], balls: cluster(3, 10, [2, 3, 1]) },
    { ...die(3, [[1, 3, 4], [4, 3, 1]]), name: t('lvColorDice', 'Renkli Zar'), rim: '#e8463a' },
    { name: t('lvColorRooms', 'Renkli Odalar'), shape: 'round', rim: '#14a3a3', bg: '#fff1d6', wall: '#5f3dc4', art: artRooms,
      ...rooms(3, 54, false, [1, 2, 3]), balls: cluster(3, 10, [3, 1, 2]) },
    { name: t('lvTraffic', 'Trafik Lambası'), shape: 'square', rim: '#2f9e44', bg: '#a5d8ff', wall: '#868e96', art: artTraffic,
      walls: [-56, 0, 56].map((y) => ({ t: 'a', cx: 0, cy: y, r: 23, a0: 1.12 * Math.PI, a1: 1.88 * Math.PI, hw: 3 })),
      dimples: [[0, -56, 1], [0, 0, 3], [0, 56, 4]], balls: [[-72, 72, 1], [72, 72, 3], [-72, -72, 4]] },
    M(4, 5, 62, { starts: [[4, 0, 1], [4, 2, 2], [4, 4, 3]], goals: [[0, 4, 1], [0, 2, 2], [0, 0, 3]] }, { name: t('lvTriple', 'Üçlü Labirent'), par: 100 }),
    M(3, 6, 5, { starts: [[5, 0, 1], [5, 2, 2], [5, 5, 3]], goals: [[0, 5, 1], [0, 3, 2], [0, 0, 3]], dead: 3 }, { name: t('lvTriple2', 'Üçlü Labirent 2'), par: 110 }),
    { ...die(4, [[1, 2, 3, 4], [2, 1, 4, 3]]), name: t('lvColorDice2', 'Renkli Zar 2'), rim: '#1c7ed6' },
    { name: t('lvColorRooms4', 'Renkli Dört Oda'), shape: 'round', rim: '#5f3dc4', bg: '#e5dbff', wall: '#ffffff', art: artRooms,
      ...rooms(4, 58, false, [1, 2, 3, 4]), balls: cluster(4, 16, [3, 4, 1, 2]) },
    { name: t('lvWheel', 'Renk Çarkı'), shape: 'round', rim: '#e8463a', bg: '#fff9db', wall: '#ffffff', art: artWheel,
      walls: [45, 135, 225, 315].map((d) => seg(...onCircle(50, d), ...onCircle(100, d))),
      dimples: [[74, 0, 1], [0, 74, 2], [-74, 0, 3], [0, -74, 4]], balls: cluster(4, 14, [3, 4, 1, 2]) },
    { name: t('lvColorPinball', 'Renkli Pinball'), shape: 'square', rim: '#e64980', bg: '#1b2a4a', wall: '#dee2e6', art: artPinball,
      walls: [post(-40, -18, 9, '#ff6b6b'), post(40, -18, 9, '#4dabf7'), post(0, 14, 9, '#ffd43b'), post(-62, 30, 7, '#69db7c'), post(62, 30, 7, '#da77f2'),
        seg(-94, 52, -50, 72), seg(94, 52, 50, 72)],
      dimples: [[-66, -70, 1], [-22, -70, 2], [22, -70, 3], [66, -70, 4]], balls: [[-30, 84, 3], [-10, 86, 4], [10, 86, 1], [30, 84, 2]] },
    { name: t('lvCorners', 'Dört Köşe'), shape: 'square', rim: '#f08c00', bg: '#fff9db', wall: '#ffffff', art: artCorners,
      walls: corners.flatMap(([sx, sy]) => [seg(sx * 48, sy * 100, sx * 48, sy * 64), seg(sx * 100, sy * 48, sx * 64, sy * 48)]),
      dimples: corners.map(([sx, sy, k]) => [sx * 74, sy * 74, k]), balls: cluster(4, 16, [4, 3, 2, 1]) },
    { name: t('lvRainbow', 'Gökkuşağı'), shape: 'round', rim: '#1f9e89', bg: '#e7f5ff', art: artRainbow,
      walls: [[84, 0.35, '#fa5252'], [62, 0, '#fcc419'], [40, 0, '#40c057']].map(([r, cut, color]) => ({ t: 'a', cx: 0, cy: 40, r, a0: Math.PI + cut, a1: TAU - cut, hw: 3, color })),
      dimples: [[0, -62, 1], [0, -33, 3], [0, -11, 4], [0, 18, 2]], balls: [[-40, 74, 4], [-14, 82, 1], [14, 82, 2], [40, 74, 3]] },
    { name: t('lvPalette', 'Boya Paleti'), shape: 'square', rim: '#2f9e44', bg: '#f8f9fa', art: artPalette, walls: [{ ...seg(-66, 66, 10, -6, 4), color: '#8b5a2b' }], // fırça sapı
      dimples: [[-50, -46, 1], [-6, -66, 3], [42, -54, 2], [66, -8, 4]], balls: [[30, 80, 2], [52, 64, 1], [70, 44, 3], [8, 84, 4]] },
    { name: t('lvTarget', 'Renkli Hedef'), shape: 'round', rim: '#1f2a44', bg: '#ffffff', wall: '#495057', art: artTarget,
      walls: [ring(0, 0, 76, Math.PI, 0.3), ring(0, 0, 51, -20 * Math.PI / 180, 0.43), ring(0, 0, 27, 200 * Math.PI / 180, 0.82)],
      dimples: [[...onCircle(89, -90), 1], [...onCircle(63.5, 90), 2], [...onCircle(39, 40), 3], [0, 0, 4]],
      balls: [[60, 2], [80, 3], [100, 4], [120, 1]].map(([d, k]) => [...onCircle(89, d), k]) },
    M(0, 6, 1, { starts: [[5, 0, 1], [5, 2, 2], [5, 3, 3], [5, 5, 4]], goals: [[0, 5, 1], [0, 3, 2], [0, 2, 3], [0, 0, 4]] }, { name: t('lvQuad', 'Dörtlü Labirent'), par: 140 }),
    { name: t('lvColorClock', 'Renkli Saat'), shape: 'round', rim: '#e8463a', bg: '#fffdf5', wall: '#1f2a44', art: artClock,
      walls: [post(0, 0, 6), seg(0, 0, ...onCircle(40, -150), 3), seg(0, 0, ...onCircle(58, -30), 2.5)],
      dimples: [[-90, 1], [0, 2], [90, 3], [180, 4]].map(([d, k]) => [...onCircle(62, d), k]), balls: [[0, 26, 1], [-24, 14, 2], [24, 14, 4], [0, -24, 3]] },
    { name: t('lvColorTraps', 'Tuzaklı Renkler'), shape: 'round', rim: '#f08c00', bg: '#fff9db', art: artTint,
      holes: [...[0, 90, 180, 270].map((d) => onCircle(44, d)), ...[0, 90, 180, 270].map((d) => onCircle(86, d))],
      dimples: [[-135, 1], [-45, 2], [135, 3], [45, 4]].map(([d, k]) => [...onCircle(70, d), k]), balls: cluster(4, 14, [4, 3, 2, 1]) },
    M(2, 6, 14, { starts: [[5, 0, 1], [5, 2, 2], [5, 3, 3], [5, 5, 4]], goals: [[0, 5, 1], [0, 3, 2], [0, 2, 3], [0, 0, 4]], dead: 4 }, { name: t('lvCross', 'Çapraz Labirent'), par: 150 }),
    { name: t('lvColorDaisy', 'Renkli Papatya'), shape: 'round', rim: '#1c7ed6', bg: '#c0eb75', art: artDaisy, walls: [post(0, -8, 17, '#fab005')],
      dimples: [[-90, 1], [-18, 2], [54, 3], [126, 4], [198, 1]].map(([d, k]) => [...onCircle(58, d, -8), k]),
      balls: [[-36, 76, 3], [-12, 84, 4], [12, 84, 1], [36, 76, 2], [0, 62, 1]] },
    { name: t('lvColorRooms5', 'Renkli Beş Oda'), shape: 'round', rim: '#e64980', bg: '#fff0f6', wall: '#862e9c', art: artRooms,
      ...rooms(5, 58, false, [1, 2, 3, 4, 1]), balls: cluster(5, 20, [2, 3, 4, 1, 1]) },
    { name: t('lvColorPool', 'Renkli Bilardo'), shape: 'square', rim: '#7a4a24', bg: '#0f5132', wall: '#14532d', art: artPool,
      walls: [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => seg(sx * 100, sy * 70, sx * 70, sy * 100, 3)),
      dimples: [[-78, -78, 1], [78, -78, 2], [-88, 0, 2], [88, 0, 1], [-78, 78, 3], [78, 78, 4]],
      balls: [[0, -14, 3], [-7, -2, 1], [7, -2, 2], [-14, 10, 4], [0, 10, 2], [14, 10, 1]] },
    { name: t('lvMaster', 'Usta'), shape: 'round', rim: '#1f2a44', bg: '#e3fafc', wall: '#e8590c', art: artRooms,
      ...rooms(6, 58, true, [1, 2, 3, 4, 1, 2]), balls: cluster(6, 20, [2, 1, 4, 3, 2, 1]), holes: [-60, 0, 60, 120, 180, 240].map((d) => onCircle(86, d)) }
  ] }
];
const LEVELS = [];
WORLDS.forEach((w, wi) => {
  w.levels = w.levels.map((d, k) => {
    const L = { wall: '#fffaf0', walls: [], holes: [], ice: [], name: '', ...d, w: wi, num: k + 1, id: `${wi + 1}-${k + 1}` };
    if (d.maze) Object.assign(L, maze(...d.maze));
    if (d.polar) Object.assign(L, polarMaze(...d.polar));
    for (const w of L.walls) { // çarpışma için kaba kutu
      const m = w.hw + BALL_R;
      w.box = w.t === 'a' ? [w.cx - w.r - m, w.cy - w.r - m, w.cx + w.r + m, w.cy + w.r + m]
        : [Math.min(w.x1, w.x2) - m, Math.min(w.y1, w.y2) - m, Math.max(w.x1, w.x2) + m, Math.max(w.y1, w.y2) + m];
    }
    LEVELS.push(L);
    return L;
  });
});
const label = (lv) => lv.daily ? lv.name : `${lv.w + 1}-${lv.num}` + (lv.name ? ` · ${lv.name}` : "");

// Yıldız süresi: bu sürenin altında 3 yıldız, iki katının altında 2 yıldız
function parOf(lv) {
  if (lv.par) return lv.par;
  if (lv.route && lv.balls.length === 1) {
    const len = lv.route.reduce((s, p, i) => i ? s + Math.hypot(p[0] - lv.route[i - 1][0], p[1] - lv.route[i - 1][1]) : 0, 0);
    return Math.round(len / 28 + 4 + lv.holes.length + (lv.ice.length ? 5 : 0));
  }
  const colored = lv.balls.some((b) => b[2]);
  return Math.round(6 + 8 * lv.balls.length * (colored ? 1.35 : 1) + (lv.walls.length ? 6 : 0) + (lv.ice.length ? 6 : 0));
}
function starsFor(lv, sec) { const p = parOf(lv); return sec <= p ? 3 : sec <= p * 2 ? 2 : 1; }
// Bölümün getirdiği mekanikler: ilk karşılaşmada tanıtım kartı gösterilir
function mechanicsOf(lv) {
  const m = [];
  if (lv.balls.length > 1) m.push('multi');
  if (lv.polar || lv.w === 2) m.push('rings');
  if (lv.holes.length) m.push('traps');
  if (lv.balls.some((b) => b[2])) m.push('colors');
  if (lv.ice.length) m.push('ice');
  return m;
}
// Günün labirenti: tarihten üretilir, herkes aynı gün aynı labirenti oynar
function dailyLevel(date = today()) {
  let h = 2166136261;
  for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const seed = (h >>> 0) % 100000 + 1, dow = new Date(date + 'T12:00:00').getDay(), hard = [3, 1, 1, 2, 2, 3, 3][dow];
  const d = seed % 2 ? P(seed, [2, 3, 3, 4][hard], seed, { dead: hard + 1 }) : M(seed, [5, 6, 6, 7][hard], seed, { every: 3, dead: hard + 1 });
  const lv = { wall: '#fffaf0', walls: [], holes: [], ice: [], ...d, name: t('dailyMaze'), w: -1, num: 0, id: 'daily-' + date, daily: true };
  Object.assign(lv, d.maze ? maze(...d.maze) : polarMaze(...d.polar));
  for (const w of lv.walls) {
    const m = w.hw + BALL_R;
    w.box = w.t === 'a' ? [w.cx - w.r - m, w.cy - w.r - m, w.cx + w.r + m, w.cy + w.r + m]
      : [Math.min(w.x1, w.x2) - m, Math.min(w.y1, w.y2) - m, Math.max(w.x1, w.x2) + m, Math.max(w.y1, w.y2) + m];
  }
  return lv;
}
