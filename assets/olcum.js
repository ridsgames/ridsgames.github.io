// Ortak ölçüm (GoatCounter olayları): etkin süre, yeni site ziyareti ve hata kaydı. Çerez ya da kalıcı kimlik kullanmaz.
// Kullanım: <script src="../assets/olcum.js" data-page="kizma-birader" data-name="Kızma Birader"></script>
//  - Süre: sayfa ekrandayken ve son 60 sn içinde dokunma/tuş varken işler. Sayfa gizlenince tek olay gider:
//    ilk kez "<sayfa>/sure/<dk>", sayfaya dönülüp yeniden çıkılırsa eklenen süre "<sayfa>/ek/<dk>".
//    <dk> dilimin üst sınırıdır (DILIM); 90 dakikadan uzunsa 120. Panel, dilim ortalarıyla toplam süreyi hesaplar.
//  - Ziyaret: sekmede açılan ilk sayfa "site/giris" sayar (sekme kapanınca sıfırlanır).
//  - Hata: yakalanmayan hatalar "<sayfa>/hata" olarak, ileti başlıkta; sayfa başına en fazla 3.
(function () {
  const me = document.currentScript, page = me && me.dataset.page, name = (me && me.dataset.name) || page;
  if (!page) return;
  const DILIM = [1, 2, 3, 5, 7, 10, 15, 20, 30, 45, 60, 90], BOS = 60000, EN_AZ = 3;
  const queue = [];
  function send(path, title) {
    queue.push({ path, title, event: true });
    drain();
  }
  // sayaç betiği geç yüklenebilir: hazır olana kadar bekletilir (en fazla 20 sn)
  let tries = 0, waiting = false;
  function drain() {
    const gc = window.goatcounter;
    if (gc && typeof gc.count === 'function') {
      while (queue.length) { try { gc.count(queue.shift()); } catch (e) {} }
      return;
    }
    if (waiting || tries > 40) return;
    waiting = true; tries++;
    setTimeout(() => { waiting = false; drain(); }, 500);
  }

  // yeni site ziyareti
  try {
    if (!sessionStorage.getItem('rids_giris')) { sessionStorage.setItem('rids_giris', '1'); send('site/giris', 'Site: yeni ziyaret'); }
  } catch (e) {}

  // etkin süre
  let active = 0, last = performance.now(), input = last, sentOnce = false;
  const mark = () => { input = performance.now(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, mark, { capture: true, passive: true });
  setInterval(() => {
    const now = performance.now(), dt = Math.min(2000, now - last); last = now;
    if (document.visibilityState === 'visible' && now - input < BOS) active += dt;
  }, 1000);
  const dilim = (sn) => { const dk = sn / 60; for (const d of DILIM) if (dk <= d) return d; return 120; };
  function flush() {
    const sn = active / 1000;
    if (sn < EN_AZ) return;
    active = 0;
    const d = dilim(sn), kisa = d === 120 ? '90 dk üstü' : d + ' dk’ya kadar';
    send(`${page}/${sentOnce ? 'ek' : 'sure'}/${d}`, `${name}: ${sentOnce ? 'ek süre' : 'kalma süresi'} ${kisa}`);
    sentOnce = true;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else { last = performance.now(); mark(); } });
  addEventListener('pagehide', flush);

  // hatalar
  let errs = 0;
  function onErr(msg) {
    const m = String(msg || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!m || /^Script error\.?$/i.test(m) || errs >= 3) return;
    errs++; send(`${page}/hata`, `${name}: ${m}`);
  }
  addEventListener('error', (e) => { if (e instanceof ErrorEvent) onErr(e.message); });
  addEventListener('unhandledrejection', (e) => { const r = e.reason; onErr(r && (r.message || r)); });
})();
