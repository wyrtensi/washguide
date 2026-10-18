// UI strings and machine localisation. Russian is the source language of the data; English comes
// from each machine's optional `en` block and falls back to Russian field by field.

export const LANGS = ['ru', 'en'];

const ruPlural = (n, one, few, many) => {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
};
const enPlural = (n, one, many) => (n === 1 ? one : many);
const num = (lang, v) => (lang === 'ru' ? String(v).replace('.', ',') : String(v));

export const T = {
  ru: {
    locale: 'ru-RU',
    siteName: 'Старая стиралка',
    tagline: 'Как пользоваться старыми стиральными машинами с непонятной панелью',
    homeDesc: 'Как пользоваться старой стиральной машиной с механическим таймером: панель как на вашей модели, куда ставить ручки, сколько идёт стирка и куда сыпать порошок.',
    min: m => `${m} мин`,
    hm: (h, m) => (m ? `${h} ч ${m} мин` : `${h} ч`),
    num: v => num('ru', v),
    // engine
    symbolNames: {
      power: 'питание', 'half-load': 'половинная загрузка', 'water-stop': 'остановка с водой', 'no-spin': 'без отжима',
      spin: 'отжим', rinse: 'полоскание', 'extra-rinse': 'дополнительное полоскание', prewash: 'предварительная стирка',
      eco: 'экономия', intensive: 'интенсивная стирка', start: 'старт', drain: 'слив', delicate: 'деликатная', wool: 'шерсть'
    },
    end: { stop: 'Остановится сама и сольёт воду', 'water-stop': 'Остановится с водой в баке', drain: 'Сольёт воду и остановится' },
    phase: { heat: 'Нагрев', prewash: 'Предстирка', wash: 'Стирка', rinse: 'Полоскания', softener: 'Кондиционер', spin: 'Отжим', drain: 'Слив', soak: 'Замачивание', pause: 'Пауза' },
    cStop: 'Ручка программ стоит на точке стопа: машина ничего не будет делать. Поверните её на номер программы.',
    cNoHeat: 'Эта программа не греет воду: ручка температуры ни на что не влияет.',
    cTempMax: (p, max, t) => `Для программы ${p} не выше ${max} °C, выбрано ${t} °C.`,
    cNoSpin: 'Программа не отжимает: ручка отжима ни на что не влияет.',
    cSpinMax: (max, r) => `Для этой ткани отжим не выше ${max} об/мин, выбрано ${r}.`,
    cOption: b => `Кнопка «${b}» с этой программой не используется.`,
    cNoData: 'Для этого положения нет данных о программе.',
    cNoHeatHere: 'На этом участке цикла вода не нагревается: температура не влияет.',
    pressed: 'нажата', released: 'отжата',
    fPrograms: n => `${n} ${ruPlural(n, 'программа', 'программы', 'программ')}`,
    fKnobs: n => `${n} ${ruPlural(n, 'ручка', 'ручки', 'ручек')}`,
    fButtons: n => `${n} ${ruPlural(n, 'кнопка', 'кнопки', 'кнопок')}`,
    fCw: 'ручка только по часовой', fWaterStop: 'остановка с водой', fDigits: 'программы цифрами', fLetters: 'программы буквами',
    fTop: 'вертикальная загрузка', fFront: 'фронтальная загрузка', fKg: v => `до ${num('ru', v)} кг`, fRpm: v => `${v} об/мин`,
    // render
    use: { prewash: 'Предстирка', main: 'Основная стирка', softener: 'Кондиционер', bleach: 'Отбеливатель', starch: 'Крахмал' },
    marks: { flower: 'цветок', 'triangle-cl': 'треугольник CL', asterisk: 'звёздочка' },
    slotNeeded: 'Нужно', slotEmpty: 'Пусто', trayFront: 'Ручка лотка — к вам',
    endChip: { stop: 'стоп', 'water-stop': 'с водой' },
    page: 'стр.', ok: 'Конфликтов нет: так можно запускать.',
    viaButton: '. Чтобы слить и отжать, отожмите кнопку остановки с водой.',
    contAfter: (spin, drain) => `. Чтобы продолжить: выключите машину, поверните ручку программ на ${spin}${drain ? ` (или ${drain} — только слив)` : ''} и включите снова.`,
    manual: (t, c) => `по инструкции: ${t}${c != null ? ` при ${c} °C` : ''}`,
    estimate: 'оценка',
    pathKnob: 'Путь ручки программ: от выбранной позиции до остановки',
    pathStages: 'Этапы программы (ручка во время стирки не поворачивается)',
    upToKg: v => `, до ${num('ru', v)} кг`,
    hOff: b => `Машина выключена (кнопка ${b} отжата).`, hPress: b => `Нажмите кнопку <b>${b}</b>.`,
    hKnob: (c, v, cw) => `Ручка <b>${c}</b> — на <b>${v}</b>${cw ? ' (только по часовой стрелке)' : ''}.`,
    hReleased: list => `Кнопки ${list} — отжаты.`, hTray: 'Лоток: ', hNoDet: 'Моющее средство не нужно.',
    hDoor: 'Закройте дверцу до щелчка.', hStart: b => `Нажмите <b>${b}</b>.`, hPower: b => `Нажмите <b>${b}</b> — машина стартует сразу.`,
    powerWord: 'питания', startWord: 'Старт',
    roleTitle: { program: 'Программа', temperature: 'Температура', spin: 'Отжим' }, buttons: 'Кнопки',
    // build
    controlName: { program: 'Ручка программ', temperature: 'Ручка температуры', spin: 'Ручка отжима', power: 'Кнопка питания', option: 'Кнопка', start: 'Кнопка старта', lamp: 'Лампа', other: 'Элемент' },
    allMachines: 'Все машины', toContent: 'К содержимому', searchPh: 'Найти машину: индезит, zanussi fl…',
    searchLabel: 'Поиск машины', themeLabel: 'Сменить тему', langLabel: 'English',
    footer: 'справочник по старым стиральным машинам с механическим таймером. Данные из инструкций производителей; оценки времени помечены.',
    privacy: 'Сайт не ставит cookie. Просмотры страниц считает наш собственный счётчик на нашем сервере, без сторонних сервисов; IP-адреса он не хранит. Сохраняются только страница, источник перехода, страна, браузер и система — всё это открыто: <a href="https://stats.wyrtensi.ru/">stats.wyrtensi.ru</a>.',
    forAgents: 'Для ИИ-агентов', dataJson: 'Данные (JSON)',
    heroTitle: 'Как включить старую стиральную машину',
    heroLead: 'Выберите свою модель: покажем панель такой, какая она у вас, куда ставить ручки для нужной стирки, сколько это займёт и куда сыпать порошок.',
    bigSearchPh: 'Марка или модель: Indesit WGS 834, Вятка, Zanussi…', all: 'Все', brandFilter: 'Фильтр по марке',
    empty: 'Ничего не нашлось. Попробуйте только марку или цифры модели.',
    howTitle: 'Как это работает',
    how: ['<b>Найдите модель</b> по надписи на панели или наклейке за дверцей.', '<b>Выберите задачу</b> — «обычная стирка», «только отжим», «шерсть» — или крутите ручки на рисунке сами.', '<b>Смотрите время и предупреждения</b>: что машина сделает, когда остановится и что с этой программой нельзя.'],
    groups: { wash: 'Стирка', rinse: 'Полоскание', spin: 'Отжим и слив', care: 'Уход' },
    partial: gaps => `<b>Данные неполные.</b> В найденной инструкции нет части сведений: ${gaps} Подробности — во вкладке «Источники».`,
    pitfalls: 'На что обратить внимание',
    step1: '1. Что нужно сделать?', taskType: 'Тип задачи', step2: '2. Панель машины', panelView: 'Вид панели',
    compact: 'Крупно', machine: 'Как на машине', panelHint: 'Нажимайте на цифры вокруг ручек и на кнопки — или выбирайте ниже.',
    step3: '3. Что будет', howStart: 'Как запустить', step4: '4. Лоток для моющих средств',
    trayHint: 'Вид спереди, слева направо. Подсвечены отсеки, из которых машина возьмёт средство на выбранной программе.',
    tabs: { programs: 'Все программы', controls: 'Что за кнопки', trouble: 'Неисправности', care: 'Уход', load: 'Вес белья', sources: 'Источники' },
    rowHint: 'Нажмите на строку, чтобы выставить программу на панели.',
    th: ['№', 'Программа', 'Темп.', 'Отжим', 'Лоток', 'Время', 'Конец'],
    upToC: v => `до ${v} °C`, noHeat: 'без нагрева', upTo: v => `до ${v}`, none: 'нет',
    atC: c => `при ${c} °C`, endsShort: { stop: 'сама', 'water-stop': 'с водой', drain: 'слив' },
    manualPage: p => `Инструкция, стр. ${p}`, careLocal: 'Отметки сохраняются только в этом браузере.', careDone: 'Сделано сегодня',
    careLast: d => `Последний раз: ${d}`, careNever: 'Ещё не отмечено',
    srcTitle: 'Откуда данные', srcNone: 'Источник не указан.', srcKind: { manufacturer: 'производитель', 'manual-archive': 'архив инструкций', photo: 'фото', forum: 'форум' },
    assumptions: 'Допущения', gaps: 'Чего нет в инструкции',
    timeNote: (l, inlet, w) => `Время — оценка по шагам командоаппарата и мощности ТЭНа: нагрев воды объёмом ${l} л от ${inlet} °C до выбранной температуры ТЭНом ${w}. Реальное время зависит от температуры воды в трубах, загрузки и напряжения в сети.`,
    heaterAssumed: '2000 Вт (мощность в инструкции не указана, взято типичное значение)', watt: w => `${w} Вт`,
    years: 'Годы', capacity: 'Загрузка', spinUpTo: 'Отжим до',
    pageTitle: t => `${t}: как пользоваться, программы, панель`,
    pageDesc: (t, s) => `${t}: ${s} Куда ставить ручки, сколько идёт стирка, куда сыпать порошок, что делать, если остановилась с водой.`,
    howToName: (t, p) => `Как запустить ${t}: ${p}`, washing: 'стирка', product: 'Стиральная машина',
    notFound: 'Такой страницы нет', toAll: 'Ко всем машинам',
    // app
    nothing: 'Ничего не нашлось',
    cwWarn: (a, b) => `На машине эта ручка крутится только по часовой: чтобы попасть с ${a} на ${b}, проведите её вперёд через точку стопа.`,
    offWarn: b => `Поворачивайте при выключенной кнопке ${b}.`,
    less: 'Меньше', more: 'Больше',
    loadHint: 'Вес сухих вещей примерный. Лимит берётся из выбранной программы.',
    loadEmpty: 'Добавьте вещи, чтобы посчитать вес сухого белья.',
    loadOver: kg => `Перегруз для текущей программы (до ${num('ru', kg)} кг). Разделите на две стирки.`,
    loadHalf: b => `Мало белья: можно нажать кнопку «${b}».`, loadOk: 'Загрузка в норме.', halfWord: 'половинная загрузка',
    of: 'из', kg: 'кг', g: 'г',
    items: ['Простыня', 'Пододеяльник', 'Наволочка', 'Рубашка, футболка', 'Джинсы, брюки', 'Пижама', 'Банное полотенце', 'Полотенце для рук', 'Махровый халат', 'Свитер', 'Куртка', 'Скатерть']
  },
  en: {
    locale: 'en-GB',
    siteName: 'Old Washer Guide',
    tagline: 'How to use old washing machines with confusing control panels',
    homeDesc: 'How to use an old washing machine with a mechanical timer: the panel as on your model, where to set the knobs, how long a wash takes and where the detergent goes.',
    min: m => `${m} min`,
    hm: (h, m) => (m ? `${h} h ${m} min` : `${h} h`),
    num: v => num('en', v),
    symbolNames: {
      power: 'power', 'half-load': 'half load', 'water-stop': 'rinse hold', 'no-spin': 'no spin',
      spin: 'spin', rinse: 'rinse', 'extra-rinse': 'extra rinse', prewash: 'prewash',
      eco: 'economy', intensive: 'intensive', start: 'start', drain: 'drain', delicate: 'delicate', wool: 'wool'
    },
    end: { stop: 'Stops by itself and drains', 'water-stop': 'Stops with water in the drum', drain: 'Drains and stops' },
    phase: { heat: 'Heating', prewash: 'Prewash', wash: 'Wash', rinse: 'Rinses', softener: 'Softener', spin: 'Spin', drain: 'Drain', soak: 'Soak', pause: 'Pause' },
    cStop: 'The programme knob is on a stop mark: the machine will do nothing. Turn it to a programme.',
    cNoHeat: 'This programme does not heat water: the temperature knob has no effect.',
    cTempMax: (p, max, t) => `Programme ${p} allows up to ${max} °C; ${t} °C is selected.`,
    cNoSpin: 'This programme does not spin: the spin knob has no effect.',
    cSpinMax: (max, r) => `This fabric allows up to ${max} rpm; ${r} is selected.`,
    cOption: b => `The "${b}" button is not used with this programme.`,
    cNoData: 'No programme data for this position.',
    cNoHeatHere: 'Water is not heated on this part of the cycle: the temperature has no effect.',
    pressed: 'pressed', released: 'released',
    fPrograms: n => `${n} ${enPlural(n, 'programme', 'programmes')}`,
    fKnobs: n => `${n} ${enPlural(n, 'knob', 'knobs')}`,
    fButtons: n => `${n} ${enPlural(n, 'button', 'buttons')}`,
    fCw: 'clockwise-only dial', fWaterStop: 'rinse hold', fDigits: 'numbered programmes', fLetters: 'lettered programmes',
    fTop: 'top loader', fFront: 'front loader', fKg: v => `up to ${v} kg`, fRpm: v => `${v} rpm`,
    use: { prewash: 'Prewash', main: 'Main wash', softener: 'Softener', bleach: 'Bleach', starch: 'Starch' },
    marks: { flower: 'flower', 'triangle-cl': 'CL triangle', asterisk: 'asterisk' },
    slotNeeded: 'Needed', slotEmpty: 'Empty', trayFront: 'Drawer handle — towards you',
    endChip: { stop: 'stop', 'water-stop': 'water' },
    page: 'p.', ok: 'No conflicts: safe to run like this.',
    viaButton: '. To drain and spin, release the rinse-hold button.',
    contAfter: (spin, drain) => `. To continue: switch off, turn the programme knob to ${spin}${drain ? ` (or ${drain} to drain only)` : ''} and switch on again.`,
    manual: (t, c) => `manual: ${t}${c != null ? ` at ${c} °C` : ''}`,
    estimate: 'estimate',
    pathKnob: 'Programme knob path: from the selected position to the stop',
    pathStages: 'Programme stages (the knob does not turn during the wash)',
    upToKg: v => `, up to ${v} kg`,
    hOff: b => `Machine switched off (${b} button released).`, hPress: b => `Press the <b>${b}</b> button.`,
    hKnob: (c, v, cw) => `Knob <b>${c}</b> to <b>${v}</b>${cw ? ' (clockwise only)' : ''}.`,
    hReleased: list => `Buttons ${list} released.`, hTray: 'Drawer: ', hNoDet: 'No detergent needed.',
    hDoor: 'Close the door until it clicks.', hStart: b => `Press <b>${b}</b>.`, hPower: b => `Press <b>${b}</b> — the machine starts at once.`,
    powerWord: 'power', startWord: 'Start',
    roleTitle: { program: 'Programme', temperature: 'Temperature', spin: 'Spin' }, buttons: 'Buttons',
    controlName: { program: 'Programme knob', temperature: 'Temperature knob', spin: 'Spin knob', power: 'Power button', option: 'Button', start: 'Start button', lamp: 'Lamp', other: 'Control' },
    allMachines: 'All machines', toContent: 'Skip to content', searchPh: 'Find a machine: indesit, zanussi fl…',
    searchLabel: 'Search machines', themeLabel: 'Toggle theme', langLabel: 'Русский',
    footer: 'a reference for old washing machines with mechanical timers. Data from manufacturer manuals; time estimates are marked.',
    privacy: 'This site sets no cookies. Page views are counted by our own counter on our own server, with no third-party services; it does not store IP addresses. Only the page, the referrer, the country, the browser and the system are kept, and all of it is public: <a href="https://stats.wyrtensi.ru/">stats.wyrtensi.ru</a>.',
    forAgents: 'For AI agents', dataJson: 'Data (JSON)',
    heroTitle: 'How to work an old washing machine',
    heroLead: 'Pick your model: see the panel as it looks on your machine, where to set the knobs for the wash you need, how long it takes and where the detergent goes.',
    bigSearchPh: 'Brand or model: Indesit WGS 834, Zanussi, Bosch…', all: 'All', brandFilter: 'Filter by brand',
    empty: 'Nothing found. Try just the brand or the model digits.',
    howTitle: 'How it works',
    how: ['<b>Find your model</b> from the panel lettering or the sticker behind the door.', '<b>Pick a task</b> — "everyday wash", "spin only", "wool" — or turn the knobs on the drawing yourself.', '<b>Check the time and warnings</b>: what the machine will do, when it stops and what this programme does not allow.'],
    groups: { wash: 'Wash', rinse: 'Rinse', spin: 'Spin and drain', care: 'Care' },
    partial: gaps => `<b>Incomplete data.</b> The manual found lacks some information: ${gaps} See the Sources tab for details.`,
    pitfalls: 'Watch out for',
    step1: '1. What do you need?', taskType: 'Task type', step2: '2. Machine panel', panelView: 'Panel view',
    compact: 'Large', machine: 'As on the machine', panelHint: 'Tap the marks around the knobs and the buttons — or choose below.',
    step3: '3. What happens', howStart: 'How to start', step4: '4. Detergent drawer',
    trayHint: 'Front view, left to right. Highlighted compartments are the ones the machine takes detergent from on this programme.',
    tabs: { programs: 'All programmes', controls: 'Controls explained', trouble: 'Troubleshooting', care: 'Care', load: 'Load weight', sources: 'Sources' },
    rowHint: 'Tap a row to set that programme on the panel.',
    th: ['No.', 'Programme', 'Temp.', 'Spin', 'Drawer', 'Time', 'End'],
    upToC: v => `up to ${v} °C`, noHeat: 'no heating', upTo: v => `up to ${v}`, none: 'none',
    atC: c => `at ${c} °C`, endsShort: { stop: 'by itself', 'water-stop': 'with water', drain: 'drain' },
    manualPage: p => `Manual, p. ${p}`, careLocal: 'Marks are stored in this browser only.', careDone: 'Done today',
    careLast: d => `Last done: ${d}`, careNever: 'Not marked yet',
    srcTitle: 'Where the data comes from', srcNone: 'No source given.', srcKind: { manufacturer: 'manufacturer', 'manual-archive': 'manual archive', photo: 'photo', forum: 'forum' },
    assumptions: 'Assumptions', gaps: 'Not in the manual',
    timeNote: (l, inlet, w) => `Time is an estimate from the timer steps and heater power: heating ${l} l of water from ${inlet} °C to the selected temperature with a ${w} heater. Real time depends on tap water temperature, load and mains voltage.`,
    heaterAssumed: '2000 W (not stated in the manual, typical value used)', watt: w => `${w} W`,
    years: 'Years', capacity: 'Load', spinUpTo: 'Spin up to',
    pageTitle: t => `${t}: how to use it, programmes, panel`,
    pageDesc: (t, s) => `${t}: ${s} Where to set the knobs, how long a wash takes, where the detergent goes, what to do if it stops with water.`,
    howToName: (t, p) => `How to start the ${t}: ${p}`, washing: 'wash', product: 'Washing machine',
    notFound: 'Page not found', toAll: 'To all machines',
    nothing: 'Nothing found',
    cwWarn: (a, b) => `On the machine this knob turns clockwise only: to get from ${a} to ${b}, turn it forward past the stop mark.`,
    offWarn: b => `Turn it with the ${b} button released.`,
    less: 'Less', more: 'More',
    loadHint: 'Dry weights are approximate. The limit comes from the selected programme.',
    loadEmpty: 'Add items to estimate the dry laundry weight.',
    loadOver: kg => `Overloaded for this programme (up to ${kg} kg). Split into two washes.`,
    loadHalf: b => `Small load: you can press "${b}".`, loadOk: 'Load is fine.', halfWord: 'half load',
    of: 'of', kg: 'kg', g: 'g',
    items: ['Sheet', 'Duvet cover', 'Pillowcase', 'Shirt, T-shirt', 'Jeans, trousers', 'Pyjamas', 'Bath towel', 'Hand towel', 'Bathrobe', 'Jumper', 'Jacket', 'Tablecloth']
  }
};

export function L(m) {
  return T[(m && m._lang) || 'ru'];
}

// Deep copy of the machine with English overrides applied. Russian stays where `en` is silent.
export function localize(m, lang) {
  const out = JSON.parse(JSON.stringify(m));
  delete out.en;
  out._lang = lang;
  if (lang === 'ru' || !m.en) return out;
  const en = m.en;
  for (const k of ['summary', 'years']) if (en[k]) out[k] = en[k];
  if (Array.isArray(en.pitfalls) && en.pitfalls.length === (m.pitfalls || []).length) out.pitfalls = en.pitfalls;
  for (const c of out.panel.controls) {
    const e = en.controls?.[c.id];
    if (!e) continue;
    for (const k of ['help', 'name', 'label']) if (e[k]) c[k] = e[k];
    if (e.zones && c.zones) for (const z of c.zones) if (e.zones[z.id]) z.label = e.zones[z.id];
    if (e.positions && c.positions) for (const p of c.positions) if (e.positions[p.value]) p.label = e.positions[p.value];
  }
  if (out.tray && en.tray) {
    if (en.tray.help) out.tray.help = en.tray.help;
    for (const c of out.tray.compartments) if (en.tray.compartments?.[c.id]) c.label = en.tray.compartments[c.id];
  }
  for (const p of out.programs) {
    const e = en.programs?.[p.pos];
    if (e?.name) p.name = e.name;
    if (e?.note) p.note = e.note;
  }
  (out.rules || []).forEach((r, i) => { if (en.rules?.[i]) r.message = en.rules[i]; });
  for (const p of out.presets || []) {
    const e = en.presets?.[p.id];
    if (!e) continue;
    if (e.title) p.title = e.title;
    if (e.note) p.note = e.note;
    if (e.dose) p.dose = { ...p.dose, ...e.dose };
  }
  (out.troubleshooting || []).forEach((t, i) => {
    const e = en.troubleshooting?.[i];
    if (e?.title) t.title = e.title;
    if (e?.causes?.length === t.causes.length) t.causes = e.causes;
  });
  (out.care || []).forEach((c, i) => {
    const e = en.care?.[i];
    if (e) for (const k of ['title', 'text', 'interval']) if (e[k]) c[k] = e[k];
  });
  if (en.notes && out.notes) for (const k of ['assumptions', 'gaps']) if (en.notes[k]?.length) out.notes[k] = en.notes[k];
  (out.sources || []).forEach((s, i) => { if (en.sources?.[i]) s.title = en.sources[i]; });
  return out;
}
