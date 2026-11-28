// --- Arayüz: ekranlar, pencereler, mağaza, ayarlar ---
const $ = (id) => document.getElementById(id);
const thumbs = new Map();
function thumb(lv, css) { // önbellekli oyuncak resmi (canvas kopyası döner)
  const px = Math.round(css * Math.min(2, devicePixelRatio || 1)), key = lv.id + ':' + px;
  if (!thumbs.has(key)) thumbs.set(key, toyThumb(lv, px));
  const src = thumbs.get(key), cnv = document.createElement('canvas');
  cnv.width = cnv.height = px; cnv.getContext('2d').drawImage(src, 0, 0);
  return cnv;
}
function toast(msg, ms = 2200) {
  const el = $('toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms);
}
function banner(title, sub) { // bölüm başlığı yalnızca oyun ekranında görünür
  const el = $('banner');
  el.innerHTML = (sub ? `<small>${sub}</small>` : '') + title;
  el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1400);
}
function openOv(id) { $(id).hidden = false; fitRibbon($(id)); }
// Kurdele başlığı: yazı ön banda sığmazsa küçülür (bandın kullanılabilir genişliği ~196px)
const ribbonCtx = document.createElement('canvas').getContext('2d');
function fitRibbon(ov) {
  const h = ov.querySelector('h2.rb.img');
  if (!h) return;
  if (!h.firstElementChild || h.firstElementChild.tagName !== 'SPAN') h.innerHTML = `<span>${h.textContent}</span>`;
  let fs = 28;
  ribbonCtx.font = `800 ${fs}px "Baloo 2"`;
  const w = ribbonCtx.measureText(h.textContent).width;
  if (w > 196) fs = Math.max(19, Math.floor(28 * 196 / w));
  h.style.setProperty('--rb-fs', fs + 'px');
}
function closeOv(id) { $(id).hidden = true; }
const anyOv = () => [...document.querySelectorAll('.ov')].find((o) => !o.hidden);

// Masa (arka plan): iki katman arasında geçiş
let bgKey = '';
function setBg(key) {
  if (key === bgKey) return;
  bgKey = key;
  const [a, b] = document.querySelectorAll('#bg i'), next = a.classList.contains('on') ? b : a, prev = next === a ? b : a;
  next.className = 'bg-' + key;
  next.style.backgroundImage = ART['bg-' + key] ? `url(${ART['bg-' + key]})` : '';
  requestAnimationFrame(() => { next.classList.add('on'); prev.classList.remove('on'); });
}
// Ana ekran karoları: üç yazı aynı boyda, en uzunu tek satıra sığacak kadar
const tileCtx = document.createElement('canvas').getContext('2d');
function fitTiles() {
  const tiles = [...document.querySelectorAll('.tile')];
  if (!tiles[0] || !tiles[0].clientWidth) return;
  const avail = tiles[0].clientWidth - 12;
  let fs = 14.5;
  for (const t of tiles) {
    const sp = t.querySelector(':scope > span');
    tileCtx.font = `800 ${fs}px "Baloo 2"`;
    const w = tileCtx.measureText(sp.textContent).width;
    if (w > avail) fs = Math.floor(fs * avail / w * 10) / 10;
  }
  document.documentElement.style.setProperty('--tile-fs', Math.max(11, fs) + 'px');
}
// Ekran geçişi
function show(name) {
  curScreen = name;
  if (name !== 'game') $('banner').classList.remove('on');
  if (name === 'levels') setBg('w' + (curWorld + 1));
  else if (name !== 'game') setBg('home');
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === name));
  if (name === 'home') { renderHome(); fitTiles(); }
  if (name === 'worlds') renderWorlds();
  if (name === 'shop') renderShop();
  updateCoins();
  requestAnimationFrame(layoutStage);
  setTimeout(layoutStage, 240);
}
let coinShown = save.coins;
function updateCoins(animate) {
  const to = save.coins;
  const set = (v) => document.querySelectorAll('.coins').forEach((el) => { el.innerHTML = icon('coin') + `<span>${v}</span>`; });
  if (!animate || to === coinShown) { coinShown = to; set(to); return; }
  const from = coinShown, t0 = performance.now();
  coinShown = to;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 700);
    set(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(tick);
    else { document.querySelectorAll('.coins').forEach((el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }
  };
  requestAnimationFrame(tick);
}
function addCoins(n) { save.coins += n; store(); updateCoins(true); if (n > 0) Sfx.coin(); }

// --- Ana ekran ---
function logoHTML() { // Gemini logosu gelene kadar: POCKET'in O'su krom bilye
  return '<span class="l1">P<i class="lball"></i>CKET</span><span class="l2">TILT</span>';
}
function nextLevelIndex() {
  const i = LEVELS.findIndex((lv) => !save.levels[lv.id]);
  return i < 0 ? Math.max(0, Math.min(LEVELS.length - 1, save.last)) : i;
}
function renderHome() {
  const i = nextLevelIndex();
  $('playSub').textContent = `${t('level')} ${label(LEVELS[i])}`;
  $('dailyBtn').querySelector('.dot').hidden = dailyState().claimed;
  $('dailyMazeBtn').querySelector('.dot').hidden = save.dailyMaze.lastDone === today();
  showAttract();
}

// --- Dünyalar ve bölümler ---
const WORLD_COVER = [8, 2, 0, 6]; // kapakta gösterilen bölüm
function worldStars(wi) { return WORLDS[wi].levels.reduce((s, lv) => s + ((save.levels[lv.id] || {}).stars || 0), 0); }
// Sonraki dünya, öncekinde 45 yıldız toplanınca ya da önceki dünyanın son bölümü bitince açılır
const WORLD_STARS = 45;
function worldNeed(wi) { return Math.min(WORLD_STARS, WORLDS[wi - 1].levels.length * 3); }
// Türkçede dünya adına ayrılma eki: Labirentler'den, Yuvalar'dan
function fromName(name) {
  if (LANG === 'en') return name;
  const v = (name.toLocaleLowerCase('tr').match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ['e'])[0], last = name.slice(-1).toLocaleLowerCase('tr');
  return `${name}'${'çfhkpsşt'.includes(last) ? 't' : 'd'}${'aıou'.includes(v) ? 'a' : 'e'}n`;
}
const needText = (wi) => tf('needStars', { n: worldNeed(wi), w: fromName(WORLDS[wi - 1].name) });
function worldOpen(wi) {
  if (UNLOCK_ALL || wi === 0 || save.unlockedWorlds.includes(wi)) return true;
  const prev = WORLDS[wi - 1].levels;
  return !!save.levels[prev[prev.length - 1].id] || worldStars(wi - 1) >= worldNeed(wi);
}
function levelOpen(i) { return UNLOCK_ALL || i === 0 || !!save.levels[LEVELS[i].id] || (LEVELS[i].num === 1 && worldOpen(LEVELS[i].w)) || !!save.levels[LEVELS[i - 1].id]; }
function renderWorlds() {
  const list = $('worldList'); list.innerHTML = '';
  WORLDS.forEach((w, wi) => {
    const b = document.createElement('button'), st = worldStars(wi), open = worldOpen(wi);
    b.type = 'button'; b.className = `world w${wi + 1}` + (open ? '' : ' locked');
    // değişkendeki url() stil dosyasına göre çözülür; bu yüzden tam adres verilir
    if (ART['bg-w' + (wi + 1)]) b.style.setProperty('--wbg', `url(${new URL(ART['bg-w' + (wi + 1)], location.href).href})`);
    if (ART['world-' + (wi + 1)]) b.insertAdjacentHTML('beforeend', `<img class="emblem" src="${ART['world-' + (wi + 1)]}" alt="" draggable="false">`);
    else b.appendChild(thumb(w.levels[WORLD_COVER[wi]], 104));
    const info = document.createElement('div');
    info.innerHTML = `<h3>${wi + 1}. ${w.name}</h3><div class="meta">${open ? icon('star') + `${st} / ${w.levels.length * 3}` : icon('lockc') + icon('star') + `${worldStars(wi - 1)} / ${worldNeed(wi)}`}</div><div class="progress"><i style="width:${open ? st / (w.levels.length * 3) * 100 : Math.min(100, worldStars(wi - 1) / worldNeed(wi) * 100)}%"></i></div>` + (open ? '' : `<div class="need">${needText(wi)}</div>`);
    b.appendChild(info);
    b.addEventListener('click', () => { Sfx.tap(); if (open) { curWorld = wi; renderLevelGrid(); show('levels'); } else toast(needText(wi)); });
    list.appendChild(b);
  });
}
let curWorld = 0;
function renderLevelGrid() {
  const w = WORLDS[curWorld], grid = $('lvGrid'), next = nextLevelIndex();
  $('worldTitle').textContent = w.name; // numara dünya listesinde var; dar ekranda başlık sığsın
  $('worldStars').innerHTML = icon('star') + `${worldStars(curWorld)}/${w.levels.length * 3}`;
  grid.innerHTML = '';
  for (const lv of w.levels) {
    const i = LEVELS.indexOf(lv), rec = save.levels[lv.id], open = levelOpen(i), b = document.createElement('button');
    b.type = 'button'; b.className = 'lv' + (i === next ? ' next' : ''); b.disabled = !open; b.setAttribute('aria-label', label(lv));
    b.appendChild(thumb(lv, 104));
    b.insertAdjacentHTML('beforeend', `<b>${lv.w + 1}-${lv.num}</b><span class="mini">${[0, 1, 2].map((k) => icon('star', rec && rec.stars > k ? 'on' : '')).join('')}</span>` + (open ? '' : `<span class="lk">${icon('lockc')}</span>`));
    b.addEventListener('click', () => { Sfx.tap(); startLevel(i); });
    grid.appendChild(b);
  }
}

// --- Mağaza ---
function skinPreview(id, css) {
  const px = Math.round(css * Math.min(2, devicePixelRatio || 1)), cnv = document.createElement('canvas');
  cnv.width = cnv.height = px;
  const c = cnv.getContext('2d'), k = px / 16, env = envColor;
  c.setTransform(k, 0, 0, k, px / 2, px / 2);
  envColor = '#8f9aa8'; drawSkin(c, 0, 0, 7, id, 0.4); envColor = env;
  return cnv;
}
// Sitede reklam yok: reklamla açılan bilyeler altınla satılır, reklamla ücretsiz altın gösterilmez
const NO_ADS = !NATIVE.AdMob;
const skinPrice = (s) => s.price || (NO_ADS && s.webPrice) || 0;
function freeLeft() { return save.ads.freeDay === today() ? COINS.freeAdPerDay - save.ads.freeCount : COINS.freeAdPerDay; }
function renderShop() {
  const fc = $('freeCoins'), left = freeLeft();
  fc.disabled = left <= 0; fc.hidden = NO_ADS; fc.style.display = NO_ADS ? 'none' : '';
  fc.innerHTML = `${icon('tvb', 'badge')}<div><div class="big">${t('freeCoins')} +${COINS.freeAd}</div><small>${left > 0 ? tf('leftToday', { n: left }) : t('noneLeft')}</small></div><div class="sp"></div>${icon('coin')}`;
  const grid = $('skinGrid'); grid.innerHTML = '';
  for (const s of SKINS) {
    const owned = save.skins.includes(s.id), sel = save.skin === s.id, b = document.createElement('button');
    b.type = 'button'; b.className = 'skin' + (sel ? ' sel' : '');
    b.appendChild(skinPreview(s.id, 64));
    let pr;
    if (sel) pr = `<span class="pr">${icon('check')}${t('selected')}</span>`;
    else if (owned) pr = `<span class="pr">${t('select')}</span>`;
    else if (skinPrice(s)) pr = `<span class="pr">${icon('coin')}${skinPrice(s)}</span>`;
    else if (s.ads) pr = `<span class="pr ad">${icon('tvb', 'badge')}${tf('adUnlock', { a: save.skinAds[s.id] || 0, b: s.ads })}</span>`;
    else pr = `<span class="pr day">${icon('gift')}${t('day7')}</span>`; // 7 günlük ödülün son günü
    b.insertAdjacentHTML('beforeend', `<span class="nm">${skinName(s)}</span>${pr}`);
    b.addEventListener('click', () => onSkin(s));
    grid.appendChild(b);
  }
}
function unlockSkin(id) {
  if (!save.skins.includes(id)) save.skins.push(id);
  save.skin = id; store(); Sfx.win(); buzz('win'); toast(t('unlocked'));
}
async function onSkin(s) {
  Sfx.tap();
  if (save.skins.includes(s.id)) { save.skin = s.id; store(); renderShop(); return; }
  const price = skinPrice(s);
  if (price) {
    if (save.coins < price) { toast(t('notEnough')); return; }
    save.coins -= price; updateCoins(true); unlockSkin(s.id);
  } else if (s.ads && !NO_ADS) {
    if (!(await Ads.rewarded())) return;
    save.skinAds[s.id] = (save.skinAds[s.id] || 0) + 1;
    if (save.skinAds[s.id] >= s.ads) unlockSkin(s.id); else store();
  } else toast(t('dailyOnly'));
  renderShop();
}
async function onFreeCoins() {
  if (NO_ADS || freeLeft() <= 0) return;
  if (!(await Ads.rewarded())) return;
  if (save.ads.freeDay !== today()) { save.ads.freeDay = today(); save.ads.freeCount = 0; }
  save.ads.freeCount++;
  addCoins(COINS.freeAd); renderShop();
}

// --- Günlük ödül ---
function dailyState() {
  const d = save.daily, td = today();
  if (d.last === td) return { claimed: true, day: d.day };
  return { claimed: false, day: d.last === yesterday() ? d.day % 7 + 1 : 1 };
}
function renderDaily() {
  const st = dailyState(), box = $('days');
  box.innerHTML = '';
  for (let d = 1; d <= 7; d++) {
    const el = document.createElement('div');
    el.className = 'dayC' + (d === 7 ? ' big' : '') + (d < st.day || (st.claimed && d === st.day) ? ' done' : '') + (!st.claimed && d === st.day ? ' cur' : '');
    const diamond = d === 7 && !save.skins.includes('diamond');
    // her kart aynı üç satır: gün, ödülün resmi, ödül
    el.innerHTML = `<span>${t('day')} ${d}</span>`;
    const done = el.classList.contains('done');
    if (done) el.insertAdjacentHTML('beforeend', `<i class="got">✓</i><b>${diamond ? t('diamondBall') : COINS.daily[d - 1]}</b>`); // alınan günde ödülün yerine onay
    else if (diamond) { const c = skinPreview('diamond', 40); c.className = 'ic'; el.appendChild(c); el.insertAdjacentHTML('beforeend', `<b>${t('diamondBall')}</b>`); }
    else el.insertAdjacentHTML('beforeend', `${icon(['coins1', 'coins1', 'coins2', 'coins2', 'coins3', 'coins3', 'chest'][d - 1])}<b>${COINS.daily[d - 1]}</b>`);
    box.appendChild(el);
  }
  const streak = st.claimed ? st.day : st.day - 1;
  $('dailyStreak').innerHTML = streak > 0 ? icon('firec') + tf('streak', { n: streak }) : '';
  $('claimBtn').hidden = $('claim2x').hidden = st.claimed;
  $('dailyNote').textContent = st.claimed ? t('comeBack') : '';
}
async function claimDaily(double) {
  const st = dailyState();
  if (st.claimed) return;
  if (double && !(await Ads.rewarded())) return;
  save.daily = { day: st.day, last: today() };
  if (st.day === 7 && !save.skins.includes('diamond')) {
    if (!save.skins.includes('diamond')) save.skins.push('diamond');
    toast(t('unlocked'));
    if (double) save.coins += COINS.daily[6] / 2;
  } else save.coins += COINS.daily[st.day - 1] * (double ? 2 : 1);
  store(); updateCoins(true); Sfx.coin(); buzz('win');
  renderDaily(); renderHome();
}

// --- Ayarlar ---
function renderSettings() {
  const s = save.settings, list = $('setList');
  const sw = (key, ic, label, sub) => `<div class="setRow">${icon(ic)}<div class="lbl">${t(label)}${sub ? `<small>${t(sub)}</small>` : ''}</div><button type="button" class="switch${s[key] ? ' on' : ''}" data-sw="${key}" aria-pressed="${!!s[key]}" aria-label="${t(label)}"></button></div>`;
  const seg = (key, ic, label, opts) => `<div class="setRow">${icon(ic)}<div class="lbl">${t(label)}</div><div class="seg">${opts.map(([v, l]) => `<button type="button" data-seg="${key}" data-v="${v}" class="${s[key] === v ? 'on' : ''}">${t(l)}</button>`).join('')}</div></div>`;
  list.innerHTML = sw('sfx', 'sound', 'sfx') + sw('music', 'music', 'music') + sw('haptics', 'vibrate', 'haptics') +
    `<div class="setRow" style="flex-wrap:wrap">${icon('sliders')}<div class="lbl">${t('sens')}</div><div class="rangeRow"><span>${t('low')}</span><input type="range" id="sens" min="12" max="32" step="1" value="${44 - s.sens}" aria-label="${t('sens')}"><span>${t('high')}</span></div></div>` +
    `<button type="button" class="linkBtn" id="calBtn">${icon('level')}<span>${t('calibrate')}<small>${t('calibrateSub')}</small></span></button>` +
    sw('symbols', 'shapes', 'symbols', 'symbolsSub') +
    seg('lang', 'globe', 'lang', [['auto', 'langAuto'], ['tr', 'tr'], ['en', 'en']]).replace('>tr<', '>Türkçe<').replace('>en<', '>English<') +
    (Ads.privacyRequired ? `<button type="button" class="linkBtn" id="privOpt">${icon('shield')}${t('privacyOptions')}</button>` : '') +
    `<button type="button" class="linkBtn" id="privPol">${icon('doc')}${t('privacyPolicy')}</button>` +
    `<div class="ver">${t('version')} ${APP_VERSION}</div>`;
  list.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.sw; s[k] = !s[k]; store(); Sfx.apply(); Sfx.tap();
    if (k === 'symbols' && L) buildLayers();
    renderSettings(); renderQuick();
  }));
  list.querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.seg, v = b.dataset.v;
    if (s[k] === v) return;
    s[k] = v; store(); Sfx.tap();
    if (k === 'lang') { toast(t('restartNote')); setTimeout(() => location.reload(), 600); return; }
    renderSettings();
  }));
  const fill = (el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  fill($('sens'));
  $('sens').addEventListener('input', (e) => { s.sens = 44 - Number(e.target.value); store(); fill(e.target); });
  $('calBtn').addEventListener('click', () => { calibrate(); toast(t('calibrated')); Sfx.tap(); });
  if ($('privOpt')) $('privOpt').addEventListener('click', () => Ads.showPrivacyOptions());
  // Uygulamada dış adres sistem tarayıcısında açılır; tarayıcıda yeni sekmede
  $('privPol').addEventListener('click', () => { if (PLATFORM === 'web') window.open(PRIVACY_URL, '_blank'); else location.href = PRIVACY_URL; });
}
function renderQuick() { // duraklatma penceresindeki hızlı düğmeler
  const s = save.settings;
  $('quickToggles').innerHTML = [['sfx', s.sfx ? 'sound' : 'mute'], ['music', 'music'], ['haptics', 'vibrate']]
    .map(([k, ic]) => {
      const art = !!ART['b-' + ic];
      return `<button type="button" class="ib${art ? ' art' : ''}${s[k] ? '' : ' off'}" data-q="${k}" aria-label="${t(k)}" aria-pressed="${!!s[k]}">${art ? badge(ic) : icon(ic)}</button>`;
    }).join('');
  $('quickToggles').querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.q; s[k] = !s[k]; store(); Sfx.apply(); Sfx.tap(); renderQuick();
  }));
}

// --- Yeni mekanik kartı ---
function introMechanic(lv) { // ilk karşılaşılan mekanik varsa kartı gösterir, true döner
  const m = mechanicsOf(lv).find((k) => !save.seen[k]);
  if (!m) return false;
  save.seen[m] = true; store();
  const key = { traps: 'mTraps', multi: 'mMulti', rings: 'mRings', colors: 'mColors', ice: 'mIce' }[m];
  $('mechTitle').textContent = t(key); $('mechText').textContent = t(key + 'Text');
  const c = $('mechCv'), src = thumb(lv, 180);
  c.width = c.height = src.width; c.getContext('2d').drawImage(src, 0, 0);
  openOv('mechOv');
  return true;
}
// Statik simgeleri yerleştir
function initIcons() {
  $('logo').innerHTML = ART.logo ? `<img src="${ART.logo}" alt="Pocket Tilt">` : logoHTML();
  $('dailyBtn').insertAdjacentHTML('afterbegin', badge('gift'));
  $('dailyBtn').classList.toggle('art', !!ART['b-gift']);
  badgeButton($('setBtn'), 'gear');
  badgeButton($('siteHome'), 'home'); $('siteHome').href = '../?lang=' + LANG; $('siteHome').setAttribute('aria-label', LANG === 'tr' ? 'RIDS Games ana sayfa' : 'RIDS Games home');
  $('levelsBtn').insertAdjacentHTML('afterbegin', badge('grid', 'maze'));
  $('dailyMazeBtn').insertAdjacentHTML('afterbegin', badge('calendar'));
  $('shopBtn').insertAdjacentHTML('afterbegin', badge('bag'));
  document.querySelectorAll('.back').forEach((b) => badgeButton(b, 'back'));
  badgeButton($('pauseBtn'), 'pause');
  badgeButton($('hintBtn'), 'bulb', 'bulbc');
  badgeButton($('quickRestart'), 'refresh');
  $('resumeBtn').innerHTML = badge('play') + `<span>${t('resume')}</span>`;
  $('restartBtn').innerHTML = badge('refresh') + `<span>${t('restart')}</span>`;
  $('skipBtn').innerHTML = icon('tvb', 'badge') + `<span>${t('skip')}</span>`;
  $('pLevelsBtn').innerHTML = badge('grid') + `<span>${t('levels')}</span>`;
  $('pHomeBtn').innerHTML = badge('home') + `<span>${t('home')}</span>`;
  $('win2x').innerHTML = icon('tvb', 'badge') + `<span>${t('double')}</span>`;
  $('winRetry').innerHTML = badge('refresh') + `<span>${t('again')}</span>`;
  $('winLevels').innerHTML = badge('grid') + `<span>${t('levels')}</span>`;
  $('claim2x').innerHTML = icon('tvb', 'badge') + `<span>${t('claim2x')}</span>`;
  $('claimBtn').innerHTML = `<span>${t('claim')}</span>`;
  $('hintIcon').innerHTML = badge('bulb', 'bulbc');
  $('hintIcon').classList.toggle('art', !!ART['b-bulb']);
  $('hintAd').innerHTML = icon('tvb', 'badge') + `<span>${t('watchAd')}</span>`;
  $('hintCoins').innerHTML = badge('coin') + `<span>${tf('useCoins', { n: COINS.hint })}</span>`;
  $('reviveBtn').innerHTML = icon('tvb', 'badge') + `<span>${t('revive')}</span>`;
  document.querySelector('#adSim .sheetIcon').innerHTML = icon('tvb', 'badge');
  document.documentElement.style.setProperty('--grain', `url(${grainCSS()})`);
  const pills = { 'pill-green': 'primary', 'pill-yellow': 'gold', 'pill-blue': 'ad', 'pill-orange': 'plain' };
  for (const [k, cls] of Object.entries(pills)) if (ART[k]) document.documentElement.style.setProperty('--' + k, `url(${new URL(ART[k], location.href).href})`);
  if (ART['pill-green']) document.body.classList.add('pills');
  if (ART.ribbon) document.querySelectorAll('.sheet > h2.rb').forEach((h) => {
    h.classList.add('img'); h.style.backgroundImage = `url(${ART.ribbon})`; h.parentElement.classList.add('rbimg');
  });
  if (ART.mascot) document.querySelectorAll('.mascot').forEach((m) => { m.src = ART.mascot; m.hidden = false; });
}
