// --- Ses ---
// Bütün sesler kodla üretilir: dosya yok, internet gerekmez
const Sfx = (() => {
  let ac = null, master, sfx, mus, roll = null, lastClick = 0, musicTimer = null, musicStep = 0, duck = 1;
  function ctx() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.connect(ac.destination);
      sfx = ac.createGain(); sfx.connect(master);
      mus = ac.createGain(); mus.gain.value = 0; mus.connect(master);
      // Müzik için yumuşak yankı
      const delay = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain();
      delay.delayTime.value = 0.36; fb.gain.value = 0.32; wet.gain.value = 0.35;
      mus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
      apply();
    } catch (e) { ac = null; }
    return ac;
  }
  function apply() {
    if (!ac) return;
    sfx.gain.value = save.settings.sfx ? 1 : 0;
    mus.gain.setTargetAtTime(save.settings.music ? 0.05 * duck : 0, ac.currentTime, 0.4);
  }
  function tone(f0, f1, dur, vol, type = 'sine', delay = 0, out) {
    const a = ac; if (!a || !save.settings.sfx && !out) return;
    const now = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + dur);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.006); g.gain.exponentialRampToValueAtTime(0.0005, now + dur);
    o.connect(g); g.connect(out || sfx); o.start(now); o.stop(now + dur + 0.03);
  }
  function noise(dur, vol, freq, q = 1, delay = 0) {
    const a = ac; if (!a || !save.settings.sfx) return;
    const now = a.currentTime + delay, n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(sfx); src.start(now);
  }
  // Yuvarlanma: döngüsel gürültü, bilyelerin hızıyla açılır
  function ensureRoll() {
    if (roll || !ac) return;
    const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; d[i] = last * 6; }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8; g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(sfx); src.start();
    roll = { f, g };
  }
  const NOTES = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99]; // Re majör pentatonik
  const CHORDS = [[146.83, 220, 293.66], [123.47, 185, 246.94], [98, 146.83, 196], [110, 164.81, 220]];
  function musicTick() {
    if (!ac) return;
    const beat = 60 / 84 / 2, now = ac.currentTime;
    if (musicStep % 16 === 0) { // her iki ölçüde bir yumuşak akor
      for (const f of CHORDS[(musicStep / 16) % 4]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.18, now + 1.2); g.gain.linearRampToValueAtTime(0.0001, now + beat * 16);
        o.connect(g); g.connect(mus); o.start(now); o.stop(now + beat * 16 + 0.1);
      }
    }
    if (Math.random() < [0.9, 0.35, 0.6, 0.3][musicStep % 4]) {
      const f = NOTES[Math.floor(Math.random() * NOTES.length)];
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5, now + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      o.connect(lp); lp.connect(g); g.connect(mus); o.start(now); o.stop(now + 1);
    }
    musicStep++;
    musicTimer = setTimeout(musicTick, beat * 1000);
  }
  return {
    unlock() { ctx(); ensureRoll(); if (!musicTimer && ac) musicTick(); },
    apply,
    duck(on) { duck = on ? 0 : 1; apply(); if (ac) { if (on) ac.suspend(); else ac.resume(); } },
    suspend() { if (ac) ac.suspend(); }, resume() { if (ac && duck) ac.resume(); },
    click(v) {
      if (!ac || ac.currentTime - lastClick < 0.03) return;
      lastClick = ac.currentTime;
      const f = 2100 + Math.random() * 900;
      tone(f, f * 0.8, 0.035, Math.min(0.14, 0.02 + v / 3000), 'triangle');
      noise(0.025, Math.min(0.12, v / 4000), 3500, 2);
    },
    seat() { tone(950, 620, 0.07, 0.13, 'triangle'); noise(0.04, 0.06, 1200, 3); },
    fall() { tone(520, 90, 0.35, 0.16, 'sine'); noise(0.2, 0.1, 300, 1, 0.22); },
    star(i) { tone(660 * Math.pow(1.26, i), 1320 * Math.pow(1.26, i), 0.18, 0.12, 'triangle'); },
    coin() { tone(1568, 1568, 0.08, 0.08, 'square'); tone(2093, 2093, 0.16, 0.07, 'square', 0.07); },
    win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f, 0.24, 0.12, 'triangle', i * 0.09)); },
    tap() { tone(820, 760, 0.05, 0.05, 'sine'); },
    pop() { tone(420, 900, 0.12, 0.08, 'sine'); },
    rolling(speed) { // toplam hıza göre yuvarlanma sesi
      if (!roll) return;
      const v = Math.min(1, speed / 900), t = ac.currentTime;
      roll.g.gain.setTargetAtTime(save.settings.sfx ? v * 0.22 : 0, t, 0.05);
      roll.f.frequency.setTargetAtTime(250 + v * 900, t, 0.08);
    }
  };
})();
function buzz(kind) { // titreşim: tick (yuvaya oturma), fall (deliğe düşme), win, light
  if (!save.settings.haptics) return;
  try {
    const H = NATIVE.Haptics;
    if (H) {
      if (kind === 'tick' || kind === 'light') H.impact({ style: 'LIGHT' });
      else if (kind === 'fall') H.impact({ style: 'HEAVY' });
      else H.notification({ type: 'SUCCESS' });
    } else if (navigator.vibrate) navigator.vibrate(kind === 'tick' || kind === 'light' ? 8 : kind === 'fall' ? 40 : [20, 60, 20]);
  } catch (e) {}
}
