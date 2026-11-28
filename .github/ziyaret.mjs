// Son ziyaretler: GoatCounter'dan son kayıtları dışa aktarır (CSV), son 3 günü şifreleyip "veri" dalına yazılacak dosyaya koyar.
// Panel bu dosyayı okur, anahtarla çözer ve ziyaretleri tek tek gösterir.
// Tarayıcı bunu kendisi yapamaz: GoatCounter dışa aktarmayı saatte bir kabul ediyor ve tarayıcının izin sorgusu (OPTIONS)
// da bu hakkı harcıyor, asıl istek hep reddediliyor.
// Şifre anahtarı GOATCOUNTER_KEY'den türetilir; paneldeki anahtar aynıysa çözülür. Depoda açık veri durmaz.
// Kullanım: node .github/ziyaret.mjs <eski.json> <yeni.json>   (değişiklik yoksa yeni dosya yazılmaz)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync, gunzipSync, createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { webcrypto as crypto } from 'node:crypto';

const KEY = process.env.GC_KEY;
if (!KEY) { console.error('GOATCOUNTER_KEY gizli değişkeni tanımlı değil.'); process.exit(1); }
const API = process.env.GC_API || 'https://ridsgames.goatcounter.com/api/v0'; // GC_API yalnız deneme için
const [OLD, OUT] = process.argv.slice(2);
const KEEP_S = 3 * 86400, MAX_ROWS = 6000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (u) => Buffer.from(u).toString('base64'), unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function aesKey() {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ridsgames-ziyaret:' + KEY));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), gzipSync(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, at: new Date().toISOString(), iv: b64(iv), ct: b64(new Uint8Array(ct)) });
}
async function open(text) {
  const f = JSON.parse(text);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, await aesKey(), unb64(f.ct));
  return JSON.parse(gunzipSync(Buffer.from(pt)).toString('utf8'));
}

async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r;
}

// önceki durum: son dışa aktarılan kayıt numarası ve son 3 günün satırları
let state = { last: 0, rows: [] };
try { state = await open(readFileSync(OLD, 'utf8')); } catch (e) { console.log('Önceki veri yok ya da çözülemedi, baştan alınıyor.'); }
const before = JSON.stringify({ last: state.last, err: state.err, n: state.rows.length, t: state.rows.at(-1)?.[0] });

async function write(next) {
  const now = JSON.stringify({ last: next.last, err: next.err, n: next.rows.length, t: next.rows.at(-1)?.[0] });
  if (now === before) { console.log('Yeni kayıt yok.'); return; }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, await seal(next));
  console.log(`Yazıldı: ${next.rows.length} satır, son kayıt ${next.last}.`);
}

let r = await api('POST', '/export', state.last ? { format: 'csv', start_from_hit_id: state.last } : { format: 'csv' });
if (r.status === 429) { console.log('GoatCounter saatte bir dışa aktarmaya izin veriyor, sonraki çalışmada denenecek.'); process.exit(0); }
if (r.status === 401 || r.status === 403) {
  console.log('::warning::GOATCOUNTER_KEY anahtarında Export izni yok. GoatCounter > API sayfasında anahtara Export iznini ver.');
  await write({ ...state, err: 'izin' }); process.exit(0);
}
if (!r.ok) throw new Error(`Dışa aktarma başlamadı (${r.status}): ${(await r.text()).slice(0, 200)}`);
let ex = await r.json();
for (let i = 0; !ex.finished_at && !ex.error && i < 200; i++) {
  await sleep(3000);
  r = await api('GET', `/export/${ex.id}`);
  if (r.ok) ex = await r.json();
}
if (ex.error) throw new Error('Dışa aktarma hatası: ' + ex.error);
if (!ex.finished_at) throw new Error('Dışa aktarma 10 dakikada bitmedi.');

// CSV akış halinde okunur (ilk çalışmada bütün geçmiş gelir); yalnız son 3 gün tutulur
const cut = Math.floor(Date.now() / 1000) - KEEP_S;
const bool = (s) => /^(1|t|true)$/i.test(String(s || '').trim());
const toT = (s) => { let x = String(s || '').trim().replace(' ', 'T'); if (!/(z|[+-]\d\d:?\d\d)$/i.test(x)) x += 'Z'; return Math.floor(Date.parse(x) / 1000); };
const fresh = [];
let head = null, total = 0;
function onRow(cells) {
  if (!head) { head = {}; cells.forEach((h, i) => { head[h.replace(/^\d+/, '')] = i; }); return; }
  if (cells.length < 2) return;
  const c = (k) => (head[k] == null ? '' : cells[head[k]] || '');
  total++;
  const t = toT(c('Date')); if (!(t >= cut)) return;
  if (c('Bot') && c('Bot') !== '0') return;
  const ev = bool(c('Event'));
  fresh.push([t, c('Path'), ev ? 1 : 0, ev ? c('Title').slice(0, 140) : '', c('Session').slice(0, 16), c('Screen size'), c('Browser'), c('System'), c('Location'), c('Referrer').slice(0, 200), c('Referrer scheme'), bool(c('FirstVisit')) ? 1 : 0]);
}
// Go'nun csv yazıcısının biçimi: virgülle ayrılır, gerekirse tırnak içinde, tırnak ikilenir
let st = 0, field = '', row = [];
function feed(s) {
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (st === 1) { if (ch === '"') st = 2; else field += ch; continue; }
    if (st === 2) { if (ch === '"') { field += '"'; st = 1; continue; } st = 0; }
    if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); field = ''; onRow(row); row = []; }
    else if (ch === '\r') continue;
    else if (ch === '"' && field === '') st = 1;
    else field += ch;
  }
}
for (let i = 0; ; i++) {
  r = await api('GET', `/export/${ex.id}/download`);
  if (r.status !== 202 || i > 20) break;
  await sleep(3000);
}
if (!r.ok) throw new Error(`Dışa aktarılan dosya indirilemedi (${r.status}).`);
const dec = new TextDecoder();
for await (const chunk of Readable.fromWeb(r.body).pipe(createGunzip())) feed(dec.decode(chunk, { stream: true }));
feed(dec.decode()); if (field || row.length) { row.push(field); onRow(row); }
console.log(`Dışa aktarma ${ex.id}: ${total} satır, son 3 günden ${fresh.length}.`);

const rows = state.rows.filter((x) => x[0] >= cut).concat(fresh).sort((a, b) => a[0] - b[0]).slice(-MAX_ROWS);
await write({ last: ex.last_hit_id || state.last, rows });
