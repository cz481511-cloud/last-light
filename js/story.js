/* 劇情資料（資料驅動）
   場景欄位：view 場景畫面、lines 文字（字串或 {t, sfx, glitch}）、clues 手電筒線索、figures 人影、
            hints 夥伴提示（依夥伴 id）、timer 倒數秒數、timeoutDeath 逾時死因、danger 心跳等級 0-4、
            options 兩個選項：{label, next, effects} 或 {label, death, rule}
   next 為 '@end' 代表章節結束 */

const COMPANIONS = {
  lin: { name: '林嵐', pr: '她', role: '急診室護理師', skill: 'medic', color: '#e8b46a', cloth: '#8a9696',
    line: '「我還以為……這座城市只剩下我一個人了。」', tag: '專長：醫療。治療傷患時更可靠，熟悉藥局。' },
  zhe: { name: '阿哲', pr: '他', role: '高中生', skill: 'scout', color: '#8fc3d8', cloth: '#3a4858',
    line: '「謝謝你……我的腿好痛，但我能跑。我發誓我能跑。」', tag: '專長：偵察。外出搜刮更容易平安回來。' }
};

const FACILITIES = {
  light: { name: '照明', desc: '手電筒光圈變大' },
  barricade: { name: '路障', desc: '夜裡能擋下一次入侵' }
};

const CHAPTERS = {
  1: { no: '第 一 章', title: '第一夜', tip: '收音機說：不要回應。不要開門。', start: 'c1_wake' },
  2: { no: '第 二 章', title: '微光', tip: '外面還有人活著。也還有別的東西。', start: 'c2_street' }
};
const LAST_CHAPTER = 2;

const SCENES = {
  /* ================= 第一章 · 第一夜 ================= */
  c1_wake: {
    view: 'basement', danger: 1,
    lines: [
      '……頭好痛。',
      '你躺在冰冷的水泥地上。空氣裡有鐵鏽和消毒水的味道。',
      { t: '桌上的收音機沙沙作響——', sfx: 'static' },
      '「……重複，這不是演習。感染者會模仿人類的聲音。不要回應。不要開門。不要——」',
      { t: '訊號斷了。', sfx: 'static' },
      '這是舊診所的地下室。你唯一的光，是手上的手電筒。',
      { t: '樓梯上方，傳來很輕、很輕的金屬摩擦聲。', sfx: 'drip' }
    ],
    clues: [
      { x: .545, y: .26, draw: 'handle', text: '樓梯頂端的門把……正在慢慢轉動。' },
      { x: .765, y: .565, text: '收音機的音量鈕，被轉到了最大。' }
    ],
    options: [
      { label: '把收音機音量轉大，聽清楚', death: '沙沙聲在空蕩的大樓裡迴盪。它們一直在找聲音的來源。現在，它們找到了。', rule: '聲音，是會被聽見的。' },
      { label: '立刻關掉收音機，屏住呼吸', next: 'c1_knock' }
    ]
  },

  c1_knock: {
    view: 'door', danger: 3,
    lines: [
      '你關掉收音機，爬上樓梯，背貼著門。安靜得只剩你的心跳。',
      { t: '咚。咚。咚。', sfx: 'knock' },
      '「有人在嗎？」是個女人的聲音，帶著哭腔。',
      '「拜託……開門……它們在追我，我被抓傷了，我好怕……」',
      { t: '「拜託你開門。」', glitch: '「拜託你開門。拜託你開門。拜託你開門。拜託你開門。」' }
    ],
    clues: [
      { x: .5, y: .905, draw: 'legs', text: '門縫下的影子……不只兩隻腳。' },
      { x: .5, y: .36, draw: 'peek', text: '貓眼外不是走廊。是一隻眼睛，正貼著貓眼往裡看。' }
    ],
    options: [
      { label: '打開門，讓她進來', death: '門開的瞬間，她笑了。她的嘴一直裂到了耳根。', rule: '它們會哭，會求救，也會說「我好怕」。' },
      { label: '不出聲，靠在牆邊等', next: 'c1_after' }
    ]
  },

  c1_after: {
    view: 'door', danger: 2,
    lines: [
      '敲門聲停了。',
      '過了很久很久，門外又響起聲音。',
      { t: '「有人在嗎？」', sfx: 'whisper' },
      '這次……是你自己的聲音。',
      '它用你的聲音，模仿你剛才壓抑的呼吸。然後腳步聲慢慢往上，消失了。',
      '你終於明白：只要你出聲，它就能學會你。'
    ],
    options: [{ label: '……回到地下室', next: 'c1_supplies' }]
  },

  c1_supplies: {
    view: 'shelf', danger: 1,
    lines: [
      '你需要物資。牆角的鐵架上有兩個紙箱。',
      '左邊的箱子印著紅十字：「醫療用品」。箱蓋上有幾道很深的抓痕。',
      '右邊的箱子什麼都沒寫，被膠帶纏了一圈又一圈。',
      { t: '你只有時間打開一個。', sfx: 'drip' }
    ],
    clues: [
      { x: .3, y: .7, draw: 'ooze', text: '左邊箱子底部滲出黑色的東西……它在往上爬。' },
      { x: .69, y: .57, draw: 'note', text: '右邊箱子的膠帶上有一行小字：「給還活著的人」' }
    ],
    options: [
      { label: '打開左邊的醫療箱', death: '那不是液體。是頭髮。濕的、活的頭髮，一下子纏住了你的手腕，把你往箱子裡拖。', rule: '看起來最需要的東西，往往是陷阱。' },
      { label: '撕開右邊的膠帶', next: 'c1_found', effects: { food: 3, power: 2 } }
    ]
  },

  c1_found: {
    view: 'shelf', danger: 0,
    lines: [
      '裡面是三個罐頭、一顆還有電的蓄電池，和一張折起來的字條。',
      '「如果你看到這個，代表你比我們幸運。」',
      '「記住三件事：它們不會害怕。它們從不提問。它們永遠記錯日子。」',
      '「——上一個住在這裡的人」',
      '字條背面，有一個乾掉的血手印。'
    ],
    options: [{ label: '把字條收進口袋', next: 'c1_mirror' }]
  },

  c1_mirror: {
    view: 'mirror', danger: 2,
    lines: [
      '洗手台上方，掛著一面裂開的鏡子。',
      '你下意識看了一眼。蒼白、髒污，但還活著。',
      '你眨了眨眼。',
      { t: '鏡子裡的你……慢了半拍，才眨眼。', sfx: 'sting' }
    ],
    clues: [
      { x: .74, y: .38, draw: 'lipstick', text: '鏡框旁的牆上，用口紅寫著：「別讓它知道你看見了」' },
      { x: .46, y: .695, text: '洗手台裡有一小灘血。還是溫的。' }
    ],
    options: [
      { label: '湊近一點，看清楚是不是眼花', death: '鏡子裡的你笑了。你沒有。', rule: '有些東西，只要你承認看見了，它就存在。' },
      { label: '假裝沒事，用毛巾把鏡子蓋起來', next: 'c1_vent' }
    ]
  },

  c1_vent: {
    view: 'vent', danger: 3, timer: 10,
    timeoutDeath: '你遲疑太久了。哭聲停了。鐵網，被一根一根地從裡面推開。',
    lines: [
      '凌晨三點。你縮在角落，不敢睡。',
      { t: '通風口裡，傳來小孩的哭聲。', sfx: 'cry' },
      '「媽媽……好冷……這裡好黑……」',
      { t: '「你在那裡對不對？我聽到你呼吸了。」', sfx: 'whisper' }
    ],
    clues: [
      { x: .5, y: .4, text: '通風管只有手掌那麼寬。沒有小孩爬得進去。' },
      { x: .585, y: .47, draw: 'nails', text: '鐵網上卡著幾片指甲。是從裡面往外抓的。' }
    ],
    options: [
      { label: '輕聲安慰她：「別怕，我在這裡。」', death: '你一開口，它就記住了你的聲音。下一秒，那個聲音貼在你耳邊說：「找到你了。」', rule: '不要回應。永遠不要回應。' },
      { label: '撕下膠帶，把通風口封死', next: 'c1_fuse' }
    ]
  },

  c1_fuse: {
    view: 'fusebox', danger: 1,
    lines: [
      '哭聲在膠帶後面悶悶地持續了很久，才停下來。',
      '發電機旁邊有一個配電箱。只要拉下電閘，也許就能點亮頭頂的燈泡。',
      '在黑暗裡多待一秒，你都覺得自己快瘋了。'
    ],
    clues: [
      { x: .5, y: .79, draw: 'wires', text: '配電箱下方的電線被咬斷了，裸露的銅線泡在一灘水裡。' }
    ],
    options: [
      { label: '直接拉下總電閘', death: '電流穿過你的身體。你倒在水裡抽搐，動彈不得。黑暗中，有什麼東西慢慢靠了過來……開始進食。', rule: '越急，越要先看清楚。' },
      { label: '先擦乾積水，用膠帶纏好電線', next: 'c1_light', effects: { facility: 'light' } }
    ]
  },

  c1_light: {
    view: 'basement', lit: true, ambient: .55, danger: 0, warm: true,
    lines: [
      '你拉下電閘。',
      { t: '燈泡閃了兩下……亮了。', sfx: 'warm' },
      '微弱的黃光灑滿地下室。爆發以來，你第一次看清楚四周。',
      '這裡很小、很髒，但門很厚，牆很硬。',
      '這裡……可以成為一個家。',
      { t: '收音機突然自己響了起來。', sfx: 'static' },
      '「……今天是十一月九日……北區超市……還有倖存者……重複，今天是十一月九日……」'
    ],
    options: [{ label: '記住日期。天亮後出發。', next: '@end' }]
  },

  /* ================= 第二章 · 微光 ================= */
  c2_street: {
    view: 'street', danger: 2,
    lines: [
      '白天的街道，比夜晚更可怕。',
      '因為你終於能看清楚一切。',
      '翻倒的公車。燒黑的嬰兒車。滿地的鞋子，大多只剩一隻。',
      '路中央躺著一個男人，背對著你，肩膀一抽一抽的。',
      { t: '「救……救我……」', sfx: 'whisper' }
    ],
    figures: [{ x: .5, y: .76, h: .14, lying: true, mimic: true }],
    clues: [
      { x: .53, y: .82, draw: 'shadowWrong', text: '太陽在你背後，所有東西的影子都往前倒……只有他的影子，朝著你。' }
    ],
    options: [
      { label: '過去看看他是否還活著', death: '他轉過頭。脖子轉了一整圈，臉上掛著的，是你的笑容。', rule: '影子不會說謊。' },
      { label: '貼著牆，繞過去', next: 'c2_market' }
    ]
  },

  c2_market: {
    view: 'market', danger: 3,
    lines: [
      '超市的鐵捲門拉起一半。裡面一片漆黑。',
      '你彎腰鑽了進去。',
      '貨架深處，有另一道手電筒的光在晃。',
      '「別過來！」一個女人喊，「你……你被咬了嗎？你是人嗎？」'
    ],
    figures: [{ x: .6, y: .7, h: .34, holdsLight: true, shake: true, nurse: true, cloth: '#8a9696' }],
    clues: [
      { x: .66, y: .48, text: '她的手電筒抖得很厲害。她在害怕。' },
      { x: .45, y: .86, draw: 'kit', text: '她腳邊有一個打開的急救包，紗布用掉了一半。' }
    ],
    options: [
      { label: '舉起雙手：「我沒被咬，我是人。」', next: 'c2_lin_test' },
      { label: '關掉手電筒，躲進貨架之間', death: '你關掉了燈。黑暗裡，不只有你在躲。一隻冰冷的手，從貨架底下抓住了你的腳踝。', rule: '它們不會害怕，也從不提問。會害怕的，才是人。' }
    ]
  },

  c2_lin_test: {
    view: 'market', danger: 3,
    lines: [
      '她舉著一把手術刀，慢慢走近。是個穿著護士服的女人，臉上全是乾掉的血。',
      '「我見過它們假裝成人。」她的聲音在抖。',
      '「回答我。今天是幾月幾號？」'
    ],
    figures: [{ x: .55, y: .84, h: .5, holdsLight: true, shake: true, nurse: true, cloth: '#8a9696' }],
    clues: [
      { x: .5, y: .5, draw: 'badge', text: '她胸前的名牌：「林嵐／急診室護理師」' }
    ],
    options: [
      { label: '「十一月八日。」', death: '她沒有猶豫。手術刀刺進你的喉嚨。「它們……永遠記錯日子。」她哭著說。', rule: '記住收音機說的日期。' },
      { label: '「十一月九日。收音機說的。」', next: 'c2_lin' }
    ]
  },

  c2_lin: {
    view: 'market', danger: 0,
    lines: [
      '她盯著你看了很久。然後，手術刀掉在地上。',
      '她整個人癱坐下來，捂著臉哭了。',
      '「對不起……我已經三天沒跟活人說過話了。」',
      '「我叫林嵐，是護士。」她把急救包塞進你懷裡，「你需要我。」'
    ],
    figures: [{ x: .55, y: .86, h: .3, seated: false, nurse: true, cloth: '#8a9696' }],
    options: [{ label: '握住她的手', next: 'c2_kid', effects: { join: 'lin', meds: 1 } }]
  },

  c2_kid: {
    view: 'market', freezer: true, tallShelf: true, danger: 3,
    lines: [
      '就在這時，超市深處傳來兩個聲音——',
      { t: '左邊的冷凍櫃後面：「救命……我的腳卡住了……」', sfx: 'whisper' },
      { t: '右邊的貨架頂上：「救命……我的腳卡住了……」', sfx: 'whisper' },
      '一模一樣的聲音。一模一樣的話。'
    ],
    hints: { lin: '「真正受傷的人會留下痕跡。用你的手電筒找找。」' },
    clues: [
      { x: .22, y: .88, draw: 'blood', text: '冷凍櫃前有一道拖行的血跡，旁邊掉了一隻運動鞋。' },
      { x: .8, y: .17, draw: 'claws', text: '右邊貨架頂端離地三公尺。上面沒有腳印，只有幾道很深的爪痕。' }
    ],
    options: [
      { label: '走向左邊的冷凍櫃', next: 'c2_zhe' },
      { label: '爬上右邊的貨架', death: '你抬起頭。它不在貨架上。它在天花板上，倒掛著，對你張開了嘴。', rule: '真正的傷口，會流血。' }
    ]
  },

  c2_zhe: {
    view: 'market', freezer: true, danger: 0,
    lines: [
      '冷凍櫃後面，一個少年被倒下的鐵架壓住了腿。',
      '你和林嵐合力把鐵架抬開。',
      '「我叫阿哲……」他咬著牙說，「右邊那個東西……學我說話，學了一整晚。」',
      '林嵐檢查他的腿：「骨頭沒斷，但傷口很深。回去之後需要藥。」'
    ],
    options: [{ label: '扶他起來', next: 'c2_counter', effects: { join: 'zhe', injured: true } }]
  },

  c2_counter: {
    view: 'counter', danger: 3, timer: 9,
    timeoutDeath: '「……九十九……一百。」你猶豫太久了。它轉過身，準確地看著你藏身的地方。',
    lines: [
      '收銀台上，有一整箱還沒開過的罐頭。',
      '但旁邊站著一個穿店員制服的人，臉貼著牆，一動也不動。',
      { t: '它在小聲數數。「……八十七……八十八……」', sfx: 'whisper' }
    ],
    figures: [{ x: .66, y: .82, h: .44, mimic: true, facingAway: true, noGlimpse: true, cloth: '#5a2a2a' }],
    hints: { zhe: '「它數數的時候不會轉頭。我躲了一整晚，我知道。」' },
    clues: [
      { x: .66, y: .3, draw: 'tally', text: '牆上用指甲刻著「98、99、100」……下面是一大片噴濺的血。' }
    ],
    options: [
      { label: '趁它還在數，悄悄拿走罐頭', next: 'c2_car', effects: { food: 4 } },
      { label: '等它數完、走開，再拿', death: '「……九十九……一百。」它轉過身。準確地，看著你藏身的地方。', rule: '它數完的時候，就是來找你的時候。' }
    ]
  },

  c2_car: {
    view: 'car', danger: 3,
    lines: [
      '回程的路上，天黑了。',
      { t: '一輛轎車的車燈突然亮起，刺得你睜不開眼。', sfx: 'engine' },
      '駕駛座上的男人拚命朝你們揮手：「上車！快上車！它們來了！」',
      { t: '遠處，確實傳來了奔跑的腳步聲。', sfx: 'steps' }
    ],
    figures: [{ x: .43, y: .6, h: .14, inCar: true, mimic: true, noGlimpse: true }],
    hints: { lin: '「等一下……你有看到他的嘴在動嗎？」' },
    clues: [
      { x: .43, y: .47, text: '他在大喊……但他的嘴唇完全沒動。聲音是從後座傳出來的。' },
      { x: .56, y: .49, draw: 'faces', text: '後座擠滿了人。全都轉過頭來，對著你笑。' }
    ],
    options: [
      { label: '帶著大家上車', death: '車門「喀」的一聲全部鎖上。後座的笑聲越來越近、越來越近。', rule: '看清楚，是誰在說話。' },
      { label: '拒絕，鑽進旁邊的小巷', next: 'c2_alley' }
    ]
  },

  c2_alley: {
    view: 'alley', danger: 4, timer: 7,
    timeoutDeath: '你停下了腳步。它也停了。然後……它不再需要停了。',
    lines: [
      '小巷很窄，兩邊的牆幾乎貼著肩膀。巷子盡頭，是庇護所的燈光。',
      { t: '身後傳來腳步聲。', sfx: 'steps' },
      '跟著你們的節奏。你停，它就停。你走，它就走。',
      { t: '它越來越近了。你甚至感覺得到，脖子後面……有呼吸。', sfx: 'groan' }
    ],
    hints: { zhe: '「別回頭！它們只追看得見它的人！」', lin: '（林嵐握緊你的手，手心全是汗。）' },
    clues: [
      { x: .5, y: .7, text: '地上有一道影子，從你的腳後跟往前延伸……一直在變長。' }
    ],
    options: [
      { label: '猛然回頭，用手電筒照它', death: '你看見它了。所以，它也看見你了。', rule: '有些東西，看見了就是死。' },
      { label: '不回頭，數著步伐往前走', next: 'c2_home' }
    ]
  },

  c2_home: {
    view: 'basement', lit: true, ambient: .8, danger: 4,
    lines: [
      '你們終於回到地下室。',
      '燈泡還亮著。跟你離開時一樣。',
      '但床邊……站著一個人。',
      { t: '它抬起頭。那是你的臉。', sfx: 'sting' },
      '「你終於回來了。」它用你的聲音說，「他們是誰？」',
      '林嵐的手術刀在你們兩個之間來回移動：「哪……哪個才是真的？」'
    ],
    figures: [{ x: .2, y: .86, h: .42, mimic: true, yourFace: true, holeEyes: true, noGlimpse: true }],
    hints: { lin: '「說點只有人才知道的事……什麼都好！」', zhe: '「別靠近它！」' },
    clues: [
      { x: .2, y: .5, text: '燈光照在它的眼睛上，沒有任何反光。像兩個洞。' }
    ],
    options: [
      { label: '撲上去，跟它拚了', death: '你撲上去，和它扭打成一團。林嵐分不清誰是誰。她選了一個。她選錯了。', rule: '在別人眼中，你也可能是它。' },
      { label: '「林嵐，問我們今天的日期。」', next: 'c2_end' }
    ]
  },

  c2_end: {
    view: 'basement', lit: true, ambient: .55, danger: 0, warm: true,
    lines: [
      '林嵐愣了一下，咬著牙問：「今天……幾號？」',
      '「十一月九日。」你說。',
      { t: '「十一月八日。」它說。', sfx: 'glitch' },
      '手術刀劃過的聲音很輕。那個東西倒下時，臉像蠟一樣融化了。',
      '阿哲吐了。林嵐跪在地上哭了很久。',
      { t: '你把燈泡擰得更亮一點。', sfx: 'warm' },
      '「從今天起，」你說，「這裡就是我們的庇護所。」'
    ],
    options: [{ label: '……我們活過了今天', next: '@end' }]
  }
};
