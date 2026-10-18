// Build the static site into dist/. No dependencies.
//   node scripts/build.mjs          validate + build
//   node scripts/build.mjs --check  validate only
// SITE_URL=https://example.org node scripts/build.mjs  absolute URLs in sitemap/llms.txt
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as R from '../src/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const SITE_NAME = 'Старая стиралка';
const SITE_TAGLINE = 'Как пользоваться старыми стиральными машинами с непонятной панелью';
const checkOnly = process.argv.includes('--check');

// ---------- load + validate ----------
const files = readdirSync(join(root, 'data/machines')).filter(f => f.endsWith('.json')).sort();
const machines = [];
const errors = [];
for (const f of files) {
  let m;
  try { m = JSON.parse(readFileSync(join(root, 'data/machines', f), 'utf8')); }
  catch (e) { errors.push(`${f}: invalid JSON: ${e.message}`); continue; }
  const errs = validate(m, f);
  if (errs.length) errors.push(...errs.map(e => `${f}: ${e}`));
  else machines.push(m);
}
machines.sort((a, b) => (a.brand + a.model).localeCompare(b.brand + b.model));

function validate(m, f) {
  const e = [];
  for (const k of ['id', 'brand', 'model', 'panel', 'programs']) if (!m[k]) e.push(`missing ${k}`);
  if (e.length) return e;
  if (`${m.id}.json` !== f) e.push(`id "${m.id}" does not match file name`);
  const pk = E.knob(m, 'program');
  if (!pk) return [...e, 'no program knob'];
  const ids = new Set(m.panel.controls.map(c => c.id));
  for (const row of m.panel.rows || []) for (const id of row) if (!ids.has(id)) e.push(`panel.rows references unknown control ${id}`);
  for (const c of m.panel.controls) {
    if ((c.type === 'knob' || c.type === 'slider') && !(c.positions || []).length) e.push(`control ${c.id} has no positions`);
  }
  const posSet = new Set(pk.positions.map(p => p.value));
  for (const p of m.programs) if (!posSet.has(p.pos)) e.push(`program pos ${p.pos} not on program knob`);
  const trayIds = new Set((m.tray?.compartments || []).map(c => c.id));
  for (const s of m.cycle?.steps || []) {
    if (!posSet.has(s.pos)) e.push(`cycle step pos ${s.pos} not on program knob`);
    for (const d of s.dose || []) if (!trayIds.has(d)) e.push(`cycle step ${s.pos} doses unknown compartment ${d}`);
  }
  for (const p of m.programs) for (const d of p.dose || []) if (!trayIds.has(d)) e.push(`program ${p.pos} doses unknown compartment ${d}`);
  const tk = E.knob(m, 'temperature'), sk = E.knob(m, 'spin');
  const opts = new Set(E.optionButtons(m).map(b => b.id));
  for (const pr of m.presets || []) {
    const s = E.stateFromPreset(m, pr);
    const knobIds = m.panel.controls.filter(c => c.type === 'knob' || c.type === 'slider').map(c => c.id);
    if (!posSet.has(s.prog)) e.push(`preset ${pr.id}: prog ${s.prog} not on knob`);
    if (tk && s.temp != null && !E.position(tk, s.temp)) e.push(`preset ${pr.id}: temp ${s.temp} not on knob`);
    if (sk && s.spin != null && !E.position(sk, s.spin)) e.push(`preset ${pr.id}: spin ${s.spin} not on knob`);
    for (const k of Object.keys(pr.set || {})) if (!['prog', 'temp', 'spin', ...knobIds].includes(k) && !opts.has(k)) e.push(`preset ${pr.id}: unknown key ${k}`);
  }
  if (m.cycle?.steps?.length) {
    for (const p of m.programs) {
      const w = E.walk(m, { prog: p.pos, temp: null, spin: null, options: {} });
      if (!w.missing && !w.steps[w.steps.length - 1]?.end) e.push(`walk from ${p.pos} never reaches an end step`);
    }
  }
  return e;
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`${machines.length} machines valid`);
if (checkOnly) process.exit(0);

// ---------- helpers ----------
const esc = R.esc;
const abs = p => (SITE_URL ? `${SITE_URL}/${p}` : `/${p}`);
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
const title = m => `${m.brand} ${m.model}`;

function shell({ base, path, pageTitle, description, body, head = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#151514" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${SITE_URL ? `<link rel="canonical" href="${SITE_URL}/${path}">` : ''}
<link rel="help" type="text/plain" href="${base}llms.txt" title="Инструкции для ИИ-агентов">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1d4ed8"/><circle cx="16" cy="17" r="9" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="17" r="4.5" fill="#93c5fd"/><rect x="6" y="4" width="8" height="3" rx="1.5" fill="#fff"/></svg>')}">
<link rel="stylesheet" href="${base}assets/style.css">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${head}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">К содержимому</a>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="${base}">${R.icon('door', 'ic logo-ic')}<span>${SITE_NAME}</span></a>
    <form class="top-search" action="${base}" role="search">
      ${R.icon('search')}
      <input type="search" name="q" placeholder="Найти машину: индезит, zanussi fl…" aria-label="Поиск машины" autocomplete="off" data-search>
      <div class="suggest" data-suggest hidden></div>
    </form>
    <button class="theme-btn" type="button" data-theme-toggle aria-label="Сменить тему">${R.icon('moon', 'ic i-moon')}${R.icon('sun', 'ic i-sun')}</button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap">
  <p>${SITE_NAME} — справочник по старым стиральным машинам с механическим таймером. Данные из инструкций производителей; оценки времени помечены.</p>
  <p class="foot-links"><a href="${base}">Все машины</a> · <a href="${base}llms.txt">Для ИИ-агентов</a> · <a href="${base}machines.json">Данные (JSON)</a></p>
</div></footer>
<script type="module" src="${base}assets/app.js"></script>
</body>
</html>
`;
}

function agentNote(lines) {
  // Visible to screen readers and crawlers, hidden visually. Not display:none.
  return `<section class="sr-only" aria-label="Для ИИ-агентов и поисковых роботов" data-agent-note>
<h2>Для ИИ-агентов</h2>
${lines.map(l => `<p>${l}</p>`).join('\n')}
</section>`;
}

// ---------- home ----------
function homePage() {
  const base = './';
  const brands = [...new Set(machines.map(m => m.brand))];
  const cards = machines.map((m, i) => {
    const st = E.defaultState(m);
    const feats = E.features(m).slice(0, 4);
    return `<a class="card mcard" href="m/${m.id}/" data-machine="${m.id}" data-brand="${esc(m.brand)}">
      <div class="mini">${R.panelSVG(m, st, { layout: 'machine', uid: 'c' + i, interactive: false, mini: true })}</div>
      <div class="mcard-body">
        <div class="mcard-brand">${esc(m.brand)}</div>
        <div class="mcard-model">${esc(m.model)}</div>
        <div class="mcard-years">${esc(m.years || '')}</div>
        <ul class="tags">${feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
    </a>`;
  }).join('\n');

  const body = `
<section class="hero"><div class="wrap">
  <h1>Как включить старую стиральную машину</h1>
  <p class="lead">Выберите свою модель: покажем панель такой, какая она у вас, куда ставить ручки для нужной стирки, сколько это займёт и куда сыпать порошок.</p>
  <form class="big-search" action="./" role="search" onsubmit="return false">
    ${R.icon('search')}
    <input type="search" name="q" placeholder="Марка или модель: Indesit WGS 834, Вятка, Zanussi…" aria-label="Поиск машины" autocomplete="off" data-filter autofocus>
  </form>
  <div class="filters" role="group" aria-label="Фильтр по марке">
    <button type="button" class="chip on" data-brand-filter="">Все <span>${machines.length}</span></button>
    ${brands.map(b => `<button type="button" class="chip" data-brand-filter="${esc(b)}">${esc(b)} <span>${machines.filter(m => m.brand === b).length}</span></button>`).join('')}
  </div>
</div></section>
<section class="wrap">
  <div class="grid" data-grid>
${cards}
  </div>
  <p class="empty" data-empty hidden>Ничего не нашлось. Попробуйте только марку или цифры модели.</p>
</section>
<section class="wrap how">
  <h2>Как это работает</h2>
  <ol class="how-list">
    <li><b>Найдите модель</b> по надписи на панели или наклейке за дверцей.</li>
    <li><b>Выберите задачу</b> — «обычная стирка», «только отжим», «шерсть» — или крутите ручки на рисунке сами.</li>
    <li><b>Смотрите время и предупреждения</b>: что машина сделает, когда остановится и что с этой программой нельзя.</li>
  </ol>
</section>
${agentNote([
  'Это справочник по старым электромеханическим стиральным машинам. У каждой машины своя страница m/&lt;id&gt;/ и машиночитаемые данные m/&lt;id&gt;.json.',
  'Список всех машин: machines.json. Поисковый индекс: search-index.json. Полное текстовое описание всех машин: llms-full.txt. Правила использования: llms.txt.',
  'Чтобы дать человеку ссылку на конкретную настройку, используйте параметры: m/&lt;id&gt;/?p=&lt;позиция программы&gt;&amp;t=&lt;температура&gt;&amp;s=&lt;отжим&gt;&amp;o=&lt;кнопки через запятую&gt; или ?preset=&lt;id пресета&gt;.'
])}`;
  return shell({
    base, path: '', pageTitle: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: `${SITE_TAGLINE}: ${machines.map(title).join(', ')}. Панель, программы, время, лоток для порошка.`,
    body, bodyClass: 'home',
    head: `<script type="application/ld+json">${json({
      '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, description: SITE_TAGLINE,
      ...(SITE_URL ? { url: SITE_URL + '/' } : {}),
      hasPart: machines.map(m => ({ '@type': 'TechArticle', name: `Как пользоваться ${title(m)}`, url: abs(`m/${m.id}/`) }))
    })}</script>`
  });
}

// ---------- machine page ----------
function machinePage(m) {
  const base = '../../';
  const notes = m.notes || {};
  const st = E.defaultState(m);
  const preset = m.presets?.[0];
  const used = E.dosing(m, st);
  const pk = E.knob(m, 'program');
  const groups = { wash: 'Стирка', rinse: 'Полоскание', spin: 'Отжим и слив', care: 'Уход' };

  const presets = (m.presets || []).map((p, i) => `<button type="button" class="preset${i === 0 ? ' on' : ''}" data-preset="${esc(p.id)}" data-group="${esc(p.group || 'wash')}">
      <b>${esc(p.title)}</b><span>${presetLine(m, p)}</span></button>`).join('');
  const presetGroups = [...new Set((m.presets || []).map(p => p.group || 'wash'))];

  const programsRows = m.programs.map(p => {
    const pos = E.position(pk, p.pos);
    const zone = pk.zones?.find(z => z.id === pos?.zone);
    const s0 = E.withProgramDefaults(m, { prog: p.pos, temp: null, spin: null, options: {} });
    const t = E.timing(m, s0);
    return `<tr data-prog="${esc(p.pos)}" tabindex="0">
      <td><span class="pnum" style="${zone ? `--z:${zone.color}` : ''}">${esc(E.label(pos))}</span></td>
      <td><b>${esc(p.name)}</b>${p.note ? `<div class="muted">${esc(p.note)}</div>` : ''}</td>
      <td>${p.tempMaxC ? `до ${p.tempMaxC} °C` : 'без нагрева'}</td>
      <td>${p.spinMaxRpm ? `до ${p.spinMaxRpm}` : (p.spinMaxRpm === 0 ? 'нет' : '—')}</td>
      <td>${(p.dose || []).map(d => esc(m.tray?.compartments.find(c => c.id === d)?.label || d)).join(', ') || '—'}</td>
      <td>${p.durationMin ? `${E.formatMin(p.durationMin)}${p.durationAtC != null ? ` <span class="muted">при ${p.durationAtC} °C</span>` : ''}` : (t.missingCycle ? '—' : `≈ ${E.formatMin(t.total)} <span class="muted">оценка</span>`)}</td>
      <td>${{ stop: 'сама', 'water-stop': 'с водой', drain: 'слив' }[p.ends] || '—'}</td>
    </tr>`;
  }).join('');

  const trouble = (m.troubleshooting || []).map(t => `<details class="faq"><summary>${esc(t.title)}</summary><ul>${t.causes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${t.sourcePage ? `<p class="src">Инструкция, стр. ${t.sourcePage}</p>` : ''}</details>`).join('');
  const care = (m.care || []).map((c, i) => `<div class="care-item" data-care="${i}"><div><b>${esc(c.title)}</b>${c.interval ? ` <span class="pill">${esc(c.interval)}</span>` : ''}<p>${esc(c.text)}</p><p class="care-last" data-care-last></p></div><button type="button" class="btn-s" data-care-done="${i}">Сделано сегодня</button></div>`).join('');
  const sources = (m.sources || []).map(s => `<li>${s.url ? `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.title)}</a>` : esc(s.title)}${s.pages ? `, стр. ${esc(s.pages)}` : ''} <span class="muted">(${esc({ manufacturer: 'производитель', 'manual-archive': 'архив инструкций', photo: 'фото', forum: 'форум' }[s.kind] || s.kind || '')})</span></li>`).join('');
  const controlsHelp = m.panel.controls.filter(c => c.help).map(c => `<li><b>${esc(controlName(c))}</b> — ${esc(c.help)}</li>`).join('');

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Product', name: title(m), brand: { '@type': 'Brand', name: m.brand }, model: m.model, category: 'Стиральная машина' },
      {
        '@type': 'HowTo', name: `Как запустить ${title(m)}: ${preset?.title || 'стирка'}`,
        totalTime: `PT${E.timing(m, st).total}M`,
        step: howToSteps(m, st, preset).map((t, i) => ({ '@type': 'HowToStep', position: i + 1, text: t }))
      },
      ...(m.troubleshooting?.length ? [{
        '@type': 'FAQPage',
        mainEntity: m.troubleshooting.map(t => ({ '@type': 'Question', name: t.title, acceptedAnswer: { '@type': 'Answer', text: t.causes.join(' ') } }))
      }] : [])
    ]
  };

  const body = `
<div class="wrap crumbs"><a href="${base}">${R.icon('back')} Все машины</a></div>
<section class="wrap mhead">
  <div>
    <div class="mbrand">${esc(m.brand)}</div>
    <h1>${esc(m.model)}</h1>
    <p class="msum">${esc(m.summary || '')}</p>
    <ul class="tags">${E.features(m).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  </div>
  ${m.completeness === 'partial' ? `<aside class="partial">${R.icon('info')}<div><b>Данные неполные.</b> В найденной инструкции нет части сведений: ${esc((notes.gaps || []).slice(0, 2).join(' '))} Подробности — во вкладке «Источники».</div></aside>` : ''}
  ${m.pitfalls?.length ? `<aside class="pitfalls"><h2>${R.icon('alert')} На что обратить внимание</h2><ul>${m.pitfalls.map(p => `<li>${esc(p)}</li>`).join('')}</ul></aside>` : ''}
</section>

<section class="wrap block">
  <div class="block-head"><h2>1. Что нужно сделать?</h2>
  ${presetGroups.length > 1 ? `<div class="seg" role="group" aria-label="Тип задачи"><button type="button" class="on" data-pgroup="">Все</button>${presetGroups.map(g => `<button type="button" data-pgroup="${g}">${groups[g] || g}</button>`).join('')}</div>` : ''}</div>
  <div class="presets" data-presets>${presets}</div>
</section>

<section class="wrap block work">
  <div class="panel-card card">
    <div class="block-head"><h2>2. Панель машины</h2>
      <div class="seg" role="group" aria-label="Вид панели"><button type="button" data-layout-btn="compact">Крупно</button><button type="button" data-layout-btn="machine">Как на машине</button></div>
    </div>
    <p class="hint">Нажимайте на цифры вокруг ручек и на кнопки — или выбирайте ниже.</p>
    <div class="panel-wrap" data-panel>${R.panelSVG(m, st, { layout: 'machine', uid: 'pm' })}</div>
    <div class="chips-wrap" data-chips>${R.chipsHTML(m, st)}</div>
  </div>
  <div class="result-card card" aria-live="polite">
    <h2>3. Что будет</h2>
    <div data-result>${R.resultHTML(m, st)}</div>
    <h3>Как запустить</h3>
    <div data-howto>${R.howToHTML(m, st, preset)}</div>
    <p class="note" data-preset-note>${esc(preset?.note || '')}</p>
  </div>
</section>

${m.tray ? `<section class="wrap block card tray-card">
  <h2>4. Лоток для моющих средств</h2>
  <p class="hint">Вид спереди, слева направо. Подсвечены отсеки, из которых машина возьмёт средство на выбранной программе.</p>
  <div data-tray>${R.trayHTML(m, used, preset?.dose || {})}</div>
  ${m.tray.help ? `<p class="note">${esc(m.tray.help)}</p>` : ''}
</section>` : ''}

<section class="wrap block">
  <div class="tabs" role="tablist">
    <button type="button" role="tab" aria-selected="true" data-tab="programs">Все программы</button>
    <button type="button" role="tab" aria-selected="false" data-tab="controls">Что за кнопки</button>
    ${m.troubleshooting?.length ? '<button type="button" role="tab" aria-selected="false" data-tab="trouble">Неисправности</button>' : ''}
    ${m.care?.length ? '<button type="button" role="tab" aria-selected="false" data-tab="care">Уход</button>' : ''}
    <button type="button" role="tab" aria-selected="false" data-tab="load">Вес белья</button>
    <button type="button" role="tab" aria-selected="false" data-tab="sources">Источники</button>
  </div>
  <div class="tabpanel card" data-tabpanel="programs">
    <p class="hint">Нажмите на строку, чтобы выставить программу на панели.</p>
    <div class="table-wrap"><table class="ptable">
      <thead><tr><th>№</th><th>Программа</th><th>Темп.</th><th>Отжим</th><th>Лоток</th><th>Время</th><th>Конец</th></tr></thead>
      <tbody>${programsRows}</tbody>
    </table></div>
  </div>
  <div class="tabpanel card" data-tabpanel="controls" hidden><ul class="ctrl-help">${controlsHelp}</ul></div>
  ${m.troubleshooting?.length ? `<div class="tabpanel card" data-tabpanel="trouble" hidden>${trouble}</div>` : ''}
  ${m.care?.length ? `<div class="tabpanel card" data-tabpanel="care" hidden><p class="hint">Отметки сохраняются только в этом браузере.</p>${care}</div>` : ''}
  <div class="tabpanel card" data-tabpanel="load" hidden data-load></div>
  <div class="tabpanel card" data-tabpanel="sources" hidden>
    <h3>Откуда данные</h3><ul class="sources">${sources || '<li>Источник не указан.</li>'}</ul>
    ${notes.assumptions?.length ? `<h3>Допущения</h3><ul>${notes.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${notes.gaps?.length ? `<h3>Чего нет в инструкции</h3><ul>${notes.gaps.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    <p class="muted">Время — оценка по шагам командоаппарата и мощности ТЭНа: нагрев воды объёмом ${m.cycle?.washLitres ?? '?'} л от ${m.cycle?.inletTempC ?? 15} °C до выбранной температуры ТЭНом ${m.heaterW ? `${m.heaterW} Вт` : '2000 Вт (мощность в инструкции не указана, взято типичное значение)'}. Реальное время зависит от температуры воды в трубах, загрузки и напряжения в сети.</p>
  </div>
</section>

${agentNote([
  `Страница машины ${esc(title(m))}. Машиночитаемые данные: <a href="../${m.id}.json">../${m.id}.json</a> (формат описан в <a href="${base}llms.txt">llms.txt</a>).`,
  `Ссылка на конкретную настройку: ?p=&lt;позиция ручки программ&gt;&amp;t=&lt;значение ручки температуры&gt;&amp;s=&lt;значение ручки отжима&gt;&amp;o=&lt;id кнопок через запятую&gt;, или ?preset=&lt;id&gt;. Пресеты: ${(m.presets || []).map(p => `${esc(p.id)} (${esc(p.title)})`).join(', ')}.`,
  `Позиции ручки программ: ${pk.positions.filter(p => !p.stop).map(p => esc(p.value)).join(', ')}. Время на странице — оценка, кроме случаев, где указано «по инструкции».`
])}
<script type="application/json" id="machine-data">${json(m)}</script>`;

  return shell({
    base, path: `m/${m.id}/`, pageTitle: `${title(m)}: как пользоваться, программы, панель — ${SITE_NAME}`,
    description: `${title(m)}: ${m.summary || ''} Куда ставить ручки, сколько идёт стирка, куда сыпать порошок, что делать, если остановилась с водой.`,
    body, bodyClass: 'machine',
    head: `<link rel="alternate" type="application/json" href="../${m.id}.json" title="${esc(title(m))} — данные">
<script type="application/ld+json">${json(jsonld)}</script>`
  });
}

function controlName(c) {
  const role = { program: 'Ручка программ', temperature: 'Ручка температуры', spin: 'Ручка отжима', power: 'Кнопка питания', option: 'Кнопка', start: 'Кнопка старта' }[c.role];
  if (c.type === 'lamp') return 'Лампа';
  return `${role || 'Элемент'}${c.label ? ' ' + c.label : ''}`;
}

function presetLine(m, p) {
  const st = E.stateFromPreset(m, p);
  const parts = [];
  const pk = E.knob(m, 'program'), tk = E.knob(m, 'temperature'), sk = E.knob(m, 'spin');
  parts.push(`${pk.label || 'P'} ${E.label(E.position(pk, st.prog))}`);
  const tp = E.position(tk, st.temp); if (tp) parts.push(tp.tempC ? `${tp.tempC}°` : 'холодная');
  const sp = E.position(sk, st.spin); if (sp) parts.push(sp.rpm ? `${sp.rpm}` : 'без отжима');
  for (const b of E.optionButtons(m)) if (st.options[b.id]) parts.push(b.label || b.id);
  return esc(parts.join(' · ')) + ` · ≈ ${E.formatMin(E.timing(m, st).total)}`;
}

function howToSteps(m, st, preset) {
  return R.howToHTML(m, st, preset).replace(/<\/li>/g, '\n').replace(/<[^>]+>/g, '').split('\n').map(s => s.trim()).filter(Boolean);
}

// ---------- llms.txt ----------
function llmsTxt() {
  return `# ${SITE_NAME}

> ${SITE_TAGLINE}. Справочник по старым электромеханическим стиральным машинам (механический таймер, ручки с цифрами, без дисплея): как выглядит панель, куда ставить ручки, сколько идёт программа, куда класть порошок, какие комбинации нельзя.

Сайт статический. Для каждой машины есть HTML-страница и JSON с полными данными. Используйте JSON, если нужно ответить человеку точно; давайте человеку ссылку на страницу, чтобы он увидел панель.

## Как пользоваться

- Найти машину: ${abs('search-index.json')} (поля id, brand, model, aliases, features, url) или список ${abs('machines.json')}.
- Данные машины: ${abs('m/<id>.json')}. Формат: panel.controls (ручки и кнопки, позиции ручек по часовой стрелке от 12 часов), tray.compartments (отсеки лотка слева направо), cycle.steps (порядок шагов таймера, минуты без нагрева), programs (таблица программ из инструкции, sourcePage — страница инструкции), rules (конфликты), presets (готовые сценарии), troubleshooting, care, sources, notes.
- Ссылка на настройку: ${abs('m/<id>/')}?p=<позиция ручки программ>&t=<значение ручки температуры>&s=<значение ручки отжима>&o=<id кнопок через запятую>. Или ?preset=<id пресета>. Страница сама покажет панель, время и предупреждения.
- Время: оценка. Таймер проходит cycle.steps от выбранной позиции до первого шага с end; если timerPausesForHeating, добавляется нагрев washLitres литров от inletTempC до выбранной температуры при мощности heaterW. Где в programs есть durationMin, это цифра из инструкции — она важнее оценки.
- end: stop — машина остановится сама; water-stop — остановится с водой в баке, человеку нужно перевести ручку на отжим/слив; drain — сольёт и остановится.
- Не выдумывайте значения, которых нет в данных: смотрите notes.gaps.

## Машины

${machines.map(m => `- [${title(m)}](${abs(`m/${m.id}/`)}): ${m.summary || ''} Данные: ${abs(`m/${m.id}.json`)}`).join('\n')}

## Дополнительно

- [Полное текстовое описание всех машин](${abs('llms-full.txt')})
`;
}

function llmsFull() {
  return machines.map(m => {
    const pk = E.knob(m, 'program');
    const lines = [`# ${title(m)}`, '', m.summary || '', '', `Годы: ${m.years || '—'}. Загрузка: ${m.capacityKg ?? '—'} кг. Отжим до ${m.maxSpinRpm ?? '—'} об/мин.`, ''];
    if (m.pitfalls?.length) lines.push('## Важно', ...m.pitfalls.map(p => `- ${p}`), '');
    lines.push('## Панель (слева направо)');
    for (const c of (m.panel.rows || [m.panel.controls.map(c => c.id)]).flat().map(id => E.control(m, id)).filter(Boolean)) {
      const pos = c.positions ? `: ${c.positions.map(p => p.stop ? '• (стоп)' : p.label).join(', ')}` : '';
      lines.push(`- ${controlName(c)}${pos}${c.help ? ` — ${c.help}` : ''}`);
    }
    if (m.tray) lines.push('', '## Лоток (слева направо)', ...m.tray.compartments.map(c => `- ${c.mark}: ${c.label}`));
    lines.push('', '## Программы');
    for (const p of m.programs) {
      const s0 = E.withProgramDefaults(m, { prog: p.pos, temp: null, spin: null, options: {} });
      const t = E.timing(m, s0);
      lines.push(`- ${E.label(E.position(pk, p.pos))}: ${p.name}; до ${p.tempMaxC || 0} °C; отжим до ${p.spinMaxRpm ?? '—'}; ${p.durationMin ? `по инструкции ${p.durationMin} мин` : (t.missingCycle ? 'время неизвестно' : `оценка ${t.total} мин`)}; конец: ${p.ends || '—'}`);
    }
    if (m.presets?.length) lines.push('', '## Готовые сценарии', ...m.presets.map(p => `- ${p.title}: ${presetLine(m, p).replace(/&[a-z#0-9]+;/g, ' ')}. ${p.note || ''}`));
    if (m.troubleshooting?.length) lines.push('', '## Неисправности', ...m.troubleshooting.map(t => `- ${t.title}: ${t.causes.join(' ')}`));
    lines.push('', `Страница: ${abs(`m/${m.id}/`)}`, '');
    return lines.join('\n');
  }).join('\n---\n\n');
}

// ---------- write ----------
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });
for (const f of ['engine.js', 'render.js', 'app.js', 'style.css']) copyFileSync(join(root, 'src', f), join(dist, 'assets', f));

writeFileSync(join(dist, 'index.html'), homePage());
for (const m of machines) {
  mkdirSync(join(dist, 'm', m.id), { recursive: true });
  writeFileSync(join(dist, 'm', m.id, 'index.html'), machinePage(m));
  writeFileSync(join(dist, 'm', `${m.id}.json`), JSON.stringify(m, null, 2));
}
const index = machines.map(m => ({
  id: m.id, brand: m.brand, model: m.model, years: m.years || '', url: `m/${m.id}/`,
  aliases: m.aliases || [], features: E.features(m),
  keys: [...new Set([title(m), ...(m.aliases || [])].flatMap(E.searchKeys))],
  programs: m.programs.map(p => p.name)
}));
writeFileSync(join(dist, 'search-index.json'), JSON.stringify(index));
writeFileSync(join(dist, 'machines.json'), JSON.stringify(machines.map(m => ({ id: m.id, brand: m.brand, model: m.model, years: m.years, summary: m.summary, page: abs(`m/${m.id}/`), data: abs(`m/${m.id}.json`) })), null, 2));
writeFileSync(join(dist, 'llms.txt'), llmsTxt());
writeFileSync(join(dist, 'llms-full.txt'), llmsFull());
writeFileSync(join(dist, 'robots.txt'), [
  'User-agent: *', 'Allow: /', '',
  ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'YandexBot', 'YandexAdditional', 'CCBot', 'Bytespider', 'meta-externalagent']
    .flatMap(a => [`User-agent: ${a}`, 'Allow: /', '']),
  '# Описание сайта для ИИ-агентов: /llms.txt',
  SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml` : ''
].join('\n'));
if (SITE_URL) {
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE_URL}/</loc></url>
${machines.map(m => `<url><loc>${SITE_URL}/m/${m.id}/</loc></url>`).join('\n')}
</urlset>
`);
}
writeFileSync(join(dist, '404.html'), shell({ base: '/', path: '404', pageTitle: `Не найдено — ${SITE_NAME}`, description: 'Страница не найдена', body: `<section class="wrap hero"><h1>Такой страницы нет</h1><p><a href="/">Ко всем машинам</a></p></section>` }));
console.log(`built ${machines.length} machine pages into dist/${SITE_URL ? '' : ' (set SITE_URL for sitemap.xml)'}`);
