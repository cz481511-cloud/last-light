/* 第一人稱 Canvas 繪製：場景、手電筒、怪物、驚嚇畫面 */
(function () {
  const R = { onClue: null, onGlimpse: null };
  let cv, ctx, dk, dc, sc, scx;
  let W = 1, H = 1, S = 1, DPR = 1;
  let view = 'title', scene = null, opts = {}, amb = 0.95;
  let radiusMul = 1, sceneStart = 0, t = 0, lastNow = 0;
  let flickUntil = 0, scaring = false;
  let clueT = [], found = [], figState = [];
  const ptr = { x: 0.5, y: 0.55, active: false, last: 0 };
  const L = { x: 0.5, y: 0.55 };
  const dust = [];
  for (let i = 0; i < 46; i++) dust.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + .4, v: Math.random() * .008 + .002, p: Math.random() * 6 });

  const AMB = { title: .95, basement: .965, door: .975, shelf: .965, mirror: .965, vent: .975, fusebox: .965,
    street: .74, market: .975, counter: .965, car: .955, alley: .975, shelter: .5, black: 1 };

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let q = Math.imul(seed ^ seed >>> 15, 1 | seed);
      q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
      return ((q ^ q >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- 初始化 ---------- */
  R.init = function (canvas, scareCanvas) {
    cv = canvas; ctx = cv.getContext('2d');
    dk = document.createElement('canvas'); dc = dk.getContext('2d');
    sc = scareCanvas; scx = sc.getContext('2d');
    resize(); addEventListener('resize', resize);
    const mv = (x, y) => { ptr.x = x / W; ptr.y = y / H; ptr.active = true; ptr.last = performance.now(); };
    addEventListener('mousemove', e => mv(e.clientX, e.clientY));
    addEventListener('touchstart', e => { const p = e.touches[0]; if (p) mv(p.clientX, p.clientY); }, { passive: true });
    addEventListener('touchmove', e => { const p = e.touches[0]; if (p) mv(p.clientX, p.clientY); }, { passive: true });
    requestAnimationFrame(loop);
  };
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; S = Math.min(W, H);
    cv.width = dk.width = sc.width = Math.round(W * DPR);
    cv.height = dk.height = sc.height = Math.round(H * DPR);
  }

  R.setScene = function (s, o) {
    scene = s; view = s.view; opts = o || {};
    amb = s.ambient != null ? s.ambient : (AMB[view] != null ? AMB[view] : .96);
    radiusMul = opts.radiusMul || 1;
    sceneStart = t;
    clueT = (s.clues || []).map(() => 0);
    found = (s.clues || []).map(() => false);
    figState = (s.figures || []).map(() => ({ lit: 0, reveal: 0, cool: 1.5 }));
  };
  R.setView = function (v, o) {
    scene = null; view = v; opts = o || {};
    amb = opts.ambient != null ? opts.ambient : (AMB[v] != null ? AMB[v] : .96);
    radiusMul = opts.radiusMul || 1;
    sceneStart = t; clueT = []; found = [];
    figState = (opts.figures || []).map(() => ({ lit: 0, reveal: 0, cool: 99 }));
  };
  R.flicker = function (ms) { flickUntil = performance.now() + (ms || 200); };

  /* ---------- 繪圖小工具（座標為相對值 0~1） ---------- */
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x * W, y * H, w * W, h * H); }
  function lg(x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0 * W, y0 * H, x1 * W, y1 * H);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g;
  }
  function poly(pts, c) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0] * W, p[1] * H) : ctx.moveTo(p[0] * W, p[1] * H));
    ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  }
  function line(x0, y0, x1, y1, c, w) {
    ctx.strokeStyle = c; ctx.lineWidth = w || 1; ctx.beginPath();
    ctx.moveTo(x0 * W, y0 * H); ctx.lineTo(x1 * W, y1 * H); ctx.stroke();
  }
  function circ(x, y, r, c) { ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function ell(x, y, rx, ry, c, rot) { ctx.beginPath(); ctx.ellipse(x * W, y * H, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function glow(x, y, r, c, a) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
    g.addColorStop(0, c.replace('A', a)); g.addColorStop(1, c.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x * W - r, y * H - r, r * 2, r * 2);
  }
  function stains(seed, n, y0, y1, col) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = col || `rgba(18,12,8,${.15 + r() * .3})`;
      ctx.beginPath();
      ctx.ellipse(r() * W, (y0 + r() * (y1 - y0)) * H, 8 + r() * S * .09, 4 + r() * S * .06, r() * 3, 0, 7);
      ctx.fill();
    }
  }
  function drips(seed, n, y0, col) {
    const r = rng(seed);
    ctx.strokeStyle = col || 'rgba(30,18,12,.5)';
    for (let i = 0; i < n; i++) {
      const x = r() * W, len = (r() * .25 + .05) * H; ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath(); ctx.moveTo(x, y0 * H); ctx.lineTo(x + (r() - .5) * 6, y0 * H + len); ctx.stroke();
    }
  }
  function textAt(str, x, y, size, col, rot, font) {
    ctx.save(); ctx.translate(x * W, y * H); ctx.rotate(rot || 0);
    ctx.font = `${font || '700'} ${size}px 'Noto Serif TC', serif`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, 0); ctx.restore();
  }

  /* ---------- 走廊型透視 ---------- */
  function corridor(o) {
    const { x0, x1, y0, y1 } = o;
    poly([[0, 1], [1, 1], [x1, y1], [x0, y1]], o.floor);
    poly([[0, 0], [1, 0], [x1, y0], [x0, y0]], o.ceil);
    poly([[0, 0], [x0, y0], [x0, y1], [0, 1]], o.wallL);
    poly([[1, 0], [x1, y0], [x1, y1], [1, 1]], o.wallR);
    rect(x0, y0, x1 - x0, y1 - y0, o.back);
  }

  /* ---------- 場景 ---------- */
  const V = {};
  V.black = () => {};

  V.title = (c, tt) => {
    corridor({ x0: .45, x1: .55, y0: .4, y1: .52, floor: lg(0, .52, 0, 1, ['#1e1c1a', '#3a3632']), ceil: lg(0, 0, 0, .4, ['#2a2826', '#141312']),
      wallL: lg(0, 0, .45, 0, ['#3d3a35', '#1c1a18']), wallR: lg(1, 0, .55, 0, ['#3d3a35', '#1c1a18']), back: '#0d0c0b' });
    for (let i = 0; i < 4; i++) {
      const f = [0, .45, .7, .85][i], f2 = f + .08;
      const lx = f * .45, lx2 = f2 * .45;
      poly([[lx, f * .4 + .08 * (1 - f)], [lx2, f2 * .4 + .08 * (1 - f2)], [lx2, 1 - f2 * .48 - .02], [lx, 1 - f * .48 - .02]], '#2a221c');
      poly([[1 - lx, f * .4 + .08 * (1 - f)], [1 - lx2, f2 * .4 + .08 * (1 - f2)], [1 - lx2, 1 - f2 * .48 - .02], [1 - lx, 1 - f * .48 - .02]], '#2a221c');
    }
    ctx.fillStyle = 'rgba(70,10,8,.55)';
    ctx.beginPath(); ctx.moveTo(.48 * W, .52 * H); ctx.quadraticCurveTo(.4 * W, .75 * H, .46 * W, H); ctx.lineTo(.56 * W, H); ctx.quadraticCurveTo(.5 * W, .72 * H, .5 * W, .52 * H); ctx.fill();
  };
  V.title.post = (c, tt) => {
    if (Math.sin(tt * 2.3) + Math.sin(tt * 5.1) > 1.2) glow(.5, .41, S * .12, 'rgba(200,210,160,A)', .25);
  };

  V.basement = (c, tt) => {
    rect(0, 0, 1, .7, lg(0, 0, 0, .7, ['#48423b', '#36312c']));
    rect(0, .7, 1, .3, lg(0, .7, 0, 1, ['#332e29', '#181614']));
    stains(3, 16, .05, .66); drips(5, 22, .12);
    rect(0, .05, 1, .022, '#5a544c'); rect(0, .095, 1, .012, '#4c4640');
    for (let i = 0; i < 8; i++) {
      const f = i / 8, y = .7 - f * .32, h = .32 / 8, xl = .36 + f * .08, xr = .64 - f * .08;
      rect(xl, y - h, xr - xl, h, i % 2 ? '#514a43' : '#443e38'); line(xl, y - h, xr, y - h, '#625a52', 1);
    }
    line(.35, .7, .44, .38, '#6a625a', 3); line(.35, .7, .35, .6, '#6a625a', 3);
    rect(.45, .12, .12, .26, '#3a2f27'); ctx.strokeStyle = '#1e1813'; ctx.lineWidth = 3; ctx.strokeRect(.45 * W, .12 * H, .12 * W, .26 * H);
    circ(.545, .26, S * .007, '#a08f6c');
    rect(.04, .28, .2, .42, '#2e2a26');
    for (let k = 0; k < 4; k++) {
      rect(.04, .3 + k * .1, .2, .012, '#5c554d');
      const r = rng(20 + k);
      for (let j = 0; j < 5; j++) rect(.05 + r() * .17, .3 + k * .1 - .04, .018, .04, `rgb(${70 + r() * 40 | 0},${60 + r() * 30 | 0},${50 + r() * 20 | 0})`);
    }
    rect(.66, .6, .28, .02, '#5c4c3b'); rect(.68, .62, .012, .1, '#4a3d30'); rect(.915, .62, .012, .1, '#4a3d30');
    rect(.72, .53, .09, .07, '#403c36'); circ(.75, .565, S * .013, '#2a2826');
    for (let k = 0; k < 4; k++) line(.77, .545 + k * .012, .8, .545 + k * .012, '#2c2a27', 1);
    poly([[.05, .82], [.3, .8], [.34, .9], [.02, .93]], '#4c443a');
    poly([[.07, .82], [.14, .815], [.15, .85], [.07, .86]], '#5e564c');
    line(.25, 0, .25, .1, '#1d1b19', 2); circ(.25, .11, S * .013, (scene && scene.lit) || opts.lit ? '#fff4c8' : '#6a6660');
    if (opts.cans) { const r = rng(9); for (let i = 0; i < Math.min(12, opts.cans); i++) rect(.06 + (i % 6) * .025, .66 - (i / 6 | 0) * .04 - .03, .018, .03, `rgb(${110 + r() * 30 | 0},${80 + r() * 20 | 0},50)`); }
  };
  V.basement.post = (c, tt) => {
    if ((scene && scene.lit) || opts.lit) {
      const f = .9 + Math.sin(tt * 13) * .03 + (Math.random() < .02 ? -.4 : 0);
      glow(.25, .11, S * .55, 'rgba(255,200,120,A)', .22 * f);
      glow(.25, .11, S * .06, 'rgba(255,240,200,A)', .8 * f);
    }
    const blink = Math.sin(tt * 3) > .6;
    if (blink) glow(.795, .545, S * .012, 'rgba(255,40,20,A)', .9);
  };

  V.door = (c, tt) => {
    rect(0, 0, 1, 1, lg(0, 0, 0, 1, ['#2e2b27', '#3a3630', '#1c1a18']));
    stains(11, 10, 0, .9);
    rect(.27, .03, .46, .89, '#241d18');
    rect(.3, .05, .4, .85, lg(.3, 0, .7, 0, ['#40342a', '#4a3c30', '#3b3027']));
    for (let i = 1; i < 5; i++) line(.3 + i * .08, .05, .3 + i * .08, .9, 'rgba(20,14,10,.6)', 2);
    ctx.strokeStyle = 'rgba(15,10,8,.7)'; ctx.lineWidth = 2;
    const r = rng(7);
    for (let i = 0; i < 9; i++) { const x = .34 + r() * .3, y = .62 + r() * .24; ctx.beginPath(); ctx.moveTo(x * W, y * H); ctx.lineTo((x + .01 + r() * .03) * W, (y + .05 + r() * .05) * H); ctx.stroke(); }
    ell(.41, .55, S * .03, S * .045, 'rgba(70,12,8,.55)', .2);
    for (let i = 0; i < 4; i++) line(.4 + i * .008, .57, .395 + i * .01, .66 + i * .01, 'rgba(70,12,8,.45)', 2);
    circ(.5, .36, S * .012, '#141210'); circ(.5, .36, S * .006, '#050505');
    rect(.6, .5, .06, .045, '#6a604e'); circ(.64, .525, S * .01, '#a69676');
    rect(.48, .2, .04, .012, '#5a5040'); rect(.48, .23, .04, .012, '#5a5040');
    rect(0, .92, 1, .08, '#151312');
  };
  V.door.post = (c, tt) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120,130,110,.55)'; ctx.fillRect(.3 * W, .9 * H, .4 * W, .012 * H);
    const g = ctx.createLinearGradient(0, .9 * H, 0, .97 * H); g.addColorStop(0, 'rgba(90,100,85,.25)'); g.addColorStop(1, 'rgba(90,100,85,0)');
    ctx.fillStyle = g; ctx.fillRect(.25 * W, .9 * H, .5 * W, .07 * H);
    ctx.restore();
    ctx.fillStyle = '#000';
    for (let i = 0; i < 7; i++) {
      const x = .35 + i * .045 + Math.sin(tt * .8 + i * 1.3) * .008;
      ctx.fillRect(x * W, .9 * H, .014 * W, .012 * H);
      ctx.beginPath(); ctx.moveTo(x * W, .912 * H); ctx.lineTo((x - .02) * W, .97 * H); ctx.lineTo((x + .034) * W, .97 * H); ctx.lineTo((x + .014) * W, .912 * H); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill(); ctx.fillStyle = '#000';
    }
  };

  V.shelf = (c, tt) => {
    rect(0, 0, 1, .78, lg(0, 0, 0, .78, ['#3e3a35', '#2e2a26']));
    rect(0, .78, 1, .22, lg(0, .78, 0, 1, ['#2a2622', '#121110']));
    stains(13, 12, 0, .75); drips(14, 14, 0);
    ctx.strokeStyle = '#6a6862'; ctx.lineWidth = 4;
    [.15, .85].forEach(x => line(x, .22, x, .8, '#6a6862', 5));
    [.3, .66, .78].forEach(y => rect(.15, y, .7, .015, '#5c5a55'));
    rect(.2, .52, .2, .14, '#6e5c44'); rect(.2, .52, .2, .02, '#7c6a50');
    rect(.285, .555, .03, .07, '#7a1510'); rect(.265, .575, .07, .03, '#7a1510');
    for (let i = 0; i < 4; i++) line(.22 + i * .02, .53, .25 + i * .025, .6, 'rgba(20,12,8,.8)', 2);
    rect(.58, .48, .22, .18, '#6a5a44');
    for (let i = 0; i < 6; i++) line(.58, .5 + i * .028, .8, .51 + i * .028, 'rgba(170,155,110,.75)', 4);
    line(.69, .48, .69, .66, 'rgba(170,155,110,.75)', 6);
    rect(.2, .2, .12, .1, '#4a443c'); rect(.6, .22, .08, .08, '#3e3a34');
  };

  V.mirror = (c, tt) => {
    rect(0, 0, 1, 1, '#4a4e4c');
    ctx.strokeStyle = 'rgba(25,28,27,.6)'; ctx.lineWidth = 1.5;
    for (let y = 0; y < 1; y += .06) line(0, y, 1, y, 'rgba(25,28,27,.55)', 1.5);
    for (let x = 0; x < 1; x += .05) for (let y = 0; y < 1; y += .12) { line(x + (y * 10 % 2 ? .025 : 0), y, x + (y * 10 % 2 ? .025 : 0), y + .06, 'rgba(25,28,27,.4)', 1); }
    stains(21, 18, 0, 1, 'rgba(40,30,15,.3)');
    rect(.3, .13, .4, .5, '#3a3430');
    rect(.315, .145, .37, .47, lg(.3, .1, .7, .6, ['#2a3032', '#1a1e20', '#242a2c']));
    ctx.save(); ctx.beginPath(); ctx.rect(.315 * W, .145 * H, .37 * W, .47 * H); ctx.clip();
    const lag = Math.sin(tt * .5) * .004;
    drawFigure({ x: .5 + lag, y: .95, h: .6, cloth: '#2c3032', skin: '#5c6262', reflect: true }, { reveal: 0 }, tt);
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,210,210,.35)'; ctx.lineWidth = 1.2;
    const cx = .42, cy = .27;
    [[.35, .17], [.32, .4], [.5, .2], [.47, .45], [.4, .6], [.3, .3]].forEach(p => line(cx, cy, p[0], p[1], 'rgba(200,210,210,.3)', 1.2));
    rect(.34, .66, .32, .06, '#8a8680'); ell(.5, .69, S * .1, S * .015, '#5a5650');
    rect(.48, .72, .04, .2, '#6a665e');
    ell(.46, .695, S * .02, S * .006, 'rgba(90,15,10,.6)');
  };

  V.vent = (c, tt) => {
    rect(0, 0, 1, 1, lg(0, 0, 0, 1, ['#3a3733', '#2c2926', '#1a1816']));
    stains(31, 14, 0, .95); drips(32, 18, .47, 'rgba(25,15,10,.45)');
    rect(.42, .32, .16, .16, '#5c5852');
    rect(.435, .335, .13, .13, '#050505');
    for (let i = 0; i < 6; i++) rect(.435, .345 + i * .02, .13, .007, '#6e6a62');
    for (let i = 0; i < 4; i++) circ(.425 + (i % 2) * .15, .325 + (i >> 1) * .15, S * .004, '#8a857c');
    rect(.68, .84, .08, .03, '#7a7466'); ell(.72, .84, S * .025, S * .01, '#8a8474');
    ctx.save(); ctx.translate(.2 * W, .6 * H); ctx.rotate(-.1);
    ctx.fillStyle = '#c8c0a8'; ctx.fillRect(0, 0, S * .14, S * .1);
    ctx.strokeStyle = '#7a1010'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(S * .04, S * .05, S * .015, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * .04, S * .065); ctx.lineTo(S * .04, S * .09); ctx.stroke();
    ctx.beginPath(); ctx.arc(S * .1, S * .045, S * .02, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * .085, S * .06); ctx.lineTo(S * .08, S * .095); ctx.moveTo(S * .115, S * .06); ctx.lineTo(S * .12, S * .095); ctx.stroke();
    ctx.restore();
  };
  V.vent.post = (c, tt) => {
    const ph = (tt % 7);
    if (ph > 5.6 && ph < 6.1) { glow(.48, .4, S * .008, 'rgba(230,230,200,A)', .9); glow(.52, .4, S * .008, 'rgba(230,230,200,A)', .9); }
  };

  V.fusebox = (c, tt) => {
    rect(0, 0, 1, .76, lg(0, 0, 0, .76, ['#3c3b36', '#2c2b27']));
    rect(0, .76, 1, .24, lg(0, .76, 0, 1, ['#2a2824', '#121110']));
    stains(41, 12, 0, .74);
    rect(.37, .27, .26, .32, '#3e443e'); rect(.385, .29, .23, .28, '#2a2e2a');
    for (let r_ = 0; r_ < 3; r_++) for (let k = 0; k < 5; k++) { rect(.4 + k * .04, .31 + r_ * .07, .025, .045, '#1a1c1a'); rect(.405 + k * .04, .315 + r_ * .07 + (k + r_) % 2 * .02, .015, .015, '#8a8a80'); }
    rect(.62, .34, .03, .1, '#5a5a52'); rect(.6, .32, .07, .025, '#9a2a1a');
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(.45 * W, .59 * H); ctx.quadraticCurveTo(.44 * W, .72 * H, .49 * W, .79 * H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(.55 * W, .59 * H); ctx.quadraticCurveTo(.57 * W, .72 * H, .52 * W, .8 * H); ctx.stroke();
    ell(.5, .83, S * .14, S * .03, '#1e262a'); ell(.47, .825, S * .05, S * .008, 'rgba(160,180,190,.25)');
    rect(.72, .55, .2, .22, '#4a4a40'); rect(.74, .58, .16, .04, '#2a2a24'); circ(.88, .7, S * .02, '#2e2e28');
    textAt('危險 高壓', .5, .25, Math.max(11, S * .022), '#b0a040', 0);
  };
  V.fusebox.post = (c, tt) => {
    if (Math.random() < .06) { const x = .5 + (Math.random() - .5) * .02, y = .79 + (Math.random() - .5) * .01; glow(x, y, S * .02, 'rgba(180,220,255,A)', .9); }
  };

  V.street = (c, tt) => {
    rect(0, 0, 1, .5, lg(0, 0, 0, .5, ['#3c3f42', '#5a5c5c']));
    const r = rng(51);
    for (let i = 0; i < 14; i++) {
      const bw = .05 + r() * .1, bh = .12 + r() * .3, bx = i / 14 - .02 + r() * .02;
      rect(bx, .5 - bh, bw, bh, `rgb(${34 + r() * 14 | 0},${36 + r() * 12 | 0},${38 + r() * 12 | 0})`);
      for (let k = 0; k < 6; k++) if (r() < .5) rect(bx + .01 + r() * (bw - .02), .5 - bh + .02 + r() * (bh - .05), .008, .014, r() < .6 ? '#0c0c0c' : '#1a1a18');
    }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(30,30,32,.35)'; ctx.beginPath(); ctx.ellipse((.2 + i * .3) * W, (.2 - i * .03) * H, S * .15, S * .05, 0, 0, 7); ctx.fill(); }
    poly([[-.2, 1], [1.2, 1], [.56, .5], [.44, .5]], '#3c3c3a');
    poly([[0, 1], [.08, 1], [.47, .5], [.45, .5]], '#4a4a46'); poly([[1, 1], [.92, 1], [.53, .5], [.55, .5]], '#4a4a46');
    for (let i = 0; i < 6; i++) { const f = i / 6, f2 = f + .07; const y = .5 + f * f * .5, y2 = .5 + f2 * f2 * .5; poly([[.499 - f * .01, y], [.501 + f * .01, y], [.501 + f2 * .01, y2], [.499 - f2 * .01, y2]], '#7a7a6a'); }
    ctx.save(); ctx.translate(.16 * W, .66 * H); ctx.rotate(-.12);
    ctx.fillStyle = '#5a5a4a'; ctx.fillRect(-S * .22, -S * .08, S * .4, S * .14);
    ctx.fillStyle = '#2a2a26'; for (let k = 0; k < 5; k++) ctx.fillRect(-S * .2 + k * S * .075, -S * .06, S * .05, S * .04);
    ctx.fillStyle = '#1a1a18'; ctx.beginPath(); ctx.arc(-S * .14, S * .06, S * .03, 0, 7); ctx.arc(S * .1, S * .06, S * .03, 0, 7); ctx.fill();
    ctx.restore();
    poly([[.16, .74], [.4, .66], [.42, .69], [.2, .8]], 'rgba(10,10,10,.45)');
    rect(.82, .34, .006, .3, '#2a2a28'); poly([[.823, .64], [.826, .64], [.6, .52], [.598, .52]], 'rgba(0,0,0,.35)');
    ctx.save(); ctx.translate(.74 * W, .7 * H);
    ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, S * .02, 0, 7); ctx.arc(S * .05, 0, S * .02, 0, 7); ctx.stroke();
    ctx.fillStyle = '#221c16'; ctx.fillRect(-S * .01, -S * .05, S * .07, S * .035); ctx.restore();
    for (let i = 0; i < 11; i++) { const x = .25 + r() * .55, y = .6 + r() * .38; ell(x, y, S * .012 * (y), S * .006 * y, ['#5a2a20', '#3a3a50', '#6a6a60', '#2a2a2a'][i % 4], r() * 3); }
    ell(.45, .9, S * .09, S * .025, 'rgba(70,14,10,.5)');
  };

  V.market = (c, tt) => {
    corridor({ x0: .44, x1: .56, y0: .38, y1: .54, floor: lg(0, .54, 0, 1, ['#2e2e2a', '#4e4e48']), ceil: lg(0, 0, 0, .38, ['#262624', '#1a1a18']),
      wallL: '#303330', wallR: '#303330', back: '#0c0c0c' });
    for (let i = 0; i < 9; i++) { const f = i / 9; const y = .54 + f * f * .46; line(.44 - f * .44, y, .56 + f * .44, y, 'rgba(20,20,18,.5)', 1); }
    const r = rng(61);
    for (const side of [0, 1]) {
      for (let k = 0; k < 5; k++) {
        const f0 = k / 5 * .44, yTop0 = .38 * (f0 / .44) + 0 * (1 - f0 / .44);
        for (let s = 0; s < 4; s++) {
          const fy = .12 + s * .2;
          const xa = side ? 1 - f0 : f0, xb = side ? 1 - (f0 + .088) : f0 + .088;
          const ya = fy * (1 - f0 / .44 * .45) + f0 / .44 * .38 * (1 - fy) * .2 + f0 / .44 * .36 * fy;
          const yb = fy * (1 - (f0 + .088) / .44 * .45) + (f0 + .088) / .44 * .38 * (1 - fy) * .2 + (f0 + .088) / .44 * .36 * fy;
          line(xa, ya + .1, xb, yb + .1, '#555550', 3);
          for (let p = 0; p < 3; p++) {
            if (r() < .35) continue;
            const pf = (p + .5) / 3, px = xa + (xb - xa) * pf, py = ya + .1 + (yb - ya) * pf, ph = (.06 - f0 * .08) * (1 - pf * .2);
            rect(px - .008, py - ph, .016 * (1 - f0), ph, `rgb(${50 + r() * 60 | 0},${45 + r() * 50 | 0},${40 + r() * 40 | 0})`);
          }
        }
      }
    }
    for (let i = 0; i < 3; i++) { const y = .06 + i * .1, w = .12 - i * .03; rect(.5 - w / 2, y, w, .012, '#5a5a54'); }
    line(.47, .06, .44, .14, '#3a3a36', 2);
    if (scene && scene.freezer) { rect(.06, .6, .3, .26, '#596266'); rect(.075, .62, .27, .14, lg(0, .62, 0, .76, ['#30383c', '#1e2426'])); rect(.06, .78, .3, .02, '#7a8488'); }
    if (scene && scene.tallShelf) { rect(.68, .1, .26, .76, '#2c2e2c'); for (let s = 0; s < 5; s++) rect(.68, .14 + s * .16, .26, .015, '#5a5a54'); }
  };

  V.counter = (c, tt) => {
    rect(0, 0, 1, .7, lg(0, 0, 0, .7, ['#3a3c38', '#2e302c']));
    rect(0, .7, 1, .3, lg(0, .7, 0, 1, ['#3a3a36', '#1a1a18']));
    stains(71, 12, 0, .68);
    rect(.08, .1, .14, .18, '#5a4a3a'); textAt('特價', .15, .16, Math.max(12, S * .03), '#8a2a1a', -.05);
    rect(.78, .12, .12, .16, '#3a4a5a'); textAt('營業中', .84, .2, Math.max(10, S * .022), '#c0c0a0', .03);
    poly([[0, .62], [.52, .58], [.56, .82], [0, .9]], '#4a4640'); poly([[0, .58], [.52, .55], [.52, .58], [0, .62]], '#6a645a');
    rect(.06, .46, .12, .1, '#2a2a28'); rect(.08, .47, .08, .04, '#3a5a3a');
    rect(.25, .5, .15, .06, '#7a6a4a');
    for (let i = 0; i < 6; i++) { rect(.26 + i * .023, .47, .018, .035, '#9a8a6a'); rect(.26 + i * .023, .47, .018, .006, '#b0a080'); }
    ell(.66, .84, S * .1, S * .02, 'rgba(0,0,0,.4)');
  };

  V.car = (c, tt) => {
    rect(0, 0, 1, .48, lg(0, 0, 0, .48, ['#0a0b0e', '#1c1e22']));
    const r = rng(81);
    for (let i = 0; i < 10; i++) { const bw = .08 + r() * .1, bh = .1 + r() * .25; rect(i / 10, .48 - bh, bw, bh, '#15161a'); }
    poly([[-.2, 1], [1.2, 1], [.56, .48], [.44, .48]], '#26262a');
    poly([[.3, .52], [.7, .52], [.74, .7], [.26, .7]], '#3a3e44');
    poly([[.36, .43], [.64, .43], [.68, .53], [.32, .53]], '#2e3236');
    poly([[.375, .445], [.625, .445], [.655, .52], [.345, .52]], '#0e1214');
    rect(.26, .66, .48, .05, '#2a2c30');
    rect(.42, .6, .16, .04, '#1a1c1e'); for (let i = 0; i < 6; i++) line(.425 + i * .026, .6, .425 + i * .026, .64, '#30343a', 1);
    ell(.31, .72, S * .035, S * .02, '#0a0a0a'); ell(.69, .72, S * .035, S * .02, '#0a0a0a');
    ctx.fillStyle = 'rgba(80,10,8,.6)'; ctx.fillRect(.5 * W, .55 * H, .12 * W, .01 * H);
  };
  V.car.post = (c, tt) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const f = Math.random() < .04 ? .3 : 1;
    [[.33, .6], [.67, .6]].forEach(p => {
      glow(p[0], p[1], S * .32, 'rgba(255,240,200,A)', .35 * f);
      glow(p[0], p[1], S * .05, 'rgba(255,255,240,A)', .95 * f);
    });
    const g = ctx.createLinearGradient(0, .6 * H, 0, H); g.addColorStop(0, `rgba(255,240,200,${.18 * f})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(.3 * W, .62 * H); ctx.lineTo(.7 * W, .62 * H); ctx.lineTo(1.1 * W, H); ctx.lineTo(-.1 * W, H); ctx.fill();
    ctx.restore();
  };

  V.alley = (c, tt) => {
    corridor({ x0: .47, x1: .53, y0: .32, y1: .56, floor: lg(0, .56, 0, 1, ['#1a1a18', '#34322e']), ceil: lg(0, 0, 0, .32, ['#08090b', '#111214']),
      wallL: lg(0, 0, .47, 0, ['#3e342c', '#1a1612']), wallR: lg(1, 0, .53, 0, ['#3e342c', '#1a1612']), back: '#120e0a' });
    for (let i = 0; i < 14; i++) {
      const f = i / 14, y0 = f * .32, y1 = 1 - f * .44;
      const xl = f * .47; line(xl, y0, xl, y1, 'rgba(15,10,8,.5)', 1); line(1 - xl, y0, 1 - xl, y1, 'rgba(15,10,8,.5)', 1);
    }
    for (let j = 0; j < 12; j++) { const fy = j / 12; line(0, fy, .47, .32 + fy * .24, 'rgba(15,10,8,.35)', 1); line(1, fy, .53, .32 + fy * .24, 'rgba(15,10,8,.35)', 1); }
    rect(.08, .66, .1, .16, '#2a3a2e'); rect(.075, .64, .11, .025, '#33463a');
    rect(.8, .7, .08, .12, '#3a3a36');
    ell(.42, .82, S * .07, S * .015, '#22282c'); ell(.6, .9, S * .1, S * .02, '#22282c');
    const el = t - sceneStart;
    const grow = Math.min(.55, .12 + el * .03);
    ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.beginPath(); ctx.moveTo(.44 * W, H); ctx.lineTo(.56 * W, H);
    ctx.lineTo((.515 + Math.sin(el * 2) * .005) * W, (1 - grow) * H); ctx.lineTo((.485 + Math.sin(el * 2) * .005) * W, (1 - grow) * H); ctx.fill();
    ell(.5 + Math.sin(el * 2) * .005, 1 - grow, S * .025, S * .03, 'rgba(0,0,0,.85)');
    ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 3;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo((.5 + sgn * .02) * W, (1 - grow * .7) * H); ctx.lineTo((.5 + sgn * .07) * W, (1 - grow * .45) * H); ctx.lineTo((.5 + sgn * .09) * W, (1 - grow * .3) * H); ctx.stroke(); }
  };
  V.alley.post = (c, tt) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(.5, .46, S * .16, 'rgba(255,170,80,A)', .28 + Math.sin(tt * 3) * .03);
    glow(.5, .46, S * .025, 'rgba(255,220,160,A)', .7);
    ctx.restore();
  };

  V.shelter = (c, tt) => {
    V.basement(c, tt);
    rect(.42, .8, .16, .03, '#3a3026');
    ell(.5, .8, S * .025, S * .01, '#6a5a40');
    rect(.493, .74, .014, .06, '#9a8a60');
    const people = opts.people || [];
    const spots = [[.3, .83, -1], [.7, .83, 1], [.18, .78, -1], [.82, .78, 1], [.38, .74, -1], [.62, .74, 1]];
    people.forEach((p, i) => {
      const s = spots[i % spots.length];
      drawFigure({ x: s[0], y: s[1], h: .26, seated: true, cloth: p.cloth, injured: p.injured, face: s[2] }, { reveal: 0 }, tt + i);
    });
  };
  V.shelter.post = (c, tt) => {
    const n = (opts.people || []).length;
    const f = .92 + Math.sin(tt * 7) * .04 + Math.sin(tt * 11.3) * .03;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(.5, .74, S * (.45 + n * .06), 'rgba(255,160,70,A)', (.2 + n * .04) * f);
    glow(.5, .735, S * .03, 'rgba(255,220,150,A)', .9 * f);
    ctx.restore();
    if (opts.lit) V.basement.post(c, tt);
  };

  /* ---------- 人形 / 擬態者 ---------- */
  function drawFigure(f, st, tt) {
    const x = f.x * W, y = f.y * H, h = f.h * H;
    ctx.save(); ctx.translate(x, y);
    if (f.shake) ctx.translate(Math.sin(tt * 37) * 1.6, Math.cos(tt * 29) * .8);
    if (f.lying) { ctx.rotate(Math.PI / 2); ctx.translate(0, -h * .05); ctx.translate(Math.sin(tt * 6) * h * .01, 0); }
    const rev = st.reveal > 0;
    const skin = f.skin || (f.mimic ? '#8d9282' : '#a08e7a');
    const cloth = f.cloth || (f.mimic ? '#403d39' : '#4e4842');
    let hj = 0, tilt = 0;
    if (f.mimic) { const ph = (tt * .37 + f.x * 7) % 1; if (ph < .025) hj = (Math.random() - .5) * h * .06; tilt = Math.sin(tt * .3 + f.x) * .05; }
    if (rev) tilt = .5;
    ctx.fillStyle = cloth; ctx.strokeStyle = cloth; ctx.lineCap = 'round';
    if (f.seated) {
      ctx.beginPath(); ctx.ellipse(0, -h * .1, h * .16, h * .07, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-h * .11, -h * .55); ctx.lineTo(h * .11, -h * .55); ctx.lineTo(h * .1, -h * .14); ctx.lineTo(-h * .1, -h * .14); ctx.fill();
      ctx.lineWidth = h * .045;
      ctx.beginPath(); ctx.moveTo(-h * .1, -h * .5); ctx.lineTo(-h * .06, -h * .22); ctx.lineTo(h * .04, -h * .2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h * .1, -h * .5); ctx.lineTo(h * .08, -h * .24); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(f.face * h * .01 || 0, -h * .64, h * .075, 0, 7); ctx.fill();
      if (f.injured) { ctx.fillStyle = '#d8d0c0'; ctx.fillRect(-h * .14, -h * .12, h * .09, h * .04); ctx.fillStyle = 'rgba(140,20,15,.8)'; ctx.fillRect(-h * .12, -h * .115, h * .03, h * .03); }
      ctx.restore(); return;
    }
    if (!f.inCar && !f.reflect) {
      ctx.fillRect(-h * .075, -h * .46, h * .055, h * .46);
      ctx.fillRect(h * .02, -h * .46, h * .055, h * .46);
    }
    const top = f.reflect ? -h * .55 : -h * .8;
    ctx.beginPath(); ctx.moveTo(-h * .125, top); ctx.lineTo(h * .125, top); ctx.lineTo(h * .095, top + h * .36); ctx.lineTo(-h * .095, top + h * .36); ctx.fill();
    if (f.nurse) { ctx.fillStyle = 'rgba(120,15,12,.7)'; ctx.fillRect(-h * .06, top + h * .1, h * .05, h * .08); ctx.fillRect(h * .03, top + h * .2, h * .04, h * .03); ctx.fillStyle = cloth; }
    if (!f.inCar) {
      ctx.lineWidth = h * .045;
      const arm = rev ? h * .78 : h * .36;
      ctx.beginPath(); ctx.moveTo(-h * .12, top + h * .02); ctx.lineTo(-h * .15 - (rev ? h * .06 : 0), top + arm); ctx.stroke();
      if (f.holdsLight) { ctx.beginPath(); ctx.moveTo(h * .12, top + h * .02); ctx.lineTo(h * .2, top + h * .25); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(h * .12, top + h * .02); ctx.lineTo(h * .15 + (rev ? h * .06 : 0), top + arm); ctx.stroke(); }
      if (rev) {
        ctx.strokeStyle = skin; ctx.lineWidth = 1.5;
        for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx * (h * .15 + h * .06), top + arm); ctx.lineTo(sx * (h * .17 + h * .06 + k * h * .012), top + arm + h * .06); ctx.stroke(); }
      }
    }
    const neck = rev ? h * .14 : h * .035;
    const hy = top - neck - h * .075;
    ctx.save(); ctx.translate(hj, hy); ctx.rotate(tilt);
    ctx.fillStyle = skin; ctx.fillRect(-h * .02, h * .06, h * .04, neck + h * .02);
    ctx.beginPath(); ctx.ellipse(0, 0, h * .07, h * .085, 0, 0, 7); ctx.fill();
    if (f.facingAway) {
      ctx.fillStyle = '#1a1612'; ctx.beginPath(); ctx.ellipse(0, -h * .01, h * .072, h * .08, 0, 0, 7); ctx.fill();
    } else {
      const hole = f.holeEyes || rev || f.mimic && st.lit > .6;
      if (hole) {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(-h * .025, -h * .01, h * .016, h * .022, 0, 0, 7); ctx.ellipse(h * .025, -h * .01, h * .016, h * .022, 0, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#1a1410';
        ctx.beginPath(); ctx.arc(-h * .024, -h * .01, h * .008, 0, 7); ctx.arc(h * .024, -h * .01, h * .008, 0, 7); ctx.fill();
        if (!f.mimic && !f.reflect) { ctx.fillStyle = 'rgba(255,255,240,.9)'; ctx.fillRect(-h * .026, -h * .014, 2, 2); ctx.fillRect(h * .022, -h * .014, 2, 2); }
      }
      if (rev) {
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, h * .05, h * .04, h * .085, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#d8d0b8';
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-h * .035 + k * h * .014, h * .0); ctx.lineTo(-h * .03 + k * h * .014, h * .02); ctx.lineTo(-h * .025 + k * h * .014, h * .0); ctx.fill(); }
      } else if (f.yourFace) {
        ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, h * .02, h * .03, .2, Math.PI - .2); ctx.stroke();
      } else {
        ctx.fillStyle = '#3a2a22'; ctx.fillRect(-h * .015, h * .035, h * .03, 2);
      }
      if (f.nurse) { ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(0, -h * .05, h * .075, h * .045, 0, Math.PI, 0); ctx.fill(); }
    }
    ctx.restore();
    ctx.restore();
  }

  /* ---------- 線索視覺 ---------- */
  const CD = {};
  CD.handle = (cx, cy, tt) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(tt * .6) * .6 - .3); ctx.fillStyle = '#c0ad84'; ctx.fillRect(-S * .002, -S * .002, S * .02, S * .005); ctx.restore(); };
  CD.peek = (cx, cy, tt) => {
    ctx.fillStyle = '#d8d4c4'; ctx.beginPath(); ctx.arc(cx, cy, S * .007, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(cx + Math.sin(tt * 1.7) * S * .002, cy, S * .0035, 0, 7); ctx.fill();
  };
  CD.ooze = (cx, cy, tt) => {
    ctx.fillStyle = '#050505';
    for (let i = 0; i < 9; i++) { const ox = (i - 4) * S * .018, h = S * (.02 + .015 * Math.sin(tt * 1.3 + i)); ctx.beginPath(); ctx.ellipse(cx + ox, cy - h * .3, S * .012, h, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#050505'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const ox = (i - 7) * S * .01; ctx.beginPath(); ctx.moveTo(cx + ox, cy); ctx.quadraticCurveTo(cx + ox + Math.sin(tt + i) * 8, cy - S * .05, cx + ox + Math.sin(tt * 2 + i) * 4, cy - S * (.07 + .02 * Math.sin(tt + i))); ctx.stroke(); }
  };
  CD.note = (cx, cy) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.06); ctx.fillStyle = '#d8d0b8'; ctx.fillRect(-S * .05, -S * .02, S * .1, S * .04);
    ctx.font = `${Math.max(9, S * .014)}px 'Noto Serif TC',serif`; ctx.fillStyle = '#2a2018'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('給還活著的人', 0, 0); ctx.restore(); };
  CD.lipstick = (cx, cy) => {
    ctx.save(); ctx.translate(cx, cy); ctx.font = `700 ${Math.max(12, S * .026)}px 'Noto Serif TC',serif`; ctx.fillStyle = '#a3140e'; ctx.textAlign = 'center';
    '別讓它知道你看見了'.split('').forEach((ch, i) => ctx.fillText(ch, Math.sin(i) * 2, -S * .1 + i * S * .028)); ctx.restore();
  };
  CD.nails = (cx, cy) => { ctx.fillStyle = '#d0c4a8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(cx + i * S * .008, cy + (i % 2) * S * .006, S * .003, S * .005, i, 0, 7); ctx.fill(); } ctx.fillStyle = 'rgba(110,10,8,.8)'; ctx.fillRect(cx - 2, cy + S * .01, S * .03, 2); };
  CD.shadowWrong = (cx, cy) => { ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.beginPath(); ctx.moveTo(cx - S * .1, cy - S * .03); ctx.lineTo(cx + S * .02, cy - S * .03); ctx.lineTo(cx + S * .09, cy + S * .17); ctx.lineTo(cx - S * .16, cy + S * .17); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + S * .04, cy + S * .17, S * .045, S * .03, 0, 0, 7); ctx.fill(); };
  CD.kit = (cx, cy) => { ctx.fillStyle = '#c8c4bc'; ctx.fillRect(cx - S * .03, cy - S * .015, S * .06, S * .03); ctx.fillStyle = '#9a1a12'; ctx.fillRect(cx - S * .004, cy - S * .012, S * .008, S * .024); ctx.fillRect(cx - S * .012, cy - S * .004, S * .024, S * .008); ctx.fillStyle = '#e8e4dc'; ctx.fillRect(cx + S * .035, cy - S * .005, S * .03, S * .01); };
  CD.badge = (cx, cy) => { ctx.fillStyle = '#e0ddd2'; ctx.fillRect(cx - S * .03, cy - S * .012, S * .06, S * .024); ctx.font = `700 ${Math.max(9, S * .014)}px 'Noto Serif TC',serif`; ctx.fillStyle = '#1a2a4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('林嵐', cx, cy); };
  CD.blood = (cx, cy) => { ctx.fillStyle = 'rgba(100,10,8,.85)'; ctx.beginPath(); ctx.moveTo(cx - S * .12, cy + S * .04); ctx.quadraticCurveTo(cx, cy - S * .01, cx + S * .1, cy - S * .03); ctx.lineTo(cx + S * .11, cy - S * .01); ctx.quadraticCurveTo(cx, cy + S * .02, cx - S * .11, cy + S * .07); ctx.fill();
    ctx.fillStyle = '#d8d8d0'; ctx.beginPath(); ctx.ellipse(cx - S * .05, cy + S * .05, S * .022, S * .01, -.3, 0, 7); ctx.fill(); ctx.fillStyle = '#7a2a2a'; ctx.fillRect(cx - S * .065, cy + S * .045, S * .02, S * .004); };
  CD.claws = (cx, cy) => { ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - S * .03 + i * S * .015, cy - S * .03); ctx.lineTo(cx - S * .01 + i * S * .018, cy + S * .04); ctx.stroke(); } };
  CD.tally = (cx, cy) => { ctx.fillStyle = 'rgba(110,12,8,.75)'; ctx.beginPath(); ctx.ellipse(cx, cy + S * .06, S * .06, S * .035, .3, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(cx + Math.cos(i) * S * .08, cy + S * .06 + Math.sin(i * 2) * S * .04, S * .008, S * .006, 0, 0, 7); ctx.fill(); }
    ctx.font = `700 ${Math.max(12, S * .026)}px monospace`; ctx.fillStyle = '#c8c0b0'; ctx.textAlign = 'center'; ctx.fillText('98  99  100', cx, cy); };
  CD.faces = (cx, cy, tt) => {
    for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * S * .035, y = cy + Math.sin(tt * 2 + i) * 1.5;
      ctx.fillStyle = '#b8b4a6'; ctx.beginPath(); ctx.ellipse(x, y, S * .013, S * .017, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(x - S * .007, y - S * .005, S * .004, S * .004); ctx.fillRect(x + S * .003, y - S * .005, S * .004, S * .004);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + S * .002, S * .008, .2, Math.PI - .2); ctx.stroke(); }
  };
  CD.wires = () => {};
  CD.legs = () => {};

  /* ---------- 驚嚇畫面 ---------- */
  function drawFace(c, w, h, e, seed) {
    const r = rng(seed + (e / 60 | 0));
    c.fillStyle = '#060000'; c.fillRect(0, 0, w, h);
    const k = Math.min(w, h) * (.62 + e / 2200);
    const cx = w / 2 + (r() - .5) * 30, cy = h * .5 + (r() - .5) * 20;
    const g = c.createRadialGradient(cx - k * .1, cy - k * .15, k * .05, cx, cy, k * .62);
    g.addColorStop(0, '#e2dacb'); g.addColorStop(.6, '#9a907e'); g.addColorStop(1, '#2a2218');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, k * .4, k * .58, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,10,10,.7)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { c.beginPath(); let x = cx + (r() - .5) * k * .7, y = cy + (r() - .5) * k; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - .5) * k * .12; y += (r() - .5) * k * .12; c.lineTo(x, y); } c.stroke(); }
    for (const sx of [-1, 1]) {
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx + sx * k * .15, cy - k * .12, k * .1, k * .14, sx * .2, 0, 7); c.fill();
      c.fillStyle = '#ff2a10'; c.shadowColor = '#ff0000'; c.shadowBlur = 20;
      c.beginPath(); c.arc(cx + sx * k * .15 + (r() - .5) * 4, cy - k * .1, k * .014, 0, 7); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = 'rgba(110,0,0,.9)'; c.lineWidth = k * .012;
      c.beginPath(); c.moveTo(cx + sx * k * .14, cy - k * .0); c.lineTo(cx + sx * k * .13 + (r() - .5) * 6, cy + k * .2 + r() * k * .1); c.stroke();
    }
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, cy + k * .27, k * .18, k * .26 + Math.sin(e / 40) * k * .02, 0, 0, 7); c.fill();
    c.fillStyle = '#e0d8c0';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i + .5) / 9 * Math.PI, x = cx + Math.cos(a) * k * .17, y = cy + k * .27 + Math.sin(a) * k * .25;
      c.beginPath(); c.moveTo(x - k * .015, y); c.lineTo(x + k * .015, y); c.lineTo(x, y + k * .06); c.fill();
      const a2 = (i + .5) / 9 * Math.PI, x2 = cx + Math.cos(a2) * k * .17, y2 = cy + k * .27 + Math.sin(a2) * k * .25;
      c.beginPath(); c.moveTo(x2 - k * .015, y2); c.lineTo(x2 + k * .015, y2); c.lineTo(x2, y2 - k * .06); c.fill();
    }
    c.fillStyle = 'rgba(160,0,0,.25)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { const sy = r() * h, sh = 6 + r() * 40, off = (r() - .5) * 80; try { c.drawImage(c.canvas, 0, sy * DPR, w * DPR, sh * DPR, off, sy, w, sh); } catch (err) {} }
  }
  R.scare = function (done) {
    scaring = true; sc.style.display = 'block';
    const start = performance.now(), seed = (Math.random() * 1e6) | 0;
    document.body.classList.add('shake');
    const step = () => {
      const e = performance.now() - start;
      scx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (e < 70) { scx.fillStyle = '#fff'; scx.fillRect(0, 0, W, H); }
      else if (e < 1100) { drawFace(scx, W, H, e, seed); if (e > 520 && e < 590) { scx.fillStyle = 'rgba(255,255,255,.7)'; scx.fillRect(0, 0, W, H); } }
      else if (e < 1500) { scx.fillStyle = `rgba(0,0,0,${(e - 1100) / 400})`; scx.fillRect(0, 0, W, H); }
      else { sc.style.display = 'none'; scaring = false; document.body.classList.remove('shake'); scx.clearRect(0, 0, W, H); done && done(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- 主迴圈 ---------- */
  function loop(nowMs) {
    const dt = Math.min(.05, (nowMs - (lastNow || nowMs)) / 1000); lastNow = nowMs; t += dt;
    if (!ptr.active || nowMs - ptr.last > 6000) {
      ptr.x += ((.5 + Math.sin(t * .35) * .22) - ptr.x) * .01;
      ptr.y += ((.52 + Math.sin(t * .6) * .1) - ptr.y) * .01;
    }
    L.x += (ptr.x - L.x) * .14; L.y += (ptr.y - L.y) * .14;
    const lx = (L.x + Math.sin(t * 8.3) * .002 + Math.sin(t * 1.3) * .004) * W;
    const ly = (L.y + Math.cos(t * 7.1) * .002 + Math.sin(t * 1.1) * .006) * H;
    const Rpx = Math.max(110, S * .23) * radiusMul;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const fn = V[view] || V.black;
    fn(ctx, t);
    const figs = (scene && scene.figures) || [];
    figs.forEach((f, i) => {
      const st = figState[i] || (figState[i] = { lit: 0, reveal: 0, cool: 1.5 });
      const hx = f.x * W, hy = f.y * H - f.h * H * (f.lying ? .1 : .85);
      const d = Math.hypot(lx - hx, ly - hy);
      if (d < Rpx * .55) st.lit += dt; else st.lit = Math.max(0, st.lit - dt * 2);
      st.cool -= dt; if (st.reveal > 0) st.reveal -= dt;
      if (f.mimic && !f.noGlimpse && st.lit > 1.3 && st.cool <= 0) { st.reveal = .18; st.cool = 4.5; R.onGlimpse && R.onGlimpse(); }
      drawFigure(f, st, t);
    });
    const clues = (scene && scene.clues) || [];
    clues.forEach((c, i) => {
      const cx = c.x * W, cy = c.y * H;
      if (c.draw && CD[c.draw]) CD[c.draw](cx, cy, t);
    });
    ctx.fillStyle = 'rgba(220,210,180,.5)';
    dust.forEach(p => { p.y -= p.v * dt * 3; p.x += Math.sin(t + p.p) * .0004; if (p.y < 0) { p.y = 1; p.x = Math.random(); } ctx.fillRect(p.x * W, p.y * H, p.s, p.s); });

    const flick = performance.now() < flickUntil || (view !== 'shelter' && view !== 'black' && Math.random() < .0012 && (R.flicker(90 + Math.random() * 160), true));
    dc.setTransform(DPR, 0, 0, DPR, 0, 0);
    dc.globalCompositeOperation = 'source-over';
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = `rgba(0,0,0,${amb})`; dc.fillRect(0, 0, W, H);
    if (!flick && view !== 'black') {
      dc.globalCompositeOperation = 'destination-out';
      const g = dc.createRadialGradient(lx, ly, 0, lx, ly, Rpx);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.92)'); g.addColorStop(.75, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g; dc.fillRect(lx - Rpx, ly - Rpx, Rpx * 2, Rpx * 2);
      dc.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(dk, 0, 0, W, H);
    if (!flick && view !== 'black') {
      ctx.save(); ctx.globalCompositeOperation = 'soft-light';
      const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, Rpx * .8);
      g2.addColorStop(0, 'rgba(255,235,190,.5)'); g2.addColorStop(1, 'rgba(255,235,190,0)');
      ctx.fillStyle = g2; ctx.fillRect(lx - Rpx, ly - Rpx, Rpx * 2, Rpx * 2); ctx.restore();
    }
    if (fn.post) fn.post(ctx, t);
    figs.forEach(f => {
      if (!f.holdsLight) return;
      const hx = f.x * W + f.h * H * .2, hy = f.y * H - f.h * H * .55;
      const sw = Math.sin(t * 23) * 6 + Math.sin(t * 3) * 14;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, S * .5);
      g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(W * .3 + sw, H * 1.05); ctx.lineTo(W * .75 + sw, H * 1.05); ctx.fill();
      glow(hx / W, hy / H, S * .02, 'rgba(255,250,230,A)', .9);
      ctx.restore();
    });

    if (!flick && R.onClue) clues.forEach((c, i) => {
      if (found[i]) return;
      const d = Math.hypot(lx - c.x * W, ly - c.y * H);
      if (d < Rpx * .5) clueT[i] += dt; else clueT[i] = Math.max(0, clueT[i] - dt);
      if (clueT[i] > .55) { found[i] = true; R.onClue(c); }
    });

    requestAnimationFrame(loop);
  }

  window.R = R;
})();
