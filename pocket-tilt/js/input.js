// --- Kontrol: eğim sensörü, parmak, klavye ---
const touch = matchMedia('(pointer: coarse)').matches;
let tilt = { x: 0, y: 0 }, dragTilt = { x: 0, y: 0 }, drag = null, keys = {};
let gyroOn = false, gyroBase = null, gyroGot = false, gyro = { x: 0, y: 0 }, gyroTried = false;
let gyroSettle = 0; // bu ana kadar gelen her okuma "düz" sayılır (telefon eline oturana kadar bilye kıpırdamaz)
let orientSeen = false, gyroStart = 0, motionG = null;

// Telefonda oyun yalnızca eğimle oynanır. Parmak, hiçbir sensör sinyal vermezse oyun kilitlenmesin diye son çaredir.
// Bilgisayarda fare ve ok tuşları (geliştirme ve deneme için).
function controlMode() { // 'gyro' ya da 'drag'
  if (!touch) return 'drag';
  return gyroOn ? 'gyro' : 'drag';
}
// Eğim, telefonun düz sayılan tutuşa göre kendi eksenlerinde ne kadar döndüğüdür: bileğin aynı hareketi
// masada, otururken ve yatarken aynı sonucu verir. Dik tutuşta direksiyon gibi çevirme de sağ-sol sayılır.
// Yön sensörü olmayan telefonda (yalnızca ivmeölçer) eğim yerçekimi yönünden hesaplanır.
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
function gravityOf(e) { // cihaz eksenlerinde yerçekimi (x sağ, y yukarı, z ekrandan dışarı)
  const b = e.beta * D2R, g = e.gamma * D2R;
  return [Math.cos(b) * Math.sin(g), -Math.sin(b), -Math.cos(b) * Math.cos(g)];
}
function rotationOf(e) { // cihazdan dünyaya dönüş matrisi (W3C: Z-X'-Y'')
  const a = e.alpha * D2R, b = e.beta * D2R, g = e.gamma * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  return [ca * cg - sa * sb * sg, -cb * sa, cg * sa * sb + ca * sg,
    cg * sa + ca * sb * sg, ca * cb, sa * sg - ca * cg * sb,
    -cb * sg, sb, cb * cg];
}
// a yönünü b yönüne çeviren en kısa dönüş (3x3 matris, satır satır)
function rotationTo(a, b) {
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], s2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  if (s2 < 1e-12) return c > 0 ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : [1, 0, 0, 0, -1, 0, 0, 0, -1];
  const k = (1 - c) / s2, [x, y, z] = v;
  return [1 - k * (y * y + z * z), -z + k * x * y, y + k * x * z,
    z + k * x * y, 1 - k * (x * x + z * z), -x + k * y * z,
    -y + k * x * z, x + k * y * z, 1 - k * (x * x + y * y)];
}
const mul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
// Telefonun eksenlerinde [sağa, aşağı] eğimi ekran yönüne çevirip dereceye dönüştürür
function toScreen(dx, dy) {
  const a = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : window.orientation || 0;
  const [sx, sy] = a === 90 ? [dy, -dx] : a === -90 || a === 270 ? [-dy, dx] : a === 180 ? [-dx, -dy] : [dx, dy];
  const deg = (u) => Math.asin(Math.max(-1, Math.min(1, u))) * R2D;
  return [deg(sx), deg(sy)];
}
const settling = () => performance.now() < gyroSettle;
// Düz sayılan tutuşa göre eğim, ekran yönünde [sağa, aşağı] derece
function readTilt(e) {
  return typeof e.alpha === 'number' ? tiltFromRotation(rotationOf(e), gravityOf(e)) : tiltFromGravity(gravityOf(e));
}
function tiltFromRotation(R, g) {
  if (!gyroBase || gyroBase.kind !== 'rot' || settling()) {
    // dik tutuştaysa (telefonun alt kenarı yere bakıyorsa) direksiyon gibi çevirme de sağ-sol sayılır
    gyroBase = { kind: 'rot', R0: R, steer: Math.max(0, Math.min(1, (-g[1] - 0.6) / 0.3)) };
  }
  const R0 = gyroBase.R0, m = (i, j) => R0[i] * R[j] + R0[3 + i] * R[3 + j] + R0[6 + i] * R[6 + j]; // R0ᵀR
  const wx = (m(2, 1) - m(1, 2)) / 2, wy = (m(0, 2) - m(2, 0)) / 2, wz = (m(1, 0) - m(0, 1)) / 2;
  return toScreen(wy - gyroBase.steer * wz, wx);
}
function tiltFromGravity(g) {
  if (!gyroBase || gyroBase.kind !== 'g' || settling()) gyroBase = { kind: 'g', M: rotationTo(g, [0, 0, -1]) };
  const r = mul(gyroBase.M, g);
  return toScreen(r[0], -r[1]);
}
function feedTilt(deg) {
  gyroGot = true;
  const full = save.settings.sens;
  const v = deg.map((d) => {
    d = Math.abs(d) < GYRO_DEADZONE_DEG ? 0 : d - Math.sign(d) * GYRO_DEADZONE_DEG;
    return Math.max(-1, Math.min(1, d / full));
  });
  gyro.x += (v[0] - gyro.x) * 0.3; gyro.y += (v[1] - gyro.y) * 0.3;
}
addEventListener('deviceorientation', (e) => {
  if (!gyroOn || typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
  orientSeen = true; feedTilt(readTilt(e));
});
// Jiroskopu ya da pusulası olmayan ucuz telefonlarda yön sensörü sinyal vermez; ivmeölçer her telefonda var.
// (iPhone'ların hepsinde jiroskop var; Safari'de ivme işaretleri ters olabildiği için orada kullanılmaz.)
addEventListener('devicemotion', (e) => {
  const a = e.accelerationIncludingGravity;
  if (!gyroOn || orientSeen || PLATFORM === 'ios' || !a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') return;
  if (performance.now() - gyroStart < 500) return; // önce yön sensörüne fırsat ver
  const n = Math.hypot(a.x, a.y, a.z);
  if (n < 1) return;
  const g = [-a.x / n, -a.y / n, -a.z / n]; // ivmeölçer yerçekiminin tersini ölçer
  motionG = motionG ? motionG.map((v, i) => v + (g[i] - v) * 0.2) : g; // sarsıntıyı süz: yerçekimi yavaş değişir
  const m = Math.hypot(...motionG);
  feedTilt(tiltFromGravity(motionG.map((v) => v / m)));
});
addEventListener('orientationchange', () => { gyroBase = null; });
// Telefonun şu anki hâlini düz say; ms boyunca tutuş yerine otururken o da düz sayılmaya devam eder
function calibrate(ms = 700) { gyroBase = null; gyroSettle = performance.now() + ms; gyro = { x: 0, y: 0 }; }
// Düzlem düğmesi yalnızca eğim sensörüyle oynarken görünür
function updateLevelBtn() { const b = document.getElementById('levelBtn'); if (b) b.hidden = controlMode() !== 'gyro'; }
function setGyro(on) {
  gyroOn = on; calibrate(); updateLevelBtn();
  if (tutorialStep === 1) showTutorial(1); // öğretici metni kontrol yöntemine uysun
  if (!on) return;
  gyroGot = false; orientSeen = false; motionG = null; gyroStart = performance.now();
  setTimeout(() => {
    if (gyroOn && !gyroGot) { gyroOn = false; updateLevelBtn(); toast(t('gyroNone')); if (tutorialStep === 1) showTutorial(1); }
  }, 1500);
}
// iOS'ta izin kullanıcının dokunuşuyla istenmeli; bu yüzden bir düğmeye basıldığında çağrılır
async function enableGyro() {
  gyroTried = true;
  if (!touch) return;
  if (window.isSecureContext === false || typeof DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { toast(t('gyroDenied')); return; } } catch (e) { return; }
  }
  setGyro(true);
}
function readInput(dt) {
  const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const mode = controlMode(), g = mode === 'gyro' ? gyro : { x: 0, y: 0 }, d = mode === 'drag' ? dragTilt : { x: 0, y: 0 };
  let tx = g.x + d.x + kx * KEY_TILT, ty = g.y + d.y + ky * KEY_TILT;
  const m = Math.hypot(tx, ty);
  if (m > 1) { tx /= m; ty /= m; }
  return [tx, ty];
}
// Parmakla oynarken ekranda görünen oyun kolu: bastığın yerde halka, parmağını izleyen topuz
const stick = document.getElementById('stick');
function showStick(x, y) { stick.style.left = x + 'px'; stick.style.top = y + 'px'; stick.firstElementChild.style.transform = ''; stick.hidden = false; }
function hideStick() { stick.hidden = true; }
function resetInput() {
  const area = document.getElementById('game');
  if (drag && area.hasPointerCapture(drag.id)) area.releasePointerCapture(drag.id);
  keys = {}; drag = null; dragTilt = { x: 0, y: 0 }; tilt = { x: 0, y: 0 };
  gyro = { x: 0, y: 0 }; motionG = null; hideStick();
}
function initInput() {
  const area = document.getElementById('game');
  area.addEventListener('pointerdown', (e) => {
    if (state !== 'play' || controlMode() !== 'drag' || e.target.closest('button, .card, .revive')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    area.setPointerCapture(e.pointerId);
    showStick(e.clientX, e.clientY);
  });
  area.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    let x = (e.clientX - drag.x) / DRAG_FULL, y = (e.clientY - drag.y) / DRAG_FULL;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    dragTilt = { x, y };
    stick.firstElementChild.style.transform = `translate(${(x * DRAG_FULL).toFixed(1)}px, ${(y * DRAG_FULL).toFixed(1)}px)`;
  });
  for (const ev of ['pointerup', 'pointercancel']) area.addEventListener(ev, (e) => {
    if (drag && e.pointerId === drag.id) { drag = null; dragTilt = { x: 0, y: 0 }; hideStick(); }
  });
  addEventListener('keydown', (e) => {
    if (/^(Arrow|Key[WASD])/.test(e.code)) { keys[e.code] = true; if (state === 'play') e.preventDefault(); }
    if (e.code === 'Escape') onBack();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { keys = {}; drag = null; dragTilt = { x: 0, y: 0 }; hideStick(); });
}
