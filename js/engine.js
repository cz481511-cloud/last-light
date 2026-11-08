/* 遊戲引擎：選單 → 章節 → 場景 → 抉擇 → 死亡／夜晚 → 結局 */
(function () {
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'lastlight_save_v1';
  const RES_NAME = { food: '食物', power: '電力', meds: '藥品' };
  const SCREENS = ['screen-title', 'screen-card', 'screen-death', 'screen-join', 'screen-shelter', 'screen-end'];

  let state = null, checkpoint = null, deaths = 0;
  let token = 0, typing = null, timer = null, locked = false, taughtLight = false;

  const clone = o => JSON.parse(JSON.stringify(o));
  function newState() {
    return { chapter: 1, companions: [], lost: [], res: { food: 1, power: 0, meds: 0 }, facilities: [], flags: {}, night: 0 };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cp: checkpoint, deaths })); } catch (e) {} }
  function load() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }

  function show(id) {
    SCREENS.forEach(s => $(s).classList.toggle('on', s === id));
    $('dialog').classList.toggle('hidden', !!id);
    $('hud').classList.toggle('on', !id || id === 'screen-shelter');
    if (id) { $('clues').innerHTML = ''; document.body.classList.remove('danger'); }
  }
  function tear() { document.body.classList.remove('tear'); void document.body.offsetWidth; document.body.classList.add('tear'); setTimeout(() => document.body.classList.remove('tear'), 460); }
  let toastT = null;
  function toast(text, ms) {
    const el = $('toast'); el.textContent = text; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2600);
  }
  function radiusMul() { return state && state.facilities.includes('light') && !state.flags.dark ? 1.22 : 1; }
  function hud() {
    if (!state) return;
    const ch = CHAPTERS[state.chapter];
    $('hud-chapter').textContent = ch ? `${ch.no.replace(/ /g, '')}　${ch.title}` : '';
    $('hud-res').textContent = `食物 ${state.res.food}　電力 ${state.res.power}　藥品 ${state.res.meds}　｜　${1 + state.companions.length} 人`;
  }

  /* ---------- 噪點貼圖 ---------- */
  (function grain() {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const x = c.getContext('2d'), d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    $('fx-grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ---------- 標題 ---------- */
  function title() {
    token++; clearTimer();
    R.setView('title'); show('screen-title');
    $('btn-continue').style.display = load() && load().cp ? '' : 'none';
  }
  $('btn-new').onclick = () => { A.init(); A.sfx('click'); A.ambience('dread'); state = newState(); deaths = 0; beginChapter(); };
  $('btn-continue').onclick = () => {
    const sv = load(); if (!sv || !sv.cp) return;
    A.init(); A.sfx('click'); A.ambience('dread');
    deaths = sv.deaths || 0; checkpoint = sv.cp; state = clone(checkpoint); chapterCard();
  };
  $('btn-sound').onclick = () => { A.init(); $('btn-sound').textContent = A.toggle() ? '聲音：開' : '聲音：關'; };

  /* ---------- 章節 ---------- */
  function beginChapter() { checkpoint = clone(state); save(); chapterCard(); }
  function chapterCard() {
    const my = ++token; clearTimer();
    const ch = CHAPTERS[state.chapter];
    $('card-no').textContent = ch.no; $('card-title').textContent = ch.title;
    $('card-tip').textContent = deaths ? `${ch.tip}　·　已死亡 ${deaths} 次` : ch.tip;
    const wrap = $('screen-card').firstElementChild; wrap.style.animation = 'none'; void wrap.offsetWidth; wrap.style.animation = '';
    R.setView('black'); show('screen-card'); A.heartbeat(0); A.ambience('dread'); A.sfx('boom'); hud();
    let went = false;
    const go = () => { if (went || my !== token) return; went = true; $('screen-card').onclick = null; playScene(ch.start); };
    $('screen-card').onclick = go;
    setTimeout(go, 3300);
  }

  /* ---------- 場景 ---------- */
  function playScene(id) {
    const sc = SCENES[id];
    if (!sc) { console.error('找不到場景', id); return; }
    const my = ++token; locked = false; clearTimer();
    state.scene = id;
    show(null);
    $('lines').innerHTML = ''; $('hints').innerHTML = ''; $('choices').innerHTML = ''; $('clues').innerHTML = '';
    R.setScene(sc, { radiusMul: radiusMul() });
    A.ambience(sc.warm ? 'warm' : 'dread');
    A.heartbeat(sc.danger || 0);
    document.body.classList.toggle('danger', (sc.danger || 0) >= 3);
    hud();
    if (!taughtLight && sc.clues && sc.clues.length) { taughtLight = true; setTimeout(() => my === token && toast('移動滑鼠／手指照亮四周。光停留久一點，會發現線索。', 4200), 900); }
    typeLines(sc.lines, my, () => { showHints(sc, my); setTimeout(() => my === token && showChoices(sc, my), sc.hints ? 700 : 150); });
  }

  function typeLines(lines, my, done) {
    const box = $('lines'); let i = 0;
    const next = () => {
      if (my !== token) return;
      if (i >= lines.length) { typing = null; done(); return; }
      let ln = lines[i++]; if (typeof ln === 'string') ln = { t: ln };
      [...box.children].forEach(c => c.classList.add('old'));
      const keep = innerHeight < 520 ? 1 : innerHeight < 720 ? 2 : 4;
      while (box.children.length > keep) box.removeChild(box.firstChild);
      const el = document.createElement('div'); el.className = 'line'; box.appendChild(el);
      if (ln.sfx) A.sfx(ln.sfx);
      typeText(el, ln.t, my, fast => {
        if (my !== token) return;
        if (ln.glitch) {
          setTimeout(() => {
            if (my !== token) return;
            el.textContent = ln.glitch; el.classList.add('glitch'); A.sfx('glitch'); tear(); R.flicker(160);
            setTimeout(() => { if (my !== token) return; el.textContent = ln.t; el.classList.remove('glitch'); setTimeout(next, 350); }, 800);
          }, 350);
        } else setTimeout(next, fast ? 140 : 560);
      });
    };
    next();
  }
  function typeText(el, text, my, cb) {
    const tp = { fast: false }; typing = tp; let n = 0;
    const step = () => {
      if (my !== token) return;
      if (tp.fast) { el.textContent = text; cb(true); return; }
      n++; el.textContent = text.slice(0, n);
      if (n % 2 === 0) A.sfx('type');
      if (n >= text.length) { cb(false); return; }
      const ch = text[n - 1];
      setTimeout(step, '。，、！？…」'.includes(ch) ? 120 : 34);
    };
    step();
  }
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (typing) typing.fast = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { if (typing) typing.fast = true; }
    if ((e.key === '1' || e.key === '2') && !$('dialog').classList.contains('hidden')) {
      const b = $('choices').querySelectorAll('button')[+e.key - 1]; if (b && !b.disabled) b.click();
    }
  });

  function showHints(sc, my) {
    const box = $('hints'); box.innerHTML = '';
    if (!sc.hints) return;
    state.companions.forEach((c, i) => {
      const h = sc.hints[c.id]; if (!h) return;
      const k = COMPANIONS[c.id];
      const el = document.createElement('div'); el.className = 'hint'; el.style.color = k.color; el.style.animationDelay = (i * .5) + 's';
      if (h.startsWith('（')) el.innerHTML = `<span class="say">${h}</span>`;
      else el.innerHTML = `<span class="who">${k.name}</span>：<span class="say">${h}</span>`;
      box.appendChild(el);
    });
  }

  function showChoices(sc, my) {
    const box = $('choices'); box.innerHTML = '';
    sc.options.forEach((o, idx) => {
      const b = document.createElement('button'); b.textContent = o.label;
      b.onclick = () => choose(sc, o, b, my);
      box.appendChild(b);
    });
    if (sc.timer) startTimer(sc, my);
  }
  function startTimer(sc, my) {
    const bar = $('timer'), fill = bar.firstElementChild; bar.classList.add('on');
    const start = performance.now(), dur = sc.timer * 1000;
    A.heartbeat(4); document.body.classList.add('danger');
    timer = setInterval(() => {
      if (my !== token) return clearTimer();
      const left = 1 - (performance.now() - start) / dur;
      fill.style.width = Math.max(0, left * 100) + '%';
      if (left <= 0) {
        clearTimer(); if (locked) return; locked = true;
        const wrong = sc.options.find(o => o.death) || {};
        lockButtons(null);
        die(sc.timeoutDeath || wrong.death, wrong.rule);
      }
    }, 50);
  }
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } $('timer').classList.remove('on'); $('timer').firstElementChild.style.width = '100%'; }
  function lockButtons(picked) { $('choices').querySelectorAll('button').forEach(b => { b.disabled = true; if (b === picked) b.classList.add('picked'); }); }

  function choose(sc, o, btn, my) {
    if (locked || my !== token) return;
    locked = true; clearTimer(); lockButtons(btn); A.sfx('click');
    if (o.death) { setTimeout(() => die(o.death, o.rule), 380); return; }
    const join = applyEffects(o.effects);
    const next = () => o.next === '@end' ? endChapter() : playScene(o.next);
    setTimeout(() => { if (join) showJoin(join, next); else next(); }, 420);
  }

  function applyEffects(e) {
    if (!e) return null;
    const parts = [];
    ['food', 'power', 'meds'].forEach(k => { if (e[k]) { state.res[k] += e[k]; parts.push(`${e[k] > 0 ? '+' : ''}${e[k]} ${RES_NAME[k]}`); } });
    if (e.facility && !state.facilities.includes(e.facility)) {
      state.facilities.push(e.facility); const f = FACILITIES[e.facility];
      parts.push(`解鎖設施：${f.name}（${f.desc}）`);
    }
    let join = null;
    if (e.join && !state.companions.find(c => c.id === e.join)) { state.companions.push({ id: e.join, injured: !!e.injured }); join = e.join; }
    if (parts.length) toast(parts.join('　'));
    hud();
    return join;
  }

  /* ---------- 夥伴加入 ---------- */
  function showJoin(id, done) {
    const k = COMPANIONS[id], c = state.companions.find(x => x.id === id);
    $('join-name').textContent = k.name;
    $('join-role').textContent = k.role + (c && c.injured ? '　·　受傷' : '');
    $('join-line').textContent = k.line;
    $('join-tag').textContent = k.tag;
    $('join-count').textContent = `庇護所人數：${1 + state.companions.length}`;
    show('screen-join'); A.heartbeat(0); A.ambience('warm'); A.sfx('join');
    $('btn-join').onclick = () => { A.sfx('click'); done(); };
  }

  /* ---------- 死亡 ---------- */
  function die(text, rule) {
    token++; clearTimer();
    $('dialog').classList.add('hidden'); $('clues').innerHTML = '';
    A.heartbeat(0); A.ambience('none'); A.sfx('scream');
    R.scare(() => {
      deaths++; save();
      R.setView('black');
      $('death-text').textContent = text || '';
      $('death-rule').textContent = rule || '';
      const ch = CHAPTERS[state.chapter];
      $('death-count').textContent = `死亡次數　${deaths}`;
      $('btn-retry').textContent = `重新開始　${ch.no.replace(/ /g, '')}〈${ch.title}〉`;
      show('screen-death'); A.sfx('boom');
    });
  }
  $('btn-retry').onclick = () => { A.sfx('click'); state = clone(checkpoint); chapterCard(); };

  /* ---------- 夜晚／庇護所 ---------- */
  function endChapter() {
    token++; clearTimer(); A.heartbeat(0);
    runNight(() => {
      if (state.chapter >= LAST_CHAPTER) showEnd();
      else { state.chapter++; beginChapter(); }
    });
  }
  function shelterView() {
    R.setView('shelter', {
      lit: state.facilities.includes('light') && !state.flags.dark,
      ambient: Math.max(.3, .62 - state.companions.length * .08 - (state.facilities.includes('light') && !state.flags.dark ? .08 : 0)),
      cans: state.res.food,
      people: state.companions.map(c => ({ cloth: COMPANIONS[c.id].cloth, injured: c.injured }))
    });
  }
  function shelterPanel() {
    $('sh-title').textContent = `第 ${state.night} 夜　·　庇護所`;
    $('sh-res').innerHTML = `食物 <b>${state.res.food}</b>　電力 <b>${state.res.power}</b>　藥品 <b>${state.res.meds}</b>`;
    const ppl = ['<span class="p">你</span>'].concat(state.companions.map(c => {
      const k = COMPANIONS[c.id];
      return `<span class="p${c.injured ? ' hurt' : ''}" style="${c.injured ? '' : 'color:' + k.color}">${k.name}・${k.role}${c.injured ? '（受傷）' : ''}</span>`;
    }));
    $('sh-people').innerHTML = '成員：' + ppl.join('');
    $('sh-fac').textContent = '設施：' + (state.facilities.length ? state.facilities.map(f => FACILITIES[f].name + (f === 'light' && state.flags.dark ? '（沒電）' : '')).join('、') : '無');
  }
  function log(text, cls) { const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; $('sh-log').appendChild(p); p.scrollIntoView({ block: 'nearest' }); }

  function runNight(done) {
    const my = ++token;
    state.night++;
    shelterView(); show('screen-shelter'); A.ambience('warm');
    $('sh-log').innerHTML = ''; $('sh-choices').innerHTML = '';
    shelterPanel(); hud();
    log(state.companions.length
      ? `門鎖上了。燈下，${state.companions.map(c => COMPANIONS[c.id].name).join('和')}靠著牆坐著。今晚，你不是一個人。`
      : '門鎖上了。只有燈泡的嗡嗡聲陪著你。至少……今晚這裡是安全的。');
    const ds = Shelter.decisions(state);
    let i = 0;
    const nextDecision = () => {
      if (my !== token) return;
      if (i >= ds.length) return finish();
      const d = ds[i++];
      log(d.text, 'q');
      const box = $('sh-choices'); box.innerHTML = '';
      d.options.forEach(o => {
        const b = document.createElement('button'); b.textContent = o.label;
        b.onclick = () => {
          box.querySelectorAll('button').forEach(x => x.disabled = true); b.classList.add('picked'); A.sfx('click');
          const r = o.apply(); log(r.text, r.cls); shelterPanel(); shelterView(); hud();
          setTimeout(nextDecision, 900);
        };
        box.appendChild(b);
      });
    };
    const finish = () => {
      const box = $('sh-choices'); box.innerHTML = '';
      setTimeout(() => {
        if (my !== token) return;
        Shelter.upkeep(state).forEach(r => log(r.text, r.cls));
        shelterPanel(); shelterView(); hud();
        const b = document.createElement('button');
        b.textContent = state.chapter >= LAST_CHAPTER ? '天亮了' : '天亮了，出發';
        b.onclick = () => { A.sfx('click'); done(); };
        box.appendChild(b);
      }, 500);
    };
    setTimeout(nextDecision, 900);
  }

  /* ---------- 試玩結束 ---------- */
  function showEnd() {
    token++;
    shelterView(); show('screen-end'); A.ambience('warm'); A.sfx('join');
    const names = state.companions.map(c => COMPANIONS[c.id].name);
    $('end-stats').innerHTML =
      `庇護所成員：${1 + state.companions.length} 人${names.length ? '（你、' + names.join('、') + '）' : '（只有你）'}<br>` +
      (state.lost.length ? `失去的人：${state.lost.map(id => COMPANIONS[id].name).join('、')}<br>` : '') +
      `剩餘物資：食物 ${state.res.food}・電力 ${state.res.power}・藥品 ${state.res.meds}<br>` +
      `死亡次數：${deaths}`;
    checkpoint = null; save();
  }
  $('btn-end-restart').onclick = () => { A.sfx('click'); state = newState(); deaths = 0; beginChapter(); };

  /* ---------- 啟動 ---------- */
  R.onClue = c => {
    const el = document.createElement('div'); el.className = 'clue';
    el.innerHTML = `<b>你注意到</b>${c.text}`;
    $('clues').appendChild(el); A.sfx('clue');
  };
  R.onGlimpse = () => { A.sfx('glimpse'); tear(); };
  R.init($('world'), $('scare'));
  title();

  // 方便測試：網址加上 #scene=c2_market 可直接跳到該場景
  const m = location.hash.match(/scene=(\w+)/);
  if (m && SCENES[m[1]]) { state = newState(); state.chapter = m[1].startsWith('c2') ? 2 : 1; checkpoint = clone(state); setTimeout(() => playScene(m[1]), 50); }
})();
