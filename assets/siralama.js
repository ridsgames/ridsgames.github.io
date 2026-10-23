// Ortak sıralama tablosu (Firebase Realtime Database, SDK'sız REST). Solo Test, Sulu Halka, Mangala ve Yılan Merdiven kullanır.
// Okuma herkese açık. Oyuncu ilk kez sıralamaya girerken bir takma ad seçer, anonim oturum o an açılır;
// e-posta ya da gerçek kimlik istenmez. Kurallar: firebase/database.rules.json (Realtime Database > Rules).
// Kayıt: lb/<pano>/all/<uid> ve lb/<pano>/w/<hafta>/<uid> = { n: ad, s: sıra puanı (düşük iyi), d: süre (sn/10), p?: piyon, taş ya da zar atışı, t: sunucu zamanı }
// Kullanım:
//   const lb = RidsSiralama({ panolar: [{ id, tr, en }], dil: () => 'tr', bicim: (kayit, dil) => '01:02.3', olay: (ad) => {} });
//   lb.ac(panoId)                      sıralama penceresini açar
//   lb.bitti(yuvaEl, panoId, skor)     oyun sonunda skoru ({ s, d, p? }) gönderir, sonucu yuvaEl içine yazar
//   lb.bosalt(yuvaEl)                  yuvayı temizler, süren gönderimin sonucu artık yazılmaz
(function () {
  const API_KEY = 'AIzaSyAy5_7W7xUp9OqVP_y6ZnrdJcvXP8qOm8s';
  const DB = 'https://ridsgames-web-default-rtdb.europe-west1.firebasedatabase.app';
  const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts';
  const TOKEN = 'https://securetoken.googleapis.com/v1/token';
  // Haftalar pazartesi 00:00'da (Türkiye saati, UTC+3) başlar
  const HAFTA = 604800000, KAYMA = 270000000;
  const ANAHTAR = 'rids_lb', ILK = 10, GETIR = 100, TAZE = 20000;
  // currentScript yalnız betik ilk çalışırken dolu
  const GIZLILIK = new URL('../web-gizlilik.html', document.currentScript ? document.currentScript.src : location.href).href;

  const METIN = {
    tr: {
      baslik: 'Sıralama', hafta: 'Bu hafta', tum: 'Tüm zamanlar', kapat: 'Kapat', pano: 'Tablo',
      yukleniyor: 'Yükleniyor…', bos: 'Henüz kimse yok. İlk sen ol!', hata: 'Tablo yüklenemedi.', tekrar: 'Tekrar dene',
      sen: 'sen', haftaNot: 'Haftalık tablo her pazartesi 00:00’da sıfırlanır.',
      adin: 'Adın:', degistir: 'Değiştir', kaydet: 'Kaydet', vazgec: 'Vazgeç', sil: 'Kayıtlarımı sil',
      silOnay: 'Sıralamadaki bütün kayıtların silinsin mi?', silindi: 'Kayıtların silindi.', silinemedi: 'Silinemedi, bağlantını kontrol et.',
      adYok: 'Bir oyunu bitirince takma adınla sıralamaya girebilirsin.',
      adSor: 'Sıralamaya girmek için bir takma ad seç:', adYer: 'Takma ad', gir: 'Gönder',
      adNot: 'Tabloda yalnızca takma adın ve skorun görünür.',
      adKisa: 'Ad 3-16 karakter olmalı; harf, rakam, boşluk, nokta, tire kullanabilirsin.', adUygunsuz: 'Bu ad kullanılamaz, başka bir ad dene.',
      gonderiliyor: 'Sıralamaya gönderiliyor…', gonderilemedi: 'Sıralamaya gönderilemedi.',
      yeni: 'Yeni rekorun tabloya yazıldı.', ayni: 'Rekorun daha iyi:', sira: (h, t) => `Bu hafta ${h}. · Tüm zamanlar ${t}.`,
      gor: 'Tabloyu gör', gizlilik: 'Gizlilik',
    },
    en: {
      baslik: 'Leaderboard', hafta: 'This week', tum: 'All time', kapat: 'Close', pano: 'Board',
      yukleniyor: 'Loading…', bos: 'Nobody here yet. Be the first!', hata: 'Could not load the board.', tekrar: 'Try again',
      sen: 'you', haftaNot: 'The weekly board resets every Monday at 00:00 (UTC+3).',
      adin: 'Name:', degistir: 'Change', kaydet: 'Save', vazgec: 'Cancel', sil: 'Delete my scores',
      silOnay: 'Delete all your scores from the leaderboard?', silindi: 'Your scores were deleted.', silinemedi: 'Could not delete, check your connection.',
      adYok: 'Finish a game to join the leaderboard with a nickname.',
      adSor: 'Pick a nickname to join the leaderboard:', adYer: 'Nickname', gir: 'Submit',
      adNot: 'Only your nickname and score are shown on the board.',
      adKisa: 'Use 3-16 characters: letters, digits, spaces, dots, dashes.', adUygunsuz: 'This name is not allowed, try another one.',
      gonderiliyor: 'Sending to the leaderboard…', gonderilemedi: 'Could not send to the leaderboard.',
      yeni: 'Your new record is on the board.', ayni: 'Your record is better:', sira: (h, t) => `This week #${h} · All time #${t}`,
      gor: 'View board', gizlilik: 'Privacy',
    },
  };

  // --- yerel kayıt: { ad, uid, rt, it, son, panolar: { pano: [hafta, ...] } } ---
  function oku() {
    try { return JSON.parse(localStorage.getItem(ANAHTAR)) || {}; } catch (e) { return {}; }
  }
  function yaz(k) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(k)); } catch (e) {}
  }
  const haftaNo = (ms) => Math.floor(((ms || Date.now()) + KAYMA) / HAFTA);

  // --- ağ ---
  async function istek(url, ayar) {
    const ac = new AbortController(), zaman = setTimeout(() => ac.abort(), 12000);
    try {
      const r = await fetch(url, Object.assign({ signal: ac.signal }, ayar));
      const govde = await r.text();
      if (!r.ok) { const e = new Error('http ' + r.status); e.status = r.status; throw e; }
      return govde ? JSON.parse(govde) : null;
    } finally { clearTimeout(zaman); }
  }
  const db = (yol, yontem, veri, jeton, sorgu) =>
    istek(`${DB}/${yol}.json?${jeton ? 'auth=' + encodeURIComponent(jeton) : ''}${sorgu || ''}`,
      yontem ? { method: yontem, body: JSON.stringify(veri) } : undefined);

  async function oturum(yenile) {
    const k = oku();
    if (!yenile && k.it && k.son - 60000 > Date.now()) return k;
    if (k.rt) {
      try {
        const j = await istek(`${TOKEN}?key=${API_KEY}`, {
          method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(k.rt),
        });
        Object.assign(k, { uid: j.user_id, it: j.id_token, rt: j.refresh_token, son: Date.now() + j.expires_in * 1000 });
        yaz(k);
        return k;
      } catch (e) {
        if (e.status !== 400) throw e; // bağlantı sorunu: kimlik korunur
      }
    }
    // ilk kez ya da kimlik geçersiz: yeni anonim kimlik
    const j = await istek(`${AUTH}:signUp?key=${API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    Object.assign(k, { uid: j.localId, it: j.idToken, rt: j.refreshToken, son: Date.now() + j.expiresIn * 1000, panolar: {} });
    yaz(k);
    return k;
  }
  // Oturum gerektiren yazım; jeton reddedilirse bir kez yenileyip dener
  async function yazim(yol, yontem, veri) {
    let k = await oturum();
    try { return await db(yol, yontem, veri(k), k.it); } catch (e) {
      if (e.status !== 401) throw e;
      k = await oturum(true);
      return db(yol, yontem, veri(k), k.it);
    }
  }

  // Liste: ilk 100, puana (eşitse önce gelene) göre sıralı. Kısa süre önbellekte tutulur.
  const onbellek = {};
  async function liste(pano, hafta) {
    const yol = hafta ? `lb/${pano}/w/${hafta}` : `lb/${pano}/all`;
    const o = onbellek[yol];
    if (o && Date.now() - o.zaman < TAZE) return o.veri;
    const j = await db(yol, null, null, null, `&orderBy=%22s%22&limitToFirst=${GETIR}`);
    const veri = Object.entries(j || {}).map(([uid, v]) => Object.assign({ uid }, v)).sort((a, b) => a.s - b.s || a.t - b.t);
    onbellek[yol] = { zaman: Date.now(), veri };
    return veri;
  }
  const temizle = () => { for (const y in onbellek) delete onbellek[y]; };
  // Eşit puanlar aynı sırayı paylaşır; ilk 100'de yoksa null
  function siraBul(veri, uid) {
    const ben = veri.find((x) => x.uid === uid);
    return ben ? 1 + veri.filter((x) => x.s < ben.s).length : null;
  }

  // --- ad denetimi ---
  // Engelli kökler base64 içinde (kaynakta küfür listesi açık durmasın). Ön ek: * içinde geçerse, ^ kelime başında, = tam kelime
  const YASAK = atob('Km9yb3NwdSwqc2lrdGlyLCpzaWtpcyxec2lrLCp5YXJhaywqYW1jaWssKmFtaW5ha28sPWFtaW5hLCpwZXpldmVuaywqZ2F2YXQsKmthaHBlLCppYm5lLCpwdXN0LCprYWx0YWssKnN1cnR1aywqeWF2c2FrLCpnb3R2ZXJlbixeZ290dSw9Z290LD1hbWssPWFtcSw9YXEsPW1rLD1vYywqZnVjaywqc2hpdCwqYml0Y2gsKmN1bnQsKndob3JlLCpzbHV0LF5uaWdlciw9bmlnYSxeZmFnbywqcG9ybiwqcGVuaXMsKnZhZ2luYSwqaGl0bGVyLD1uYXppLCpyaWRzZ2FtZSw9YWRtaW4sPW1vZGVyYXRvciw9eW9uZXRpY2k=').split(',');
  const HARF = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '€': 'e' };
  function sade(s) {
    return s.toLocaleLowerCase('tr').replace(/i̇|[çğıöşü013457@$€]/g, (c) => HARF[c]).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function adDenetle(ham) {
    const ad = String(ham || '').replace(/\s+/g, ' ').trim();
    if (ad.length < 3 || ad.length > 16 || !/^[\p{L}\p{N}][\p{L}\p{N} ._-]*[\p{L}\p{N}.]$/u.test(ad)) return { hata: 'adKisa' };
    const kelimeler = sade(ad).split(/[^a-z]+/).filter(Boolean).map((w) => w.replace(/(.)\1+/g, '$1'));
    // "o r o s p u" gibi harf harf yazımda kelimeler birleştirilip de bakılır
    const parcalar = kelimeler.some((w) => w.length <= 2) ? kelimeler.concat(kelimeler.join('')) : kelimeler;
    const kotu = YASAK.some((y) => {
      const kok = y.slice(1);
      if (y[0] === '*') return parcalar.some((w) => w.includes(kok));
      if (y[0] === '^') return kelimeler.some((w) => w.startsWith(kok));
      return kelimeler.includes(kok);
    });
    return kotu ? { hata: 'adUygunsuz' } : { ad };
  }

  // --- skor gönderimi ---
  async function gonder(pano, skor) {
    const k = await oturum();
    const h = haftaNo();
    const yolT = `${pano}/all/${k.uid}`, yolH = `${pano}/w/${h}/${k.uid}`;
    const [eskiT, eskiH] = await Promise.all([db('lb/' + yolT), db('lb/' + yolH)]);
    const kayit = { n: k.ad, s: skor.s, d: skor.d, t: { '.sv': 'timestamp' } };
    if (skor.p != null) kayit.p = skor.p;
    const yama = {};
    if (!eskiT || skor.s < eskiT.s) yama[yolT] = kayit;
    if (!eskiH || skor.s < eskiH.s) yama[yolH] = kayit;
    if (Object.keys(yama).length) {
      await yazim('lb', 'PATCH', (kk) => kk.uid === k.uid ? yama : {});
      const kk = oku();
      kk.panolar = kk.panolar || {};
      const haftalar = kk.panolar[pano] = kk.panolar[pano] || [];
      if (!haftalar.includes(h)) haftalar.push(h);
      yaz(kk);
      temizle();
    }
    const [lH, lT] = await Promise.all([liste(pano, h), liste(pano)]);
    return {
      yeni: Object.keys(yama).length > 0,
      rekor: yama[yolH] ? skor : (eskiH || skor),
      siraH: siraBul(lH, k.uid), siraT: siraBul(lT, k.uid),
    };
  }

  // Ad değişimi: bu cihazdan girilen tablolardaki tüm zamanlar ve bu haftanın kayıtları
  async function adDegistir(ad) {
    const k = oku();
    k.ad = ad;
    yaz(k);
    if (!k.uid || !k.panolar) return;
    const h = haftaNo(), yollar = [];
    for (const [pano, haftalar] of Object.entries(k.panolar)) {
      yollar.push(`lb/${pano}/all/${k.uid}/n`);
      if (haftalar.includes(h)) yollar.push(`lb/${pano}/w/${h}/${k.uid}/n`);
    }
    // kayıt panelden silinmiş olabilir: her yol ayrı yazılır, olmayanın hatası yok sayılır
    await Promise.all(yollar.map((y) => yazim(y, 'PUT', () => ad).catch(() => {})));
    temizle();
  }

  async function kayitlariSil() {
    const k = oku();
    if (k.uid && k.panolar) {
      const yama = {};
      for (const [pano, haftalar] of Object.entries(k.panolar)) {
        yama[`${pano}/all/${k.uid}`] = null;
        for (const h of haftalar) yama[`${pano}/w/${h}/${k.uid}`] = null;
      }
      if (Object.keys(yama).length) await yazim('lb', 'PATCH', () => yama);
      // anonim hesap da silinir
      try { await istek(`${AUTH}:delete?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: oku().it }) }); } catch (e) {}
    }
    try { localStorage.removeItem(ANAHTAR); } catch (e) {}
    temizle();
  }

  // --- görünüm ---
  const CSS = `
.lb-ort{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,.78);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:Inter,system-ui,-apple-system,sans-serif;color:#e2e8f0;user-select:text;-webkit-user-select:text}
.lb-kutu{width:100%;max-width:420px;max-height:calc(100dvh - 32px);display:flex;flex-direction:column;gap:10px;background:#0f172a;border:1px solid var(--lb-vurgu-ac);border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.lb-ust{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lb-ust h2{margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:.02em}
.lb-x{width:32px;height:32px;flex:none;border:0;border-radius:10px;background:#1e293b;color:#cbd5e1;font-size:14px;font-weight:700;cursor:pointer}
.lb-pano{width:100%;height:38px;padding:0 10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#e2e8f0;font:inherit;font-size:14px}
.lb-sekme{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:12px;background:#020617;border:1px solid #1e293b}
.lb-sekme button{height:34px;border:0;border-radius:9px;background:transparent;color:#94a3b8;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.lb-sekme button[aria-selected=true]{background:var(--lb-vurgu);color:#020617}
.lb-liste{list-style:none;margin:0;padding:0;overflow-y:auto;min-height:120px;display:flex;flex-direction:column;gap:4px}
.lb-satir{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;min-height:38px;padding:0 10px;border-radius:10px;background:#111c30;border:1px solid transparent;font-size:14px}
.lb-satir .lb-no{font-weight:800;color:#94a3b8;text-align:center;font-variant-numeric:tabular-nums}
.lb-satir .lb-ad{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f1f5f9;font-weight:600}
.lb-satir .lb-ad small{color:var(--lb-vurgu);font-weight:700;margin-left:4px}
.lb-satir .lb-puan{font-weight:700;color:#fcd34d;font-variant-numeric:tabular-nums;white-space:nowrap}
.lb-satir.lb-ben{border-color:var(--lb-vurgu);background:var(--lb-vurgu-koyu)}
.lb-ara{text-align:center;color:#475569;line-height:1;padding:2px 0}
.lb-durum{margin:auto;padding:24px 8px;text-align:center;color:#94a3b8;font-size:14px}
.lb-not{margin:0;font-size:12px;color:#64748b;text-align:center}
.lb-alt{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 10px;padding-top:10px;border-top:1px solid #1e293b;font-size:13px;color:#94a3b8;text-align:center}
.lb-alt b{color:#f1f5f9}
.lb-bag{border:0;background:none;padding:0;color:var(--lb-vurgu);font:inherit;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.lb-alt a{color:#64748b}
.lb-form{display:flex;gap:6px;width:100%}
.lb-form input{flex:1;min-width:0;height:38px;padding:0 10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#f8fafc;font:inherit;font-size:15px;user-select:text;-webkit-user-select:text}
.lb-form input:focus{outline:none;border-color:var(--lb-vurgu)}
.lb-dugme{height:38px;padding:0 14px;border:0;border-radius:10px;background:var(--lb-vurgu);color:#020617;font:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap}
.lb-dugme:disabled{opacity:.5;cursor:default}
.lb-dugme.lb-ikinci{background:#1e293b;color:#cbd5e1}
.lb-yuva{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;font-size:13px;color:#cbd5e1;font-family:Inter,system-ui,-apple-system,sans-serif;user-select:text;-webkit-user-select:text}
.lb-yuva:empty{display:none}
.lb-yuva .lb-kucuk{font-size:11px;color:#64748b}
.lb-yuva .lb-uyari{color:#fca5a5}
.lb-yuva b{color:#fff}
`;
  let stilVar = false;
  function stilEkle() {
    if (stilVar) return;
    stilVar = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function el(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }

  window.RidsSiralama = function (ayar) {
    const dil = () => (ayar.dil && ayar.dil() === 'en' ? 'en' : 'tr');
    const m = () => METIN[dil()];
    const olay = (ad) => { try { ayar.olay && ayar.olay(ad); } catch (e) {} };
    const vurgu = ayar.renk || '#22d3ee';

    let ort = null, secili = ayar.panolar[0].id, sekme = 'hafta', istekNo = 0, oncekiOdak = null;

    function kapat() {
      if (!ort) return;
      ort.remove();
      ort = null;
      document.removeEventListener('keydown', tus, true);
      if (oncekiOdak && oncekiOdak.focus) oncekiOdak.focus();
    }
    function tus(e) {
      if (e.key === 'Escape') { e.stopPropagation(); kapat(); }
    }

    function satir(x, sira, benim) {
      const li = el('li', 'lb-satir' + (benim ? ' lb-ben' : ''));
      li.appendChild(el('span', 'lb-no', sira <= 3 ? ['🥇', '🥈', '🥉'][sira - 1] : String(sira)));
      const ad = el('span', 'lb-ad', x.n);
      if (benim) ad.appendChild(el('small', null, '(' + m().sen + ')'));
      li.appendChild(ad);
      li.appendChild(el('span', 'lb-puan', ayar.bicim(x, dil())));
      return li;
    }

    async function listeyiDoldur() {
      const ol = ort.querySelector('.lb-liste'), no = ++istekNo;
      ol.replaceChildren(el('li', 'lb-durum', m().yukleniyor));
      try {
        const veri = await liste(secili, sekme === 'hafta' ? haftaNo() : null);
        if (no !== istekNo || !ort) return;
        ol.replaceChildren();
        if (!veri.length) { ol.appendChild(el('li', 'lb-durum', m().bos)); return; }
        const uid = oku().uid;
        const sira = (x) => 1 + veri.filter((y) => y.s < x.s).length;
        veri.slice(0, ILK).forEach((x) => ol.appendChild(satir(x, sira(x), x.uid === uid)));
        const ben = veri.findIndex((x) => x.uid === uid);
        if (ben >= ILK) {
          if (ben > ILK) ol.appendChild(el('li', 'lb-ara', '⋮'));
          ol.appendChild(satir(veri[ben], sira(veri[ben]), true));
        }
      } catch (e) {
        if (no !== istekNo || !ort) return;
        const li = el('li', 'lb-durum', m().hata + ' ');
        const b = el('button', 'lb-bag', m().tekrar);
        b.type = 'button';
        b.onclick = listeyiDoldur;
        li.appendChild(b);
        ol.replaceChildren(li);
      }
    }

    function altiCiz(mesaj) {
      const alt = ort.querySelector('.lb-alt'), t = m(), k = oku();
      alt.replaceChildren();
      if (mesaj) alt.appendChild(el('span', null, mesaj));
      else if (k.ad) {
        const s = el('span', null, t.adin + ' ');
        s.appendChild(el('b', null, k.ad));
        alt.appendChild(s);
        const d = el('button', 'lb-bag', t.degistir);
        d.type = 'button';
        d.onclick = () => adFormu(alt, k.ad, async (ad) => { await adDegistir(ad); altiCiz(); listeyiDoldur(); }, () => altiCiz());
        alt.appendChild(d);
        const sl = el('button', 'lb-bag', t.sil);
        sl.type = 'button';
        sl.onclick = async () => {
          if (!confirm(t.silOnay)) return;
          sl.disabled = true;
          try { await kayitlariSil(); altiCiz(t.silindi); listeyiDoldur(); } catch (e) { altiCiz(t.silinemedi); }
        };
        alt.appendChild(sl);
      } else alt.appendChild(el('span', null, t.adYok));
      const a = el('a', null, t.gizlilik);
      a.href = GIZLILIK + (dil() === 'en' ? '#en' : '');
      a.target = '_blank';
      a.rel = 'noopener';
      alt.appendChild(a);
    }

    function ac(panoId) {
      stilEkle();
      if (panoId && ayar.panolar.some((p) => p.id === panoId)) secili = panoId;
      kapat();
      olay('acildi');
      oncekiOdak = document.activeElement;
      const t = m();
      ort = el('div', 'lb-ort');
      ort.style.setProperty('--lb-vurgu', vurgu);
      ort.style.setProperty('--lb-vurgu-ac', vurgu + '66');
      ort.style.setProperty('--lb-vurgu-koyu', vurgu + '22');
      ort.setAttribute('role', 'dialog');
      ort.setAttribute('aria-modal', 'true');
      ort.setAttribute('aria-labelledby', 'lb-baslik');
      ort.innerHTML = '<div class="lb-kutu"><div class="lb-ust"><h2 id="lb-baslik"></h2><button type="button" class="lb-x">✕</button></div>' +
        '<div class="lb-sekme" role="tablist"><button type="button" role="tab" data-s="hafta"></button><button type="button" role="tab" data-s="tum"></button></div>' +
        '<ol class="lb-liste"></ol><p class="lb-not"></p><div class="lb-alt"></div></div>';
      ort.querySelector('h2').textContent = '🏅 ' + t.baslik;
      const x = ort.querySelector('.lb-x');
      x.setAttribute('aria-label', t.kapat);
      x.onclick = kapat;
      ort.addEventListener('click', (e) => { if (e.target === ort) kapat(); });
      if (ayar.panolar.length > 1) {
        const sec = el('select', 'lb-pano');
        sec.setAttribute('aria-label', t.pano);
        for (const p of ayar.panolar) {
          const o = el('option', null, p[dil()]);
          o.value = p.id;
          sec.appendChild(o);
        }
        sec.value = secili;
        sec.onchange = () => { secili = sec.value; listeyiDoldur(); };
        ort.querySelector('.lb-ust').after(sec);
      }
      const sekmeler = ort.querySelectorAll('.lb-sekme button');
      const sekmeCiz = () => sekmeler.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === sekme)));
      sekmeler.forEach((b) => {
        b.textContent = b.dataset.s === 'hafta' ? t.hafta : t.tum;
        b.onclick = () => { sekme = b.dataset.s; sekmeCiz(); listeyiDoldur(); };
      });
      sekmeCiz();
      ort.querySelector('.lb-not').textContent = t.haftaNot;
      document.body.appendChild(ort);
      document.addEventListener('keydown', tus, true);
      altiCiz();
      listeyiDoldur();
      x.focus();
    }

    // Ad formu: hem oyun sonu yuvasında hem pencerenin altında kullanılır
    function adFormu(kap, deger, tamam, vazgec) {
      const t = m();
      const form = el('form', 'lb-form');
      const inp = el('input');
      inp.maxLength = 16;
      inp.placeholder = t.adYer;
      inp.setAttribute('aria-label', t.adYer);
      inp.autocomplete = 'nickname';
      inp.enterKeyHint = 'send';
      inp.value = deger || '';
      const b = el('button', 'lb-dugme', deger ? t.kaydet : t.gir);
      b.type = 'submit';
      form.append(inp, b);
      if (vazgec) {
        const v = el('button', 'lb-dugme lb-ikinci', t.vazgec);
        v.type = 'button';
        v.onclick = vazgec;
        form.appendChild(v);
      }
      const uyari = el('div', 'lb-kucuk lb-uyari');
      form.onsubmit = async (e) => {
        e.preventDefault();
        const r = adDenetle(inp.value);
        if (r.hata) { uyari.textContent = t[r.hata]; if (!uyari.isConnected) form.after(uyari); inp.focus(); return; }
        b.disabled = true;
        await tamam(r.ad);
      };
      kap.replaceChildren(form);
      setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 50);
      return form;
    }

    function bosalt(yuva) {
      yuva.lbNo = (yuva.lbNo || 0) + 1;
      yuva.replaceChildren();
    }

    // Oyun sonu: skor gönderilir, sonuç yuvaya yazılır
    function bitti(yuva, panoId, skor) {
      bosalt(yuva);
      const no = yuva.lbNo;
      stilEkle();
      yuva.classList.add('lb-yuva');
      yuva.style.setProperty('--lb-vurgu', vurgu);
      const t = m();
      const gorDugmesi = () => {
        const g = el('button', 'lb-bag', t.gor);
        g.type = 'button';
        g.onclick = () => ac(panoId);
        return g;
      };
      async function yolla() {
        yuva.replaceChildren(el('div', null, t.gonderiliyor));
        try {
          const r = await gonder(panoId, skor);
          olay(r.yeni ? 'rekor' : 'gonderildi');
          if (yuva.lbNo !== no) return;
          yuva.replaceChildren();
          if (r.yeni) yuva.appendChild(el('div', null, t.yeni));
          else {
            const d = el('div', null, t.ayni + ' ');
            d.appendChild(el('b', null, ayar.bicim(r.rekor, dil())));
            yuva.appendChild(d);
          }
          const s = el('div');
          s.appendChild(el('b', null, t.sira(r.siraH || '100+', r.siraT || '100+')));
          s.appendChild(document.createTextNode(' '));
          s.appendChild(gorDugmesi());
          yuva.appendChild(s);
        } catch (e) {
          if (yuva.lbNo !== no) return;
          const d = el('div', 'lb-uyari', t.gonderilemedi + ' ');
          const b = el('button', 'lb-bag', t.tekrar);
          b.type = 'button';
          b.onclick = yolla;
          d.appendChild(b);
          yuva.replaceChildren(d);
        }
      }
      if (oku().ad) { yolla(); return; }
      const ust = el('div', null, t.adSor);
      const govde = el('div');
      govde.style.width = '100%';
      adFormu(govde, '', async (ad) => {
        if (yuva.lbNo !== no) return;
        const k = oku();
        k.ad = ad;
        yaz(k);
        olay('ad');
        await yolla();
      });
      const not = el('div', 'lb-kucuk', t.adNot + ' ');
      not.appendChild(gorDugmesi());
      yuva.replaceChildren(ust, govde, not);
    }

    return { ac, bitti, bosalt, kapat };
  };
  // Süre biçimi: onda bir saniye -> 01:02.3
  window.RidsSiralama.sure = (d) => {
    const sn = Math.floor(d / 10);
    return String(Math.floor(sn / 60)).padStart(2, '0') + ':' + String(sn % 60).padStart(2, '0') + '.' + (d % 10);
  };
})();
