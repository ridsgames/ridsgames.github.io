// --- Kayıt ---
// Tarayıcı deposu hızlı okunur; uygulamada ayrıca Preferences'a yazılır (WebView deposu silinirse oradan geri gelir)
const SAVE_KEY = 'bilyeli_labirent_v1';
const DEFAULT_SAVE = {
  coins: 0, levels: {}, last: -1,
  skin: 'steel', skins: ['steel'], skinAds: {},
  settings: { sfx: true, music: true, haptics: true, control: 'auto', sens: 22, lang: 'auto', symbols: false },
  daily: { day: 0, last: '' },
  dailyMaze: { last: '', streak: 0, lastDone: '', best: 0 },
  ads: { freeDay: '', freeCount: 0, removeAds: false },
  seen: {}, tutorial: false, layoutVersion: 1, unlockedWorlds: []
};
function mergeSave(base, data) {
  const out = JSON.parse(JSON.stringify(base));
  if (!data || typeof data !== 'object') return out;
  for (const k of Object.keys(data)) {
    out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? { ...base[k], ...data[k] } : data[k];
  }
  // İlk dünyaya beş bölüm eklendi; yıldızlar değişen numaraya değil aynı labirente ait kalsın.
  if (!(data.layoutVersion >= 1)) {
    if (out.levels['1-25'] || Object.keys(out.levels).some((id) => id.startsWith('2-'))) {
      out.unlockedWorlds = [...new Set([...out.unlockedWorlds, 1])];
    }
    const a = out.levels['1-21'], b = out.levels['1-25'];
    delete out.levels['1-21']; delete out.levels['1-25'];
    if (a) out.levels['1-25'] = a;
    if (b) out.levels['1-21'] = b;
    if (out.last === 20) out.last = 24;
    else if (out.last === 24) out.last = 20;
    else if (out.last >= 25) out.last += 5;
    out.layoutVersion = 1;
  }
  return out;
}
let save = (() => { try {
  const raw = localStorage.getItem(SAVE_KEY), value = mergeSave(DEFAULT_SAVE, JSON.parse(raw));
  if (raw) try { localStorage.setItem(SAVE_KEY, JSON.stringify(value)); } catch (e) {}
  return value;
} catch (e) { return mergeSave(DEFAULT_SAVE); } })();
function store() {
  const s = JSON.stringify(save);
  try { localStorage.setItem(SAVE_KEY, s); } catch (e) {}
  if (NATIVE.Preferences) NATIVE.Preferences.set({ key: SAVE_KEY, value: s }).catch(() => {});
}
async function restoreSave() { // WebView deposu boşsa yerel kopyadan geri yükle
  if (!NATIVE.Preferences) return false;
  try {
    const { value } = await NATIVE.Preferences.get({ key: SAVE_KEY });
    let local = null;
    try { local = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (value && !local) { save = mergeSave(DEFAULT_SAVE, JSON.parse(value)); store(); return true; }
    if (local) store(); // taşınmış kaydı yerel yedeğe de yaz
  } catch (e) {}
  return false;
}
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return today(d); };
