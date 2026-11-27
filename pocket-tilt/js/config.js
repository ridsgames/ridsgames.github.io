// --- Ayarlar ---
// Oyuncak içi 200 birim: yuvarlakta merkezden kenara 100, karede -100..100
const BALL_R = 6, DIMPLE_R = 8, HOLE_R = 7.5;  // bilye, yuva ve tuzak deliği yarıçapı
// Oyunun hissi bu değerlerle değişir
const TILT_G = 900;                  // tam eğimde bilyenin ivmesi (birim/s²)
const FRICTION = 0.6;                // yuvarlanma sürtünmesi (1/s)
const WELL = 0.55, WELL_DAMP = 7;    // yuva kenarındaki çekim (tam eğimin oranı) ve yuva içi sönüm
const HOLE_PULL = 0.25;              // tuzak deliği kenarındaki çekim
const E_WALL = 0.35, E_BALL = 0.7;   // duvardan / bilyeden sekme
const ICE = 0.02, ICE_SLIDE = 1.35;  // buzda sürtünme (normalin oranı); buzda bilye yuvarlanmaz kayar, eğime daha hızlı kapılır
const MAX_V = 800, DT = 1 / 480;
const GYRO_DEADZONE_DEG = 1.5;       // tam eğim açısı ayarlardaki hassasiyetten gelir
const DRAG_FULL = 70;                // parmakla bu kadar piksel sürükleyince tam eğim
const KEY_TILT = 0.7, VIEW = 120, TAU = Math.PI * 2;

const APP_VERSION = '1.0.1';
const UNLOCK_ALL = false;

// Ekonomi (altın)
const COINS = {
  first: 20, perStar: 10,            // ilk bitiriş: 20 + yıldız başına 10
  newStar: 15, replay: 5,            // tekrar oynayınca: yeni yıldız başına 15, yoksa 5
  daily: [50, 75, 100, 150, 200, 300, 500], // 7 günlük giriş ödülü (7. gün Elmas bilye, sahipse 500)
  dailyMaze: 100,                    // günün labirenti, günde bir
  freeAd: 50, freeAdPerDay: 5,       // mağazada reklamla ücretsiz altın
  hint: 100                          // ipucu fiyatı
};

// Reklam kimlikleri: şimdilik Google'ın test kimlikleri. Yayından önce AdMob'daki kendi kimliklerinle değiştir
// (android/app/src/main/res/values/strings.xml içindeki admob_app_id de değişmeli).
const ADS = {
  testing: true,
  android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
  ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
  interstitialFromLevel: 8,          // bu bölümden önce tam ekran reklam yok
  interstitialEvery: 3,              // en az kaç bölümde bir
  interstitialGapSec: 150,           // iki tam ekran reklam arası en az süre
  afterRewardedGapSec: 90            // ödüllü reklamdan sonra tam ekran reklam beklemesi
};
const PRIVACY_URL = '../web-gizlilik.html';

const NATIVE = (window.Capacitor && window.Capacitor.Plugins) || {};
const PLATFORM = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web';
