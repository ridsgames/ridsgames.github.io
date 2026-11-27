// --- Simgeler (24x24, çizgi) ---
const ICONS = {
  pause: ['f', '<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>'],
  play: ['f', '<path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l10.6-6.8a1 1 0 0 0 0-1.7L9.5 4.3A1 1 0 0 0 8 5.2z"/>'],
  back: ['', '<path d="M15 18l-6-6 6-6"/>'],
  sliders: ['', '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'],
  grid: ['', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'],
  lock: ['', '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'],
  tv: ['', '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M8.5 2.5L12 6l3.5-3.5"/><path d="M10.5 9.8v5.4l4.4-2.7z" fill="currentColor" stroke="none"/>'],
  bulb: ['', '<path d="M9.2 18h5.6M10.2 21h3.6"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'],
  refresh: ['', '<path d="M20 11.5a8 8 0 1 1-2.4-5.7"/><path d="M20 4v6h-6"/>'],
  skip: ['', '<path d="M5 5.5l9 6.5-9 6.5z"/><path d="M18 5v14"/>'],
  home: ['', '<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/>'],
  sound: ['', '<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'],
  mute: ['', '<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>'],
  music: ['', '<path d="M9 18V5.5l10.5-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/>'],
  vibrate: ['', '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 8v8M19.5 8v8"/>'],
  target: ['', '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'],
  shapes: ['', '<circle cx="7" cy="7.5" r="3.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.2"/><path d="M12 13.5l4.2 7H7.8z"/>'],
  level: ['', '<rect x="2.5" y="8" width="19" height="8" rx="4"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M8.6 8.4v7.2M15.4 8.4v7.2"/>'],
  check: ['', '<path d="M5 12.5l4.5 4.5L19 7"/>'],
  close: ['', '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'],
  globe: ['', '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.8 3.2 2.8 13.8 0 17M12 3.5c-2.8 3.2-2.8 13.8 0 17"/>'],
  shield: ['', '<path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/>'],
  doc: ['', '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 16h6"/>'],
  fire: ['', '<path d="M12 3c1 3.8 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.4 0 1.9 1 2.9 2 2.9 0-3-1-5 1-8.5z"/>'],
  phone: ['', '<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>'],
  star: ['c', '<path d="M12 2.4l2.95 6 6.6.95-4.78 4.66 1.13 6.57L12 17.47l-5.9 3.1 1.13-6.57L2.45 9.35l6.6-.95z" fill="#FFC83A" stroke="#1e2547" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 14.2l-1 5.9 5.6-2.9 5.6 2.9-.5-3.2" fill="#F29B12"/><path d="M12 5.4l1.9 3.9 3.6.5" fill="none" stroke="#FFF4B8" stroke-width="1.4" stroke-linecap="round"/><path d="M12 2.4l2.95 6 6.6.95-4.78 4.66 1.13 6.57L12 17.47l-5.9 3.1 1.13-6.57L2.45 9.35l6.6-.95z" fill="none" stroke="#1e2547" stroke-width="1.6" stroke-linejoin="round"/>'],
  tvb: ['c', '<defs><radialGradient id="tvbG" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#d9b6ff"/><stop offset=".55" stop-color="#8f55f2"/><stop offset="1" stop-color="#6a2fd6"/></radialGradient></defs><circle cx="12" cy="12.6" r="11" fill="#4f1fa8"/><circle cx="12" cy="11.6" r="10.6" fill="url(#tvbG)"/><ellipse cx="8.2" cy="6.4" rx="4.2" ry="2.1" fill="#fff" opacity=".35" transform="rotate(-28 8.2 6.4)"/><path d="M9.3 5.9l2.7 2.5 2.7-2.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="5.4" y="8.2" width="13.2" height="9.2" rx="2.3" fill="#fff"/><rect x="7" y="9.8" width="10" height="6" rx="1.3" fill="#2b2f4a"/><path d="M11 11.1v3.2l2.8-1.6z" fill="#fff"/>'],
  coin: ['c', '<circle cx="12" cy="12.6" r="9.3" fill="#D98A00" stroke="#1e2547" stroke-width="1.5"/><circle cx="12" cy="11.6" r="9" fill="#FFC93C" stroke="#1e2547" stroke-width="1.5"/><circle cx="12" cy="11.6" r="6" fill="#FFB31F" stroke="#D98A00" stroke-width="1.2"/><path d="M12 8l1.1 2.2 2.4.35-1.75 1.7.42 2.4L12 13.5l-2.17 1.15.42-2.4-1.75-1.7 2.4-.35z" fill="#FFE27A" stroke="#D98A00" stroke-width=".7" stroke-linejoin="round"/><path d="M6.4 8.4a6.6 6.6 0 0 1 3.6-3" stroke="#fff" stroke-opacity=".85" stroke-width="1.4" fill="none" stroke-linecap="round"/>'],
  gift: ['c', '<rect x="4" y="10.5" width="16" height="10.5" rx="1.6" fill="#FF5D5D" stroke="#1e2547" stroke-width="1.5"/><rect x="2.8" y="7.3" width="18.4" height="4.4" rx="1.4" fill="#FF8A7A" stroke="#1e2547" stroke-width="1.5"/><path d="M10.2 7.3h3.6V21h-3.6z" fill="#FFD23F" stroke="#1e2547" stroke-width="1.3"/><path d="M12 7.2C9.8 3.4 5.6 3.6 6.4 6c.5 1.4 3 1.3 5.6 1.2zM12 7.2c2.2-3.8 6.4-3.6 5.6-1.2-.5 1.4-3 1.3-5.6 1.2z" fill="#FFD23F" stroke="#1e2547" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.2 13.2v5" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>'],
  calendar: ['c', '<rect x="3.2" y="4.6" width="17.6" height="16.4" rx="2.6" fill="#FFFDF6" stroke="#1e2547" stroke-width="1.5"/><path d="M3.2 7.2a2.6 2.6 0 0 1 2.6-2.6h12.4a2.6 2.6 0 0 1 2.6 2.6v3H3.2z" fill="#FF5D5D" stroke="#1e2547" stroke-width="1.5"/><path d="M8 2.6v4M16 2.6v4" stroke="#1e2547" stroke-width="2" stroke-linecap="round"/><g fill="#1e2547"><circle cx="8" cy="13.6" r="1.1"/><circle cx="12" cy="13.6" r="1.1"/><circle cx="16" cy="13.6" r="1.1"/><circle cx="8" cy="17.4" r="1.1"/><circle cx="12" cy="17.4" r="1.1"/></g><circle cx="16" cy="17.4" r="1.9" fill="#46C23A" stroke="#1e2547" stroke-width="1"/>'],
  bag: ['c', '<path d="M8.4 9V7.2a3.6 3.6 0 0 1 7.2 0V9" fill="none" stroke="#1e2547" stroke-width="1.8" stroke-linecap="round"/><path d="M4.6 8.4h14.8l-1.2 12.6H5.8z" fill="#36A3F7" stroke="#1e2547" stroke-width="1.5" stroke-linejoin="round"/><path d="M4.6 8.4h14.8l-.25 2.6H4.85z" fill="#7CCBFF"/><path d="M4.6 8.4h14.8l-1.2 12.6H5.8z" fill="none" stroke="#1e2547" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="15.4" r="2.2" fill="#FFC93C" stroke="#1e2547" stroke-width="1.1"/>'],
  gear: ['c', '<g fill="#C9D3E0" stroke="#1e2547" stroke-width="1.4" stroke-linejoin="round"><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(0 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(45 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(90 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(135 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(180 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(225 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(270 12 12)"/><rect x="10.2" y="1.8" width="3.6" height="5" rx="1" transform="rotate(315 12 12)"/></g><circle cx="12" cy="12" r="7.2" fill="#C9D3E0" stroke="#1e2547" stroke-width="1.4"/><circle cx="12" cy="12" r="2.8" fill="#6C7A90" stroke="#1e2547" stroke-width="1.3"/><path d="M7.6 9.6a5 5 0 0 1 2.8-2.8" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  lockc: ['c', '<path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#1e2547" stroke-width="4.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#C9D3E0" stroke-width="2"/><rect x="4.6" y="10.4" width="14.8" height="11" rx="2.6" fill="#FFC93C" stroke="#1e2547" stroke-width="1.5"/><path d="M12 14.2v3" stroke="#1e2547" stroke-width="2.2" stroke-linecap="round"/><path d="M6.8 13v5" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>'],
  bulbc: ['c', '<path d="M12 2.6a6.6 6.6 0 0 0-4 11.9c.8.6 1.2 1.5 1.2 2.4h5.6c0-.9.4-1.8 1.2-2.4A6.6 6.6 0 0 0 12 2.6z" fill="#FFE066" stroke="#1e2547" stroke-width="1.5" stroke-linejoin="round"/><rect x="8.9" y="16.6" width="6.2" height="4.6" rx="1.4" fill="#C9D3E0" stroke="#1e2547" stroke-width="1.4"/><path d="M9 18.8h6" stroke="#1e2547" stroke-width="1"/><path d="M8.6 8.4a3.8 3.8 0 0 1 2.4-2.6" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'],
  tvc: ['c', '<path d="M8.6 2.6L12 6l3.4-3.4" fill="none" stroke="#1e2547" stroke-width="1.6" stroke-linecap="round"/><rect x="2.6" y="6" width="18.8" height="14" rx="3" fill="#B57BFF" stroke="#1e2547" stroke-width="1.5"/><rect x="5" y="8.4" width="14" height="9.2" rx="2" fill="#2B2F4A" stroke="#1e2547" stroke-width="1"/><path d="M10.4 10.3v5.4l4.5-2.7z" fill="#fff"/><path d="M6.4 10v3" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>'],
  firec: ['c', '<path d="M12 2.4c1.2 4 5.6 5.4 5.6 10.8a5.6 5.6 0 0 1-11.2 0c0-2.3 1.1-4 2.3-5 0 2.1 1.1 3.2 2.3 3.2 0-3.4-1.2-5.6 1-9z" fill="#FF7A1C" stroke="#1e2547" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 11.6c.8 2 2.8 2.6 2.8 5a2.8 2.8 0 0 1-5.6 0c0-1.4.8-2.4 1.6-3 .2 1 .6 1.4 1.2 1.4 0-1.4-.6-2.2 0-3.4z" fill="#FFD23F"/>'],
  trophy: ['c', '<path d="M7 4.2h10v4.6a5 5 0 0 1-10 0z" fill="#FFC93C" stroke="#1e2547" stroke-width="1.5"/><path d="M7 5.6H3.8a3.4 3.4 0 0 0 3.6 4.6M17 5.6h3.2a3.4 3.4 0 0 1-3.6 4.6" fill="none" stroke="#1e2547" stroke-width="1.6"/><path d="M10.4 13.4h3.2l.6 3.8H9.8z" fill="#E89B00" stroke="#1e2547" stroke-width="1.3"/><rect x="7.4" y="17.2" width="9.2" height="3.6" rx="1.2" fill="#8A5A2B" stroke="#1e2547" stroke-width="1.4"/><path d="M9.2 6v2.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>'],
  maze: ['c', '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="3.6" fill="#E8463A" stroke="#1e2547" stroke-width="1.5"/><rect x="5.2" y="5.2" width="13.6" height="13.6" rx="1.6" fill="#FFF7E8" stroke="#1e2547" stroke-width="1.1"/><path d="M8.6 5.4v6.2h3.6M15.4 18.6v-3.6H12M15.4 8.6v3" fill="none" stroke="#3F6FD8" stroke-width="1.5" stroke-linecap="round"/><circle cx="7.6" cy="15.8" r="1.7" fill="#B9C3D0" stroke="#1e2547" stroke-width=".9"/><path d="M4 7.6a3.6 3.6 0 0 1 3.4-3.2" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/>'],
  hand: ['', '<path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11M12 10.5V4.5a1.5 1.5 0 0 1 3 0v6M15 11V7a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5h-.8a6 6 0 0 1-4.9-2.6L3.6 14a1.6 1.6 0 0 1 2.6-1.8L9 15"/>'],
};
// Yalnızca resmi olan simgelerin kod çizimi yedeği
const ICON_ALIAS = { coins1: 'coin', coins2: 'coin', coins3: 'coin', chest: 'gift', gem: 'star', clock: 'target' };
// Simgenin yerine geçebilecek rozet resimleri
const ART_ALIAS = { lockc: 'b-lock', trophy: 'b-trophy' };
// Gemini'den gelen resimli simge varsa (img/ic-ad.webp) onu kullanır
// Renkli ikonların çizim sınırları: kutu tam çizime oturur, böylece yanındaki yazıyla grup gerçekten ortalı durur
const ICON_BOX = { coin: '1.9 1.8 20.2 20.9', tvc: '1.8 3.9 20.4 19', firec: '5.6 1.6 12.8 18' };
function icon(name, cls = '') {
  const src = ART['ic-' + name] || ART[ART_ALIAS[name]];
  if (src) return `<img class="ic art${cls ? ' ' + cls : ''}" src="${src}" alt="" draggable="false">`;
  const key = ICONS[name] ? name : ICON_ALIAS[name], [kind, body] = ICONS[key];
  return `<svg class="ic${kind === 'f' ? ' fill' : kind === 'c' ? ' color' : ''}${cls ? ' ' + cls : ''}" viewBox="${ICON_BOX[key] || '0 0 24 24'}" aria-hidden="true">${body}</svg>`;
}
// Yuvarlak rozet resmi (b-ad.webp) varsa onu, yoksa çizgi simgeyi verir
function badge(name, fallback) {
  return ART['b-' + name] ? `<img class="ic art badge" src="${ART['b-' + name]}" alt="" draggable="false">` : icon(fallback || name);
}
// Düğmenin kendisi rozet olur (plastik kaplama gizlenir)
function badgeButton(el, name, fallback) {
  el.innerHTML = badge(name, fallback);
  el.classList.toggle('art', !!ART['b-' + name]);
}
