// En çok oynanan oyunlar: son 14 günde her oyunun kaç kez başlatıldığını GoatCounter'dan alır,
// sırayı assets/populer.json dosyasına yazar. Ana sayfa bu dosyayı okuyup "En çok oynananlar" sırasını kurar.
// Anahtar GitHub'daki GOATCOUNTER_KEY gizli değişkeninden gelir; depoda ya da sayfada yer almaz.
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.GC_KEY;
if (!KEY) { console.error('GOATCOUNTER_KEY gizli değişkeni tanımlı değil.'); process.exit(1); }
const API = process.env.GC_API || 'https://ridsgames.goatcounter.com/api/v0'; // GC_API yalnız deneme için
const GUN = 14, KAC = 12, OUT = 'assets/populer.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// GoatCounter saniyede 4 istek kabul eder; istekler arası 400 ms, geçici hatada birkaç kez yeniden dener
async function get(path, params) {
  for (let i = 0; i < 5; i++) {
    if (i) await sleep(1500 * i);
    await sleep(400);
    let r;
    try { r = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: 'Bearer ' + KEY } }); }
    catch (e) { continue; }
    if (r.status === 401 || r.status === 403) throw new Error('GoatCounter anahtarı geçersiz ya da istatistik okuma izni yok.');
    if (r.status === 429 || r.status >= 500) continue;
    if (!r.ok) throw new Error(`GoatCounter ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error('GoatCounter yanıt vermedi.');
}

// sitede bulunan oyunlar: ana sayfadaki oyun kartlarından okunur, böylece yeni oyun kendiliğinden katılır
const html = readFileSync('index.html', 'utf8');
const games = new Set([...html.matchAll(/<a class="game" href="([a-z0-9-]+)\/"/g)].map((m) => m[1]));

// GoatCounter saate yuvarlanmış zaman ister (panel de böyle sorar)
const end = new Date(); end.setUTCMinutes(0, 0, 0); end.setUTCHours(end.getUTCHours() + 1);
const start = new Date(end.getTime() - GUN * 864e5);
const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const counts = {}, seen = [];
for (let page = 0; page < 10; page++) {
  const q = { start: iso(start), end: iso(end), limit: 100 };
  if (seen.length) q.exclude_paths = seen.join(',');
  const r = await get('/stats/hits', q);
  for (const h of r.hits || []) {
    seen.push(h.path_id);
    const m = /^\/*([a-z0-9-]+)\/basladi\/*$/.exec(String(h.path || ''));
    if (h.event && m && games.has(m[1])) counts[m[1]] = (counts[m[1]] || 0) + (h.count || 0);
  }
  if (!r.more || !(r.hits || []).length) break;
}

const order = Object.keys(counts).filter((s) => counts[s] > 0).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)).slice(0, KAC);
console.log(order.map((s) => `${s}: ${counts[s]}`).join('\n') || '(veri yok)');
// hiç veri gelmezse eldeki sıra bozulmasın
if (!order.length) { console.log('Başlatma verisi yok, dosya değiştirilmedi.'); process.exit(0); }
// yalnız sıra yazılır; sayılar her gün değiştiği için yazılsaydı her gün gereksiz güncelleme olurdu
writeFileSync(OUT, JSON.stringify({ gun: GUN, oyunlar: order }) + '\n');
