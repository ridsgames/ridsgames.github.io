// --- Oyun akışı ---
const levelDot = $('levelDot'), cv = $('c'), ctx = cv.getContext('2d'), layer = document.createElement('canvas'), glass = document.createElement('canvas');
let L = null, li = -1, balls = [], state = 'menu', demo = true, acc = 0, last = 0, timer = 0, timing = false, winHold = 0, simTime = 0, S = 0;
let curScreen = 'home', attractT = 0, showcase = 0, earned = 0, doubled = false, reviveFor = null, tutorialStep = 0;
let gameEpoch = 0, readyTimer = null, appActive = true;
// site istatistiği: bu bölümler bu cihazda ilk kez bitince sayılır (panelde ilerleme hunisi)
const MILESTONES = ['1-1', '1-3', '1-5', '1-10', '1-20', '1-30', '2-25', '3-25', '4-25'];
let ctlSent = false;
const SHOWCASE = ['3-3', '2-4', '4-15', '1-9', '2-7', '4-14', '2-12', '3-7', '4-7', '2-25', '4-17', '4-25'];

function newBalls(lv) {
  return lv.balls.map(([x, y, c]) => ({ x, y, c: c || 0, vx: 0, vy: 0, sx: x, sy: y, fall: 0, dimple: -1, rot: 0, safe: [x, y], safeAt: 0 }));
}
function setLevel(lv) {
  gameEpoch++; cancelReady();
  L = lv; balls = newBalls(lv); parts = []; ghost = null; winHold = 0; simTime = 0; acc = 0;
  if (S) buildLayers();
}
function showAttract() { // ana ekranda kendi kendine eğilen vitrin oyuncağı
  const id = SHOWCASE[showcase++ % SHOWCASE.length];
  setLevel(LEVELS.find((lv) => lv.id === id)); demo = true; state = 'demo'; attractT = 0;
}

// --- Bölüm başlat / bitir ---
function startLevel(i) { li = i; openGame(LEVELS[i]); }
function openGame(lv) {
  Sfx.unlock();
  if (touch && !gyroTried) enableGyro();
  closeAll();
  setLevel(lv); demo = false; timer = 0; timing = false; doubled = false;
  if (window.rgSay) { rgSay('basladi', 'bölüm başladı'); rgSay('mod/' + (lv.daily ? 'gunluk' : 'd' + (lv.w + 1)), lv.daily ? 'mod: günün labirenti' : 'mod: dünya ' + (lv.w + 1)); } // site istatistiği
  if (window.rgSay && !ctlSent) { // sayfa başına bir kez, eğim izni sonuçlandıktan sonra: eğerek / parmakla / fareyle
    ctlSent = true;
    setTimeout(() => { const k = touch ? controlMode() : 'fare'; rgSay('kontrol/' + k, 'kontrol: ' + ({ gyro: 'eğerek', drag: 'parmakla', fare: 'fareyle' })[k]); }, 3000);
  }
  calibrate(1000); // bölüm başında telefon eline oturana kadar bilye kıpırdamaz
  if (!lv.daily) { save.last = li; store(); }
  setBg(lv.daily ? 'home' : 'w' + (lv.w + 1));
  show('game');
  $('lvLabel').textContent = label(lv);
  // ipucu olmayan bölümde düğme gizlenmez, soluk durur: üst çubuk simetrik kalsın
  $('hintBtn').classList.toggle('off', !(lv.route && lv.balls.length === 1));
  updateLevelBtn();
  $('timer').textContent = fmt(0); updateHudStars();
  const par = parOf(lv);
  $('gameHint').innerHTML = `${icon('star', '')}${icon('star', '')}${icon('star', '')} &lt; ${fmt(par)}`;
  $('gameHint').style.opacity = 1;
  banner(lv.daily ? lv.name : `${t('level')} ${lv.w + 1}-${lv.num}`, lv.daily ? '' : WORLDS[lv.w].name + (lv.name ? ' · ' + lv.name : ''));
  state = introMechanic(lv) ? 'intro' : 'play';
  tutorialStep = 0;
  if (!save.tutorial && lv.id === '1-1') showTutorial(1);
  else if (!save.seen.level) setTimeout(() => { // eğimle oynayana bir kez: kayan bilye için yeşil daire
    if (L === lv && state === 'play' && !tutorialStep && controlMode() === 'gyro' && !save.seen.level) {
      save.seen.level = true; store(); showTutorial(3);
      setTimeout(() => { if (tutorialStep === 3) showTutorial(0); }, 7000);
    }
  }, 2500);
}
function restartLevel() { if (L.daily) openGame(L); else startLevel(li); }
function updateHudStars() {
  const st = L ? starsFor(L, timer) : 3;
  $('hudStars').innerHTML = [0, 1, 2].map((k) => icon('star', k < st ? '' : 'off')).join('');
}
function showTutorial(step) {
  tutorialStep = step;
  const el = $('tutorial'), ic = $('tutIcon');
  if (!step) { el.hidden = true; return; }
  if (step === 1) {
    const mode = controlMode();
    ic.className = 'tutIcon ' + (mode === 'gyro' ? 'tilt' : 'drag');
    ic.innerHTML = mode === 'gyro' && ART['tilt-toy'] ? `<img class="ic art" src="${ART['tilt-toy']}" alt="">` : icon(mode === 'gyro' ? 'phone' : 'hand');
    $('tutText').textContent = mode === 'gyro' ? t('tutTilt') : touch ? t('tutDrag') : t('tutMouse');
  } else if (step === 3) {
    ic.className = 'tutIcon'; ic.innerHTML = '<span class="vial big"><i></i></span>';
    $('tutText').textContent = t('tutLevel');
  } else {
    ic.className = 'tutIcon'; ic.innerHTML = icon('star');
    $('tutText').textContent = t('tutGoal');
  }
  el.hidden = false;
}
function win() {
  state = 'won'; timing = false; showTutorial(0); hideRevive();
  if (window.rgSay) rgSay('bitti', 'bölüm bitti'); // site istatistiği
  const lv = L, stars = starsFor(lv, timer);
  let rec = false, best = timer;
  earned = 0;
  if (lv.daily) {
    const dm = save.dailyMaze, first = dm.lastDone !== today();
    if (first) {
      dm.streak = dm.lastDone === yesterday() ? dm.streak + 1 : 1;
      dm.lastDone = today(); dm.best = timer; rec = true;
      earned = COINS.dailyMaze + stars * COINS.perStar;
    } else { rec = timer < dm.best; dm.best = Math.min(dm.best, timer); best = dm.best; }
  } else {
    const prev = save.levels[lv.id];
    if (!prev && window.rgSay && MILESTONES.includes(lv.id)) rgSay('ilk/' + lv.id, 'ilk kez bitirdi: ' + lv.id); // ilerleme hunisi
    if (!prev) earned = COINS.first + stars * COINS.perStar;
    else earned = stars > (prev.stars || 0) ? (stars - prev.stars) * COINS.newStar : COINS.replay;
    rec = !prev || prev.best === null || timer < prev.best;
    best = prev && prev.best !== null ? Math.min(prev.best, timer) : timer;
    const wasOpen = WORLDS.map((_, wi) => worldOpen(wi));
    save.levels[lv.id] = { stars: Math.max(stars, prev ? prev.stars : 0), best };
    WORLDS.forEach((w, wi) => { // yeni açılan dünya kalıcı olarak kaydedilir ve haber verilir
      if (wasOpen[wi] || !worldOpen(wi)) return;
      save.unlockedWorlds = [...new Set([...save.unlockedWorlds, wi])];
      setTimeout(() => toast(tf('worldOpened', { name: w.name }), 3200), 1900);
    });
    if (lv.id === '1-1') save.tutorial = true;
  }
  save.coins += earned; store();
  Sfx.win(); buzz('win'); confettiBurst();
  setTimeout(() => showWin(stars, rec, best), 650);
}
function showWin(stars, rec, best) {
  if (state !== 'won') return;
  $('winTitle').textContent = t('win' + stars);
  $('winTime').textContent = fmt(timer);
  $('winBest').textContent = rec ? t('record') : fmt(best);
  $('winBest').className = rec ? 'rec' : '';
  $('winStars').innerHTML = [0, 1, 2].map(() => icon('star')).join('');
  $('winCoins').innerHTML = icon('coin') + `+<span>${earned}</span>`;
  $('win2x').hidden = !earned;
  $('win2x').disabled = false;
  const nxt = L.daily || li >= LEVELS.length - 1;
  $('winNext').innerHTML = nxt ? badge('home') + `<span>${t('toHome')}</span>` : `<span>${t('next')}</span>` + badge('next', 'play');
  $('winLevels').hidden = !!L.daily;
  openOv('winOv');
  [...$('winStars').children].forEach((s, k) => { if (k < stars) setTimeout(() => { s.classList.add('on'); Sfx.star(k); buzz('light'); }, 250 + k * 280); });
  setTimeout(() => updateCoins(true), 300 + stars * 280);
}
async function onDouble() {
  if (doubled || !earned) return;
  if (!(await Ads.rewarded())) return;
  doubled = true; $('win2x').disabled = true;
  $('winCoins').innerHTML = icon('coin') + `+<span>${earned * 2}</span>`;
  addCoins(earned);
}
async function onNext() {
  closeOv('winOv');
  const daily = L.daily, last = li >= LEVELS.length - 1;
  // reklam ne yaparsa yapsın sonraki bölüme geçilir
  if (!daily) try { await Ads.afterWin(li); } catch (e) {}
  if (daily || last) show(last && !daily ? 'worlds' : 'home');
  else { if (window.rgSay) rgSay('tekrar', 'bitirdikten sonra sonraki bölüm'); startLevel(li + 1); }
}

// --- Fizik olayları ---
function onSeat(b, x, y, k) {
  Sfx.seat(); buzz('tick');
  burst(x, y, k ? COLORS[k].light : '#fff3bf', 10);
}
function onFall(b) {
  Sfx.fall(); buzz('fall'); shakeT = 0.3;
  burst(b.x, b.y, '#9aa3ad', 8);
  // Başlangıçtan yeterince uzaktaysa reklamla kaldığın yerden devam teklifi
  if (simTime > 6 && Math.hypot(b.safe[0] - b.sx, b.safe[1] - b.sy) > 45) offerRevive(b);
}
function respawn(b) {
  b.fall = 0; b.vx = b.vy = 0; b.dimple = -1;
  for (const [ox, oy] of [[0, 0], [0, -13], [13, 0], [-13, 0], [0, 13], [13, -13], [-13, -13]]) {
    const x = b.sx + ox, y = b.sy + oy;
    if (balls.every((o) => o === b || o.fall || Math.hypot(o.x - x, o.y - y) >= BALL_R * 2)) { b.x = x; b.y = y; return; }
  }
  b.x = b.sx; b.y = b.sy;
}
let reviveTimer = null;
function offerRevive(b) {
  reviveFor = { b, pos: [...b.safe] };
  const el = $('revive'), bar = el.querySelector('.bar');
  el.hidden = false;
  bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
  requestAnimationFrame(() => { bar.style.transition = 'transform 5s linear'; bar.style.transform = 'scaleX(0)'; });
  clearTimeout(reviveTimer); reviveTimer = setTimeout(hideRevive, 5000);
}
function hideRevive() { $('revive').hidden = true; clearTimeout(reviveTimer); reviveFor = null; }
async function onRevive() {
  if (!reviveFor || state !== 'play') return;
  const r = reviveFor, epoch = gameEpoch; hideRevive();
  state = 'adPause'; resetInput();
  let ok = false;
  try { ok = await Ads.rewarded(); } catch (e) { toast(t('adFail')); }
  if (epoch !== gameEpoch || curScreen !== 'game' || state !== 'adPause' || !balls.includes(r.b)) return;
  if (ok) {
    const b = r.b;
    b.fall = 0; b.vx = b.vy = 0; b.x = r.pos[0]; b.y = r.pos[1]; b.dimple = -1;
    burst(b.x, b.y, '#c7b6ff', 14); Sfx.pop();
  }
  // Ödül alınmasa veya reklam açılamasa bile geri dönüş kendiliğinden oyunu başlatmaz.
  waitUntilReady();
}

function cancelReady() { clearTimeout(readyTimer); readyTimer = null; closeOv('readyOv'); }
function waitUntilReady() {
  cancelReady(); state = 'ready'; acc = 0; winHold = 0; resetInput();
  for (const b of balls) b.vx = b.vy = 0;
  $('readyCount').hidden = true; $('readyBtn').disabled = false;
  openOv('readyOv');
}
function beginReadyCountdown() {
  if (state !== 'ready' || document.hidden || !appActive) return;
  state = 'countdown'; resetInput(); calibrate(3200);
  $('readyBtn').disabled = true;
  const count = $('readyCount'), epoch = gameEpoch;
  let n = 3; count.hidden = false; count.textContent = n;
  const tick = () => {
    if (epoch !== gameEpoch || state !== 'countdown') return;
    if (document.hidden || !appActive) { waitUntilReady(); return; }
    if (--n) { count.textContent = n; readyTimer = setTimeout(tick, 1000); return; }
    cancelReady(); resetInput(); calibrate(0);
    acc = 0; last = performance.now(); state = 'play';
  };
  readyTimer = setTimeout(tick, 1000);
}

// --- İpucu ---
function openHint() {
  if ($('hintBtn').classList.contains('off')) { toast(t('noHint')); return; }
  if (!L || !L.route || state !== 'play') return;
  state = 'pause';
  $('hintCoins').disabled = save.coins < COINS.hint;
  openOv('hintOv');
}
function runGhost() {
  const b = balls[0], r = L.route;
  let best = 0, bd = Infinity;
  r.forEach(([x, y], i) => { const d = Math.hypot(x - b.x, y - b.y); if (d < bd) { bd = d; best = i; } });
  const pts = [[b.x, b.y], ...r.slice(best)];
  ghost = { t: 0, pts, len: pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0) };
}
async function useHint(withAd) {
  if (withAd) { closeOv('hintOv'); if (!(await Ads.rewarded())) { state = 'play'; return; } }
  else { if (save.coins < COINS.hint) return; closeOv('hintOv'); addCoins(-COINS.hint); }
  state = 'play'; runGhost();
}

// --- Duraklatma ---
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause';
  $('skipBtn').hidden = !!L.daily || !!save.levels[L.id];
  renderQuick();
  openOv('pauseOv');
}
function resumeGame() { closeOv('pauseOv'); state = 'play'; }
async function skipLevel() {
  if (!(await Ads.rewarded())) return;
  if (!save.levels[L.id]) { save.levels[L.id] = { stars: 0, best: null }; store(); }
  toast(t('skipped'));
  closeOv('pauseOv');
  if (li < LEVELS.length - 1) startLevel(li + 1); else show('worlds');
}
function closeAll() { cancelReady(); document.querySelectorAll('.ov').forEach((o) => { if (o.id !== 'adSim') o.hidden = true; }); hideRevive(); showTutorial(0); hideStick(); }
function leaveGame(to) { gameEpoch++; closeAll(); state = 'menu'; if (to === 'levels') { curWorld = Math.max(0, L.w); renderLevelGrid(); } show(to); }

// Geri tuşu (Android) ve Escape
function onBack() {
  if (Ads.showing) { Ads.poke(); return; } // geri tuşu oyuna ulaştıysa reklam kapanmıştır
  if (!$('adLoad').hidden) return; // reklam hazırlanırken geri tuşu bir şey yapmaz
  if (state === 'ready' || state === 'countdown') { waitUntilReady(); return; }
  const ov = anyOv();
  if (ov) {
    if (ov.id === 'adSim') return;
    if (ov.id === 'pauseOv') resumeGame();
    else if (ov.id === 'winOv') leaveGame(L.daily ? 'home' : 'levels');
    else if (ov.id === 'hintOv') { closeOv('hintOv'); state = 'play'; }
    else if (ov.id === 'mechOv') { closeOv('mechOv'); state = 'play'; }
    else if (ov.id === 'sensorOv') closeSensor('parmak');
    else closeOv(ov.id);
    return;
  }
  if (curScreen === 'game') pauseGame();
  else if (curScreen === 'levels') show('worlds');
  else if (curScreen !== 'home') show('home');
  else if (NATIVE.App) NATIVE.App.exitApp();
}

// --- Ana döngü ---
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  let tx = 0, ty = 0;
  if (state === 'play') [tx, ty] = readInput(dt);
  else if (state === 'demo') { attractT += dt; tx = Math.sin(attractT * 0.7) * 0.45; ty = Math.sin(attractT * 0.53 + 1) * 0.45; }
  const f = Math.min(1, dt * 14);
  tilt.x += (tx - tilt.x) * f; tilt.y += (ty - tilt.y) * f;
  if (state === 'play' && gyroOn) levelDot.style.transform = `translate(${(gyro.x * 9).toFixed(1)}px, ${(gyro.y * 9).toFixed(1)}px)`;
  if (state === 'play' || state === 'demo') {
    if (state === 'play') {
      if (!timing && Math.hypot(tx, ty) > 0.08) timing = true;
      if (timing) {
        const before = Math.floor(timer);
        timer += dt;
        if (Math.floor(timer) !== before) { $('timer').textContent = fmt(timer); updateHudStars(); if (timer > 4) $('gameHint').style.opacity = 0.6; }
      }
      if (tutorialStep === 1 && Math.hypot(balls[0].x - balls[0].sx, balls[0].y - balls[0].sy) > 30) showTutorial(2);
    }
    for (acc += dt; acc >= DT && (state === 'play' || state === 'demo'); acc -= DT) step();
    for (const b of balls) if (b.fall && (b.fall += dt / 0.35) >= 1) respawn(b);
  }
  Sfx.rolling(state === 'play' ? balls.reduce((s, b) => s + (b.fall ? 0 : Math.hypot(b.vx, b.vy)), 0) : 0);
  updateParts(dt);
  draw();
  requestAnimationFrame(frame);
}

// --- Sensörü engelleyen tarayıcı (yalnız sitede): ne olduğunu söyle, eğerek oynamanın yolunu göster ---
// Android'de sayfa sensör izni isteyemez: Chrome'da açma önerilir. iOS'ta izin bir dokunuşla yeniden istenir.
let sensorAsked = false, sensorWasPlay = false;
function sensorBlocked() { // pencere açıldıysa true
  if (PLATFORM !== 'web' || !touch || sensorAsked) return false;
  sensorAsked = true;
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const chrome = android && /Chrome\//.test(ua) && !navigator.brave && !/SamsungBrowser|EdgA|OPR|YaBrowser|Firefox|DuckDuckGo|; wv\)/.test(ua);
  const showChrome = android && !chrome;
  if (!ios && !showChrome) return false;
  $('sensorText').textContent = t(ios ? 'sensorTextIos' : 'sensorText');
  $('sensorChrome').hidden = !showChrome; $('sensorRetry').hidden = !ios;
  sensorWasPlay = state === 'play'; if (sensorWasPlay) state = 'intro';
  openOv('sensorOv');
  if (window.rgSay) rgSay('sensor/engelli', 'sensör engelli penceresi');
  return true;
}
function closeSensor(how) {
  closeOv('sensorOv'); if (sensorWasPlay && state === 'intro') state = 'play';
  if (window.rgSay) rgSay('sensor/' + how, 'sensör penceresi: ' + ({ chrome: "Chrome'da aç", izin: 'izin ver', parmak: 'parmakla oyna' })[how]);
}

// --- Başlangıç ---
function bind(id, fn) { $(id).addEventListener('click', (e) => { Sfx.unlock(); fn(e); }); }
function init() {
  applyI18n(); initIcons(); initInput();
  bind('playBtn', () => { Sfx.tap(); startLevel(nextLevelIndex()); });
  bind('levelsBtn', () => { Sfx.tap(); show('worlds'); });
  bind('shopBtn', () => { Sfx.tap(); show('shop'); });
  bind('dailyMazeBtn', () => { Sfx.tap(); li = -1; openGame(dailyLevel()); });
  bind('dailyBtn', () => { Sfx.tap(); renderDaily(); openOv('dailyOv'); });
  bind('setBtn', () => { Sfx.tap(); renderSettings(); openOv('settingsOv'); });
  bind('setClose', () => closeOv('settingsOv'));
  bind('claimBtn', () => claimDaily(false));
  bind('claim2x', () => claimDaily(true));
  bind('freeCoins', onFreeCoins);
  document.querySelector('#home .coins').addEventListener('click', () => { Sfx.tap(); show('shop'); });
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => { Sfx.tap(); onBack(); }));
  bind('pauseBtn', () => { Sfx.tap(); pauseGame(); });
  bind('resumeBtn', resumeGame);
  bind('restartBtn', () => { closeOv('pauseOv'); restartLevel(); });
  bind('skipBtn', skipLevel);
  bind('pLevelsBtn', () => leaveGame(L.daily ? 'worlds' : 'levels'));
  bind('pHomeBtn', () => leaveGame('home'));
  bind('win2x', onDouble);
  bind('winNext', onNext);
  bind('winRetry', () => { closeOv('winOv'); restartLevel(); });
  bind('winLevels', () => leaveGame('levels'));
  bind('hintBtn', () => { Sfx.tap(); openHint(); });
  bind('quickRestart', () => { if (state === 'play' || state === 'intro') { Sfx.tap(); restartLevel(); } });
  bind('levelBtn', () => { // oyunun içinden: telefonun şu anki hâli düz sayılır
    calibrate(500); Sfx.tap(); buzz('tick'); toast(t('calibrated'));
    if (tutorialStep === 3) showTutorial(0);
    const b = $('levelBtn'); b.classList.remove('done'); void b.offsetWidth; b.classList.add('done');
  });
  bind('hintAd', () => useHint(true));
  bind('hintCoins', () => useHint(false));
  bind('hintClose', () => { closeOv('hintOv'); state = 'play'; });
  bind('mechOk', () => { closeOv('mechOv'); state = 'play'; Sfx.tap(); });
  bind('sensorChrome', () => { closeSensor('chrome'); location.href = 'intent://' + location.host + location.pathname + location.search + '#Intent;scheme=https;package=com.android.chrome;end'; });
  bind('sensorRetry', () => { closeSensor('izin'); enableGyro(); });
  bind('sensorDrag', () => { Sfx.tap(); closeSensor('parmak'); });
  bind('reviveBtn', onRevive);
  bind('readyBtn', beginReadyCountdown);
  bind('readyLeave', () => leaveGame(L.daily ? 'home' : 'levels'));
  // Pencerenin dışına dokununca kapanabilenler
  for (const id of ['settingsOv', 'dailyOv']) $(id).addEventListener('click', (e) => { if (e.target.id === id) closeOv(id); });
  if (NATIVE.App) {
    NATIVE.App.addListener('backButton', onBack);
    // Sayfa görünür kalsa da (yarı saydam reklam, gelen arama) uygulama duraklarsa oyun da duraklar
    NATIVE.App.addListener('pause', () => {
      appActive = false;
      if (state === 'ready' || state === 'countdown') waitUntilReady();
      else if (!Ads.showing && state === 'play') pauseGame();
    });
    // Dönüşte bölüm henüz başlamadıysa telefonun yeni hâli düz sayılır
    NATIVE.App.addListener('resume', () => { appActive = true; if (curScreen === 'game' && state === 'play' && !timing) calibrate(700); });
  }
  // Reklam akışı sürerken oyuncu ekrana dokunabiliyorsa reklam kapanmıştır: oyun beklemede kalmaz
  addEventListener('pointerdown', () => Ads.poke(), true);
  document.addEventListener('visibilitychange', () => {
    if (Ads.showing) return; // reklam açıkken arka plana düşmek oyunu duraklatmasın
    if (document.hidden) {
      if (state === 'ready' || state === 'countdown') waitUntilReady();
      else if (state === 'play') pauseGame();
      Sfx.suspend();
    } else Sfx.resume();
  });
  addEventListener('resize', () => { layoutStage(); fitTiles(); });
  if (document.fonts) document.fonts.ready.then(fitTiles);
  addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
  show('home');
  requestAnimationFrame(frame);
  restoreSave().then((changed) => { if (changed) { updateCoins(); if (curScreen === 'home') renderHome(); } });
  Ads.init();
  if (!dailyState().claimed && save.levels['1-1']) setTimeout(() => { if (curScreen === 'home' && !anyOv()) { renderDaily(); openOv('dailyOv'); } }, 900);
}
init();
