// Ortak oyun kabuğu: ana sayfa düğmesi, ilk dokunuşta tam ekran, ekranı çevirme düğmesi.
// Kullanım (head içinde, GoatCounter ayarından hemen sonra, eşzamanlı): <script src="../assets/kabuk.js" data-land="1"></script>
//  - data-land="1": dokunmatik cihazda tam ekrana geçince yataya kilitlenir (Android). Kilit yoksa ipucu çıkar.
//  - Çevirme düğmesi (#fsBtn, dokunmatikte): Android'de yön kilidini değiştirir; kilit olmayan cihazlarda (iPhone, iPad)
//    sayfa ?rot=1 ile yeniden açılır ve oyun 90° döndürülmüş bir çerçevede (?ic=1) yüklenir. Kayıt localStorage'da olduğu için oyun sürer.
//  - Çevirme geçişlerinden sonra sessionStorage 'rgNoAsk' = '1' bırakılır: oyun "devam et / yeni oyun" sormadan sürebilir.
(function () {
  const me = document.currentScript, LAND = !!(me && me.dataset.land === '1');
  const q = new URLSearchParams(location.search), H = document.documentElement;
  const noAsk = () => { try { sessionStorage.setItem('rgNoAsk', '1'); } catch (e) {} };

  // ---- Döndürülmüş çerçevenin kabuğu: oyunun kendisi bu sayfada hiç çalışmaz ----
  if (q.get('rot') === '1') {
    window.__shell = true;
    try { window.stop(); } catch (e) {}
    const land0 = innerWidth > innerHeight; let gone = false;
    const back = (lg) => { if (gone) return; gone = true; noAsk(); q.delete('rot'); if (lg) q.set('lang', lg); location.replace('?' + q.toString()); };
    addEventListener('message', (e) => { if (e.origin === location.origin && typeof e.data === 'string' && e.data.indexOf('vrotExit') === 0) back(e.data.split(':')[1]); });
    const build = () => {
      let b = document.body; if (!b) { b = document.createElement('body'); H.appendChild(b); }
      H.style.cssText = 'height:100%;overflow:hidden;background:#0b1220'; b.style.cssText = 'margin:0;height:100%;overflow:hidden;background:#0b1220';
      const f = document.createElement('iframe'), q2 = new URLSearchParams(q); q2.delete('rot'); q2.set('ic', '1');
      f.src = '?' + q2.toString(); f.title = document.title || 'Ridsgames';
      f.style.cssText = 'position:fixed;left:0;top:0;border:0;margin:0;padding:0;z-index:2147483647;transform-origin:0 0;background:#0b1220';
      const fit = () => { const w = innerWidth, h = innerHeight; if (w !== h && (w > h) !== land0) return back(); f.style.width = h + 'px'; f.style.height = w + 'px'; f.style.transform = 'translateX(' + w + 'px) rotate(90deg)'; };
      fit(); addEventListener('resize', fit); b.appendChild(f);
    };
    if (document.readyState === 'loading') { const t = setInterval(() => { if (document.body || document.readyState !== 'loading') { clearInterval(t); build(); } }, 30); setTimeout(() => { if (!gone && !document.querySelector('iframe')) build(); }, 400); } else build();
    return;
  }
  const IN_FRAME = q.get('ic') === '1' && window.parent !== window;
  if (IN_FRAME) {
    window.__inFrame = true; H.classList.add('rgInFrame');
    const b = document.createElement('base'); b.target = '_top'; document.head.appendChild(b);
    if (window.goatcounter) window.goatcounter.no_onload = true; // ziyaret dış sayfada sayıldı
  }

  const tr = () => !/^en/i.test(H.lang || '');
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const fsCan = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const isPortrait = () => matchMedia('(orientation: portrait)').matches;
  const curLang = () => (tr() ? 'tr' : 'en');

  const css = document.createElement('style');
  css.textContent = `
.rgHomeK { position: fixed; z-index: 31; top: max(6px, env(safe-area-inset-top)); left: max(6px, env(safe-area-inset-left)); width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  background: rgba(2, 6, 23, .62); border: 1px solid rgba(148, 163, 184, .32); color: #e2e8f0; box-shadow: 0 3px 10px rgba(0, 0, 0, .4); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); text-decoration: none; }
.rgHomeK:hover { background: rgba(15, 23, 42, .9); color: #fff; } .rgHomeK:active { transform: scale(.94); }
.rgHomeK svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
.rgRotK svg > :not(.rgRotI) { display: none !important; } .rgRotK .rgRotI { display: inline !important; }
.rgFsK { position: fixed; z-index: 30; bottom: max(6px, env(safe-area-inset-bottom)); right: max(6px, env(safe-area-inset-right)); width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; padding: 0;
  background: rgba(2, 6, 23, .62); border: 1px solid rgba(148, 163, 184, .32); color: #e2e8f0; opacity: .85; }
.rgToastK { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2147483000; background: rgba(15, 23, 42, .94); color: #fff; font: 700 15px/1.3 system-ui, sans-serif;
  padding: 12px 18px; border-radius: 14px; border: 1.5px solid #22d3ee; pointer-events: none; max-width: 80vw; text-align: center; }`;
  document.head.appendChild(css);

  let played = false, hinted = false;
  function toast(s) {
    const t = document.createElement('div'); t.className = 'rgToastK'; t.textContent = s;
    (document.fullscreenElement || document.body).appendChild(t); setTimeout(() => t.remove(), 2200);
  }
  function goFs() {
    if (!fsCan || fsOn()) return Promise.resolve(fsOn());
    try {
      const r = (H.requestFullscreen || H.webkitRequestFullscreen).call(H);
      return r && r.then ? r.then(() => true, () => false) : new Promise((ok) => setTimeout(() => ok(fsOn()), 350));
    } catch (e) { return Promise.resolve(false); }
  }
  function lockTo(o) {
    try { const so = screen.orientation; if (fsOn() && so && so.lock) return so.lock(o).then(() => true, () => false); } catch (e) {}
    return Promise.resolve(false);
  }
  function vrot() { noAsk(); const p = new URLSearchParams(location.search); p.delete('ic'); p.set('lang', curLang()); p.set('rot', '1'); location.replace('?' + p.toString()); }
  function enterPlay() {
    played = true; if (IN_FRAME) return;
    const hint = () => { if (!LAND || hinted || !isPortrait()) return; hinted = true; toast(tr() ? 'Yatay oynamak için ⟳ düğmesine dokun' : 'Tap ⟳ to play in landscape'); };
    goFs().then((on) => { if (!COARSE || !LAND) return; if (on) lockTo('landscape').then((ok) => { if (!ok) hint(); }); else hint(); });
  }
  function rotate() {
    if (IN_FRAME) { try { parent.postMessage('vrotExit:' + curLang(), location.origin); } catch (e) {} return; }
    if (!fsCan) return vrot();
    const want = isPortrait() ? 'landscape' : 'portrait';
    goFs().then((on) => (on ? lockTo(want) : false)).then((ok) => { if (!ok) vrot(); });
  }
  window.rgKabuk = { enterPlay, rotate, fsOn, COARSE, IN_FRAME };

  const ROT_ICON = '<g class="rgRotI" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5a8.5 8.5 0 0 1 14.6-5.9"/><path d="M20.5 12.5a8.5 8.5 0 0 1-14.6 5.9"/><path d="M18.6 2.4v3.6H15"/><path d="M5.4 21.6V18H9"/><rect x="9.3" y="8.3" width="5.4" height="7.4" rx="1.1"/></g>';
  function setup() {
    // ana sayfa düğmesi
    const hl = document.getElementById('homeLink'), hr = hl && hl.getBoundingClientRect();
    const ownHome = hr && hr.width && hr.left < 70 && hr.top < 70 && getComputedStyle(hl).visibility !== 'hidden'; // oyunun kendi sol üst logosu varsa eklenmez
    if (!document.getElementById('homeFab') && !ownHome) {
      const a = document.createElement('a'); a.className = 'rgHomeK'; a.id = 'rgHome';
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5"/></svg>';
      const lab = () => { a.href = '../?lang=' + curLang(); a.setAttribute('aria-label', tr() ? 'Ana sayfaya dön' : 'Back to games'); };
      lab(); new MutationObserver(lab).observe(H, { attributes: true, attributeFilter: ['lang'] });
      document.body.appendChild(a);
    }
    // tam ekran / çevirme düğmesi
    let fb = document.getElementById('fsBtn');
    if (!fb && (COARSE || fsCan)) {
      fb = document.createElement('button'); fb.type = 'button'; fb.id = 'fsBtn'; fb.className = 'rgFsK';
      fb.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
      document.body.appendChild(fb);
    }
    if (fb && COARSE) {
      fb.hidden = false; fb.classList.add('rgRotK');
      const sv = fb.querySelector('svg'); if (sv && !sv.querySelector('.rgRotI')) sv.insertAdjacentHTML('beforeend', ROT_ICON);
      const lab = () => { const l = tr() ? 'Ekranı çevir' : 'Rotate screen'; if (fb.getAttribute('aria-label') !== l) fb.setAttribute('aria-label', l); };
      lab(); new MutationObserver(lab).observe(fb, { attributes: true, attributeFilter: ['aria-label'] }); new MutationObserver(lab).observe(H, { attributes: true, attributeFilter: ['lang'] });
      new MutationObserver(() => { if (fb.hidden) fb.hidden = false; }).observe(fb, { attributes: true, attributeFilter: ['hidden'] });
    }
    // dokunmatikte düğme oyunun kendi tam ekran işlevi yerine ekranı çevirir
    addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('#fsBtn'); if (!t) return;
      if (COARSE) { e.stopImmediatePropagation(); e.preventDefault(); played = true; rotate(); return; }
      if (t.classList.contains('rgFsK')) { const d = document; let r; try { r = fsOn() ? (d.exitFullscreen || d.webkitExitFullscreen).call(d) : (H.requestFullscreen || H.webkitRequestFullscreen).call(H); } catch (er) {} if (r && r.catch) r.catch(() => {}); }
    }, true);
    // ilk dokunuşta tam ekran (bağlantılar, dil ve tam ekran düğmesi hariç)
    if (!IN_FRAME && fsCan) addEventListener('pointerup', function first(e) {
      if (played || fsOn()) { removeEventListener('pointerup', first, true); return; }
      const c = e.target.closest ? (k) => e.target.closest(k) : () => null;
      if (c('a, #fsBtn, #langBtn, input, textarea, select, label')) return;
      if (!COARSE && !c('#setupOv button, #startBtn, #resumeBtn')) return; // PC'de yalnız başlatma düğmeleri
      removeEventListener('pointerup', first, true); enterPlay();
    }, true);
    // eski "yataya kilitle" dinleyicisi çevirme kilidiyle yarışmasın
    if (typeof window.lockLand === 'function') { document.removeEventListener('fullscreenchange', window.lockLand); document.removeEventListener('webkitfullscreenchange', window.lockLand); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
