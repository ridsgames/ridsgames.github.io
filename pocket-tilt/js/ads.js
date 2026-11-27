// --- Reklamlar ---
// Uygulamada AdMob; tarayıcıda deneme reklamı (3 saniyelik sahte ekran) gösterilir
const Ads = (() => {
  const A = NATIVE.AdMob, ids = ADS[PLATFORM === 'ios' ? 'ios' : 'android'];
  let ready = false, rewardedReady = false, interReady = false, lastInter = Date.now(), lastRewarded = 0, winsSince = 0, privacyRequired = false;
  let initP = null, prepP = null, busy = false;
  // Yerel taraf hiç yanıt vermezse oyun takılmasın diye her bekleyişin bir süresi var
  const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('timeout'), ms))]);
  function prepRewarded() {
    if (!A || !ready || rewardedReady) return Promise.resolve();
    if (!prepP) {
      prepP = A.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: ADS.testing })
        .then(() => { rewardedReady = true; }, () => { rewardedReady = false; })
        .finally(() => { prepP = null; });
    }
    return prepP;
  }
  async function prepInter() {
    if (!A || !ready || interReady || save.ads.removeAds) return;
    try { await A.prepareInterstitial({ adId: ids.interstitial, isTesting: ADS.testing }); interReady = true; } catch (e) { interReady = false; }
  }
  // Uygulamada Capacitor.Plugins üzerinden alınan dinleyici { remove } nesnesidir, Promise değildir;
  // paketlenmiş eklentide ise Promise döner. İkisini de kapat, hata hiçbir akışı yarıda bırakmasın.
  function unlisten(h) {
    try { Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {}); } catch (e) {}
  }
  // Tam ekran reklamı göster ve bitmesini bekle. Söz ne olursa olsun çözülür, oyun hiçbir reklamda kilitlenmez.
  // Reklamın üstte olduğunu gösterenler: açıldı olayı, sayfanın gizlenmesi, uygulamanın duraklaması.
  // Bittiğini gösterenler: kapandı/açılamadı olayı, sayfanın ya da uygulamanın geri gelmesi, oyuncunun
  // ekrana dokunabilmesi ya da geri tuşunun oyuna ulaşması (reklam üstteyken dokunuşlar reklama gider).
  // pre: olay adı ön eki ('onRewardedVideoAd' ya da 'interstitialAd'); rewardSuffix verilirse ödül olayı da izlenir
  let showing = false, pending = null;
  function showFullscreen(show, pre, rewardSuffix) {
    return new Promise((resolve) => {
      let got = false, showed = false, hidden = false, done = false;
      const t0 = Date.now(), hs = [], tms = [];
      const later = (f, ms) => tms.push(setTimeout(f, ms));
      const on = (n, f) => { try { hs.push(A.addListener(n, f)); } catch (e) {} };
      const vis = () => {
        if (document.hidden) hidden = true;
        else if (hidden) later(() => finish('resumed'), 900); // reklam kapandı, kuyruktaki olaylara süre tanı
      };
      const end = (result) => {
        try {
          tms.forEach(clearTimeout);
          hs.forEach(unlisten);
          document.removeEventListener('visibilitychange', vis);
          Sfx.duck(false);
        } catch (e) {}
        pending = null; showing = false;
        resolve({ result, got });
      };
      const finish = (result) => {
        if (done) return;
        done = true;
        if (rewardSuffix && !got && result !== 'fail') setTimeout(() => end(result), 700); // geç gelen ödül
        else end(result);
      };
      // Dokunuş ya da geri tuşu oyuna ulaştıysa reklam üstte değildir. Reklamı açan dokunuşun
      // artçıları sayılmasın diye ilk anlar beklenir; reklam hiç görünmediyse biraz daha uzun.
      pending = () => { if (Date.now() - t0 > (showed || hidden ? 1200 : 3000)) finish('touched'); };
      showing = true;
      try {
        if (rewardSuffix) on(pre + rewardSuffix, () => { got = true; });
        on(pre + 'Showed', () => { showed = true; });
        on(pre + 'Dismissed', () => finish('dismissed'));
        on(pre + 'FailedToShow', () => finish('fail'));
        if (pre === 'onRewardedVideoAd') on(pre + 'FailedToLoad', () => finish('fail'));
        document.addEventListener('visibilitychange', vis);
        if (NATIVE.App) {
          hs.push(NATIVE.App.addListener('pause', () => { hidden = true; }));
          hs.push(NATIVE.App.addListener('resume', () => later(() => finish('resumed'), 900)));
        }
        Sfx.duck(true);
      } catch (e) {}
      // hiç açılmadıysa: ödüllü reklamda oyuncu bekliyor, geçiş reklamında bekletme
      later(() => { if (!showed && !hidden) finish('noshow'); }, rewardSuffix ? 10000 : 3500);
      later(() => finish('timeout'), 180000);
      Promise.resolve().then(show).then(() => { if (rewardSuffix) got = true; }, () => finish('fail'));
    });
  }
  function fakeAd() { // tarayıcıda deneme
    return new Promise((res) => {
      const ov = document.getElementById('adSim'), btn = ov.querySelector('button'), num = ov.querySelector('.count');
      let n = 3; num.textContent = n; btn.disabled = true; ov.hidden = false;
      const iv = setInterval(() => { n--; num.textContent = Math.max(n, 0); if (n <= 0) { clearInterval(iv); btn.disabled = false; } }, 1000);
      btn.onclick = () => { ov.hidden = true; res(true); };
    });
  }
  return {
    get privacyRequired() { return privacyRequired; },
    get showing() { return showing; },
    // Oyun bir dokunuş ya da geri tuşu aldı: bekleyen reklam akışı varsa bitir
    poke() { if (pending) pending(); },
    init() {
      if (!A || ready) return Promise.resolve();
      if (!initP) initP = this.start().finally(() => { initP = null; });
      return initP;
    },
    async start() {
      if (PLATFORM === 'ios') {
        try {
          const st = await A.trackingAuthorizationStatus();
          if (st && st.status === 'notDetermined') await A.requestTrackingAuthorization();
        } catch (e) {}
      }
      // Onay bilgisi alınamazsa (ör. AdMob'da gizlilik mesajı tanımlı değilse) reklamlar yine de başlar;
      // yalnızca onay gerekip henüz verilmemişse başlamaz
      try {
        let info = await A.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await A.showConsentForm();
        privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
        if (info.canRequestAds === false) return;
      } catch (e) {}
      try {
        await A.initialize({ initializeForTesting: ADS.testing, maxAdContentRating: 'ParentalGuidance' });
        ready = true;
        prepRewarded(); prepInter();
      } catch (e) { ready = false; }
    },
    async showPrivacyOptions() { if (A) try { await A.showPrivacyOptionsForm(); } catch (e) {} },
    // Ödüllü reklam: ödül kazanıldıysa true döner
    // Reklam açıkken uygulama arka plana düşer; eklentinin olayları ancak dönüşte ve geç gelebilir.
    // Bu yüzden reklamın bittiğini uygulamanın ön plana dönmesinden de anlarız ve dönüşten sonra
    // gelen ödül olayını da sayarız.
    async rewarded() {
      if (busy) return false;
      busy = true;
      try {
        if (!A) { lastRewarded = Date.now(); return true; } // sitede reklam yok: ödül doğrudan verilir
        const load = $('adLoad');
        if (!ready || !rewardedReady) {
          load.hidden = false;
          if (!ready) await within(this.init(), 8000);
          if (ready && !rewardedReady) await within(prepRewarded(), 12000);
          load.hidden = true;
        }
        if (!ready || !rewardedReady) { toast(t('adFail')); return false; }
        rewardedReady = false;
        const how = await showFullscreen(() => A.showRewardVideoAd(), 'onRewardedVideoAd', 'Reward');
        prepRewarded();
        lastRewarded = Date.now();
        if (how.got) toast(t('rewardOk'));
        else if (how.result === 'fail' || how.result === 'noshow') toast(t('adFail'));
        return how.got;
      } finally {
        busy = false;
        const load = $('adLoad'); if (load) load.hidden = true;
      }
    },
    // Bölüm sonrası geçişte, kurallara uyuyorsa tam ekran reklam
    async afterWin(levelIndex) {
      try {
        if (save.ads.removeAds || levelIndex < ADS.interstitialFromLevel - 1) return;
        winsSince++;
        const now = Date.now();
        if (winsSince < ADS.interstitialEvery || now - lastInter < ADS.interstitialGapSec * 1000 || now - lastRewarded < ADS.afterRewardedGapSec * 1000) return;
        if (!A) return; // tarayıcıda tam ekran reklam taklidi yok
        if (!interReady) { prepInter(); return; }
        interReady = false;
        await showFullscreen(() => A.showInterstitial(), 'interstitialAd');
        winsSince = 0; lastInter = Date.now(); prepInter();
      } catch (e) {}
    }
  };
})();
