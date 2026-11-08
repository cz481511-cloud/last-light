/* 程式合成音效（Web Audio API），不需要任何音檔 */
(function () {
  const A = { on: true };
  let ctx = null, master = null, noiseBuf = null;
  let amb = null, ambKind = 'none';
  let hbTimer = null, hbLevel = 0;

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain();
    master.gain.value = A.on ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };

  A.toggle = function () {
    A.on = !A.on;
    if (ctx) master.gain.setTargetAtTime(A.on ? 0.9 : 0, ctx.currentTime, 0.05);
    return A.on;
  };

  const ok = () => ctx && ctx.state !== 'closed';
  const now = () => ctx.currentTime;
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function panTo(node, p, dest) {
    if (ctx.createStereoPanner) { const s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s); s.connect(dest); }
    else node.connect(dest);
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function distCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); }
    return c;
  }

  /* ---------- 環境音 ---------- */
  A.ambience = function (kind) {
    if (!ok() || kind === ambKind) return;
    ambKind = kind;
    const t = now();
    if (amb) {
      const old = amb;
      old.out.gain.setTargetAtTime(0.0001, t, 0.8);
      setTimeout(() => old.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 4000);
      amb = null;
    }
    if (kind === 'none') return;
    const out = gainNode(0.0001); out.connect(master);
    const nodes = [];
    if (kind === 'dread') {
      const lp = filt('lowpass', 150, 0.8); lp.connect(out);
      [41, 41.7, 61.5].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const g = gainNode(i === 2 ? 0.25 : 0.5); o.connect(g); g.connect(lp); o.start(); nodes.push(o);
      });
      const n = noiseSrc(); const bp = filt('bandpass', 320, 0.6); const ng = gainNode(0.18);
      n.connect(bp); bp.connect(ng); ng.connect(out); n.start(); nodes.push(n);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = gainNode(0.12);
      lfo.connect(lg); lg.connect(ng.gain); lfo.start(); nodes.push(lfo);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.05; const lg2 = gainNode(60);
      lfo2.connect(lg2); lg2.connect(lp.frequency); lfo2.start(); nodes.push(lfo2);
      out.gain.setTargetAtTime(0.16, t, 1.5);
    } else if (kind === 'warm') {
      const lp = filt('lowpass', 900, 0.5); lp.connect(out);
      [196, 246.9, 293.7, 392].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i === 3 ? 'triangle' : 'sine'; o.frequency.value = f;
        o.detune.value = (Math.random() - .5) * 8;
        const g = gainNode(i === 3 ? 0.12 : 0.3); o.connect(g); g.connect(lp); o.start(); nodes.push(o);
      });
      const trem = ctx.createOscillator(); trem.frequency.value = 0.18; const tg = gainNode(0.05);
      trem.connect(tg); tg.connect(out.gain); trem.start(); nodes.push(trem);
      // 爐火般的細碎雜訊
      const n = noiseSrc(); const hp = filt('bandpass', 1200, 0.4); const ng = gainNode(0.03);
      n.connect(hp); hp.connect(ng); ng.connect(out); n.start(); nodes.push(n);
      out.gain.setTargetAtTime(0.13, t, 2);
    }
    amb = { out, nodes };
  };

  /* ---------- 心跳 ---------- */
  function thump(t, v) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    const g = ctx.createGain(); env(g, t, 0.012, v, 0.2);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
  }
  A.heartbeat = function (level) {
    level = Math.max(0, Math.min(4, level | 0));
    if (level === hbLevel) return;
    hbLevel = level;
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
    if (!ok() || level === 0) return;
    const ms = [0, 1150, 880, 640, 430][level];
    const beat = () => { if (!ok()) return; const t = now(); const v = 0.25 + level * 0.1; thump(t, v); thump(t + 0.17, v * 0.6); };
    beat(); hbTimer = setInterval(beat, ms);
  };

  /* ---------- 音效 ---------- */
  const S = {};
  S.knock = () => {
    const t0 = now();
    [0, 0.42, 0.84].forEach(dt => {
      const t = t0 + dt;
      const n = noiseSrc(); const lp = filt('lowpass', 700, 1); const g = ctx.createGain(); env(g, t, 0.003, 0.9, 0.09);
      n.connect(lp); lp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.2);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + .1);
      const g2 = ctx.createGain(); env(g2, t, 0.003, 0.6, 0.12); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + 0.2);
    });
  };
  S.static = () => {
    const t = now(), dur = 0.9;
    const n = noiseSrc(); const bp = filt('bandpass', 1900, 0.7); const g = ctx.createGain(); g.gain.value = 0;
    for (let i = 0; i < 18; i++) g.gain.setValueAtTime(Math.random() < .3 ? 0.02 : 0.2 + Math.random() * .15, t + i * dur / 18);
    g.gain.setValueAtTime(0, t + dur);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .05);
  };
  S.glitch = () => {
    const t = now();
    const n = noiseSrc(); const bp = filt('bandpass', 3000 + Math.random() * 2000, 2); const g = ctx.createGain(); env(g, t, 0.005, 0.35, 0.18);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + .3);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 80 + Math.random() * 300;
    const g2 = ctx.createGain(); env(g2, t, 0.005, 0.08, 0.15); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + .25);
  };
  S.whisper = () => {
    const t0 = now();
    const bursts = 9 + (Math.random() * 5 | 0);
    for (let i = 0; i < bursts; i++) {
      const t = t0 + i * 0.16 + Math.random() * 0.08;
      const n = noiseSrc(); const bp = filt('bandpass', 2200 + Math.random() * 2200, 5 + Math.random() * 5);
      const g = ctx.createGain(); env(g, t, 0.04, 0.18 + Math.random() * .12, 0.12 + Math.random() * .1);
      n.connect(bp); bp.connect(g); panTo(g, Math.sin(i * 1.7) * 0.8, master); n.start(t); n.stop(t + .4);
    }
  };
  S.sting = () => {
    const t = now();
    [1760, 1866, 2489].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, t, 0.01, 0.06 - i * .012, 2.4); o.connect(g); g.connect(master); o.start(t); o.stop(t + 2.6);
    });
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(52, t + 1.8);
    const lp = filt('lowpass', 400, 1); const g = ctx.createGain(); env(g, t, 0.02, 0.25, 1.8);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 2);
  };
  S.clue = () => {
    const t = now();
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(830, t + 1.2);
    const g = ctx.createGain(); env(g, t, 0.02, 0.07, 1.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.5);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 932;
    const g2 = ctx.createGain(); env(g2, t + .05, 0.02, 0.04, 1.2); o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 1.5);
  };
  S.glimpse = () => {
    const t = now();
    const n = noiseSrc(); const bp = filt('bandpass', 900, 1.5); const g = ctx.createGain(); env(g, t, 0.005, 0.35, 0.3);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + .4);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + .35);
    const g2 = ctx.createGain(); env(g2, t, 0.005, 0.15, 0.35); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + .45);
  };
  S.steps = () => {
    const t0 = now();
    for (let i = 0; i < 5; i++) {
      const t = t0 + i * 0.5;
      const n = noiseSrc(); const lp = filt('lowpass', 260 + Math.random() * 80, 1); const g = ctx.createGain(); env(g, t, 0.006, 0.7, 0.14);
      n.connect(lp); lp.connect(g); panTo(g, -0.2 + Math.random() * .4, master); n.start(t); n.stop(t + .25);
    }
  };
  S.groan = () => {
    const t = now(), d = 2.2;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + d * .6); o.frequency.linearRampToValueAtTime(82, t + d);
    const vib = ctx.createOscillator(); vib.frequency.value = 5; const vg = gainNode(4); vib.connect(vg); vg.connect(o.frequency);
    const bp = filt('bandpass', 450, 3); const bp2 = filt('bandpass', 900, 4);
    const g = ctx.createGain(); env(g, t, 0.4, 0.4, d - .4);
    o.connect(bp); o.connect(bp2); bp.connect(g); bp2.connect(g); panTo(g, (Math.random() - .5) * 1.2, master);
    o.start(t); vib.start(t); o.stop(t + d + .1); vib.stop(t + d + .1);
  };
  S.scream = () => {
    const t = now(), d = 1.5;
    const ws = ctx.createWaveShaper(); ws.curve = distCurve(60);
    const bp = filt('bandpass', 1300, 0.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75, t + 0.03);
    g.gain.setValueAtTime(0.75, t + d * .6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    ws.connect(bp); bp.connect(g); g.connect(master);
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f = 480 + Math.random() * 520;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.25); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + d);
      const v = ctx.createOscillator(); v.frequency.value = 7 + Math.random() * 6; const vg = gainNode(40 + Math.random() * 40);
      v.connect(vg); vg.connect(o.frequency);
      o.connect(ws); o.start(t); v.start(t); o.stop(t + d + .05); v.stop(t + d + .05);
    }
    const n = noiseSrc(); const hp = filt('highpass', 2000, .7); const ng = ctx.createGain(); env(ng, t, 0.01, 0.4, d);
    n.connect(hp); hp.connect(ng); ng.connect(master); n.start(t); n.stop(t + d + .1);
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.setValueAtTime(90, t); b.frequency.exponentialRampToValueAtTime(30, t + 1);
    const bg = ctx.createGain(); env(bg, t, 0.005, 0.9, 1.1); b.connect(bg); bg.connect(master); b.start(t); b.stop(t + 1.2);
  };
  S.boom = () => {
    const t = now();
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.setValueAtTime(60, t); b.frequency.exponentialRampToValueAtTime(24, t + 2.5);
    const g = ctx.createGain(); env(g, t, 0.01, 0.8, 3); b.connect(g); g.connect(master); b.start(t); b.stop(t + 3.2);
    const n = noiseSrc(); const lp = filt('lowpass', 200, .7); const ng = ctx.createGain(); env(ng, t, 0.01, 0.5, 2.2);
    n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 2.5);
  };
  S.join = () => {
    const t = now();
    [392, 494, 587, 784, 988].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, t + i * 0.14, 0.03, 0.1, 2.2); o.connect(g); g.connect(master); o.start(t + i * .14); o.stop(t + i * .14 + 2.5);
    });
  };
  S.warm = () => {
    const t = now();
    const n = noiseSrc(); const bp = filt('bandpass', 4000, 1); const g = ctx.createGain(); env(g, t, 0.002, 0.3, 0.05);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + .1);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 120;
    const g2 = ctx.createGain(); env(g2, t + .05, 0.4, 0.08, 1.6); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + 2.2);
  };
  S.click = () => {
    const t = now();
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1400;
    const g = ctx.createGain(); env(g, t, 0.001, 0.05, 0.03); o.connect(g); g.connect(master); o.start(t); o.stop(t + .06);
  };
  S.type = () => {
    const t = now();
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1700 + Math.random() * 500;
    const g = ctx.createGain(); env(g, t, 0.001, 0.012, 0.02); o.connect(g); g.connect(master); o.start(t); o.stop(t + .04);
  };
  S.drip = () => {
    const t = now();
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(600, t + .08);
    const g = ctx.createGain(); env(g, t, 0.002, 0.1, 0.12); o.connect(g); panTo(g, (Math.random() - .5), master); o.start(t); o.stop(t + .2);
  };
  S.cry = () => {
    const t0 = now();
    for (let k = 0; k < 3; k++) {
      const t = t0 + k * 0.9, d = 0.7;
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(760, t + .2); o.frequency.linearRampToValueAtTime(480, t + d);
      const v = ctx.createOscillator(); v.frequency.value = 9; const vg = gainNode(25); v.connect(vg); vg.connect(o.frequency);
      const bp = filt('bandpass', 1100, 2); const g = ctx.createGain(); env(g, t, 0.08, 0.09, d);
      o.connect(bp); bp.connect(g); panTo(g, 0.1, master); o.start(t); v.start(t); o.stop(t + d + .1); v.stop(t + d + .1);
    }
  };
  S.engine = () => {
    const t = now(), d = 3;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38;
    const lp = filt('lowpass', 180, 1); const g = ctx.createGain(); env(g, t, 0.3, 0.3, d);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + d + .4);
  };
  S.laugh = () => {
    const t0 = now();
    for (let i = 0; i < 7; i++) {
      const t = t0 + i * 0.19;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(260 - i * 12, t); o.frequency.exponentialRampToValueAtTime(190 - i * 10, t + .12);
      const bp = filt('bandpass', 800, 3); const g = ctx.createGain(); env(g, t, 0.01, 0.16, 0.13);
      o.connect(bp); bp.connect(g); panTo(g, Math.sin(i) * .6, master); o.start(t); o.stop(t + .2);
    }
  };

  A.sfx = function (name) {
    if (!ok() || !S[name]) return;
    try { S[name](); } catch (e) { /* 音效失敗不影響遊戲 */ }
  };

  window.A = A;
})();
