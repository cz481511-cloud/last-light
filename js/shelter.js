/* 庇護所：夜晚抉擇（同樣只有二選一）與每晚的資源消耗 */
const Shelter = (function () {
  const LOCS = [
    { id: 'pharmacy', name: '藥局', res: 'meds', amt: 2, label: '藥品', skill: 'medic' },
    { id: 'warehouse', name: '超市倉庫', res: 'food', amt: 3, label: '食物', skill: 'scout' },
    { id: 'hardware', name: '五金行', res: 'power', amt: 2, label: '電力', skill: 'mechanic' }
  ];
  const info = c => COMPANIONS[c.id];

  function decisions(s) {
    const d = [];
    const comps = s.companions;
    const healthy = comps.filter(c => !c.injured);
    const medic = healthy.find(c => info(c).skill === 'medic');

    comps.filter(c => c.injured).forEach(c => {
      const k = info(c);
      if (s.res.meds > 0) {
        d.push({
          text: `${k.name}的傷口在燈下泛著不正常的顏色。${k.pr}一直說不痛。藥品剩下 ${s.res.meds} 份。`,
          options: [
            { label: `把藥用在${k.name}身上`, apply() {
              s.res.meds--; c.injured = false;
              return { text: `${medic ? info(medic).name : '你'}替${k.name}清洗傷口、縫合、換上乾淨的紗布。${k.pr}終於睡著了。`, cls: 'res' };
            } },
            { label: '藥先留著，也許之後更需要', apply() {
              c.untreated = true;
              return { text: `你把藥收回箱子裡。${k.name}沒有說話，只是一直盯著自己的傷口。`, cls: 'bad' };
            } }
          ]
        });
      } else {
        c.untreated = true;
      }
    });

    if (comps.length === 0) {
      d.push({
        text: '你一個人坐在燈泡下。天還沒亮，你還有一點時間。',
        options: [
          { label: '上樓，搜刮診所的藥櫃', apply() {
            s.res.meds += 1;
            return { text: '藥櫃幾乎被搬空了，但你在最底層摸到一盒抗生素。旁邊……是一根被咬斷的手指。（+1 藥品）', cls: 'res' };
          } },
          { label: '留下來，用鐵架加固門口', apply() {
            if (!s.facilities.includes('barricade')) s.facilities.push('barricade');
            return { text: '你把鐵架抵在門後，又釘上三塊木板。今晚，你睡得比較安穩。（解鎖設施：路障）', cls: 'res' };
          } }
        ]
      });
    } else if (healthy.length) {
      const need = LOCS.slice().sort((a, b) => s.res[a.res] - s.res[b.res]);
      const l1 = need[0], l2 = need[1];
      const p1 = healthy.find(c => info(c).skill === l1.skill) || healthy[0];
      const p2 = healthy.find(c => c !== p1 && info(c).skill === l2.skill) || healthy.find(c => c !== p1) || p1;
      const lab = (p, l) => `派${info(p).name}去${l.name}找${l.label}` + (info(p).skill === l.skill ? `（${info(p).pr}的專長）` : '');
      d.push({
        text: `物資不多了：${l1.label}只剩 ${s.res[l1.res]}，${l2.label}只剩 ${s.res[l2.res]}。天亮前，得派人出去。`,
        options: [
          { label: lab(p1, l1), apply() { return go(s, p1, l1); } },
          { label: lab(p2, l2), apply() { return go(s, p2, l2); } }
        ]
      });
    }
    return d;
  }

  function go(s, p, l) {
    const k = info(p);
    let ch = .62;
    if (k.skill === l.skill) ch += .28;
    if (k.skill === 'scout') ch += .15;
    if (Math.random() < ch) {
      s.res[l.res] += l.amt;
      return { text: `${k.name}在天亮前回來了，背包塞得滿滿的。${k.pr}什麼都沒說，只是一直發抖。（+${l.amt} ${l.label}）`, cls: 'res' };
    }
    p.injured = true;
    return { text: `${k.name}直到天亮才回來，背包是空的。${k.pr}的手臂上多了一道很深的傷口，說是被鐵絲網劃的。（${k.name}受傷了）`, cls: 'bad' };
  }

  function upkeep(s) {
    const out = [];
    s.companions.slice().forEach(c => {
      if (!c.untreated) return;
      const k = info(c);
      out.push({ text: `凌晨四點，${k.name}的呼吸聲變了。變得很規律……太規律了。`, cls: 'bad' });
      out.push({ text: `你們把${k.name}鎖在門外。門外的敲門聲，持續了一整個早上。`, cls: 'bad' });
      s.companions = s.companions.filter(x => x !== c);
      s.lost.push(c.id);
    });
    const need = 1 + s.companions.length;
    if (s.res.food >= need) {
      s.res.food -= need;
      out.push({ text: `大家分著吃了 ${need} 份食物。（食物剩 ${s.res.food}）` });
    } else {
      s.res.food = 0;
      if (s.companions.length) {
        const c = s.companions.pop(); s.lost.push(c.id);
        out.push({ text: `食物不夠了。半夜，${info(c).name}留下一張字條，獨自離開：「我不想拖累大家。」`, cls: 'bad' });
      } else {
        out.push({ text: '沒有食物了。你餓著肚子，聽著自己的胃在黑暗裡叫。', cls: 'bad' });
      }
    }
    if (s.facilities.includes('light')) {
      if (s.res.power > 0) {
        s.res.power--; s.flags.dark = false;
        out.push({ text: `燈泡亮了一整夜。（電力 -1，剩 ${s.res.power}）` });
      } else {
        s.flags.dark = true;
        out.push({ text: '電力耗盡了。燈泡閃了幾下，熄滅。黑暗重新爬回了地下室。', cls: 'bad' });
      }
    }
    s.companions.forEach(c => { delete c.untreated; });
    return out;
  }

  return { decisions, upkeep };
})();
