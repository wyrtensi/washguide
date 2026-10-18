import * as E from './engine.js';
import * as R from './render.js';
import { T } from './i18n.js';

const LANG = document.documentElement.lang === 'en' ? 'en' : 'ru';
const tr = T[LANG];
const BASE = new URL(document.body.dataset.langRoot || './', location.href);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
};

// keep the current setting when switching language
document.querySelectorAll('[data-lang-switch]').forEach(a => a.addEventListener('click', () => {
  if (location.search) a.href = a.href.split('?')[0] + location.search;
}));

// ---------- theme ----------
$('[data-theme-toggle]')?.addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});

// ---------- search ----------
let indexPromise;
function loadIndex() {
  indexPromise ||= fetch(new URL('search-index.json', BASE)).then(r => r.json()).catch(() => []);
  return indexPromise;
}

function score(entry, q) {
  const keys = E.searchKeys(q);
  const words = E.normalize(q).split(/\s+/).filter(Boolean);
  let s = 0;
  for (const k of keys) for (const ek of entry.keys) {
    if (ek === k) s += 10; else if (ek.startsWith(k)) s += 6; else if (ek.includes(k)) s += 3;
  }
  const hay = E.normalize([entry.brand, entry.model, ...entry.aliases, ...entry.features, ...entry.programs].join(' '));
  if (words.length && words.every(w => hay.includes(w) || entry.keys.some(k => k.includes(w)))) s += 4;
  return s;
}

async function search(q) {
  const idx = await loadIndex();
  if (!q.trim()) return idx.map(e => ({ e, s: 1 }));
  return idx.map(e => ({ e, s: score(e, q) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}

const topInput = $('[data-search]');
const suggest = $('[data-suggest]');
if (topInput && suggest) {
  let active = -1;
  const render = async () => {
    const q = topInput.value;
    if (!q.trim()) { suggest.hidden = true; return; }
    const res = (await search(q)).slice(0, 6);
    active = -1;
    suggest.innerHTML = res.length
      ? res.map(({ e }) => `<a href="${new URL(e.url, BASE).pathname}"><b>${R.esc(e.brand)} ${R.esc(e.model)}</b><span>${R.esc(e.features.slice(0, 3).join(' · '))}</span></a>`).join('')
      : `<p>${tr.nothing}</p>`;
    suggest.hidden = false;
  };
  topInput.addEventListener('input', render);
  topInput.addEventListener('focus', render);
  topInput.addEventListener('keydown', ev => {
    const links = $$('a', suggest);
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      active = (active + (ev.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('on', i === active));
    } else if (ev.key === 'Enter' && links.length) {
      ev.preventDefault();
      location.href = (links[active] || links[0]).href;
    } else if (ev.key === 'Escape') suggest.hidden = true;
  });
  document.addEventListener('click', ev => { if (!ev.target.closest('.top-search')) suggest.hidden = true; });
}

// ---------- home ----------
const grid = $('[data-grid]');
if (grid) {
  const input = $('[data-filter]');
  let brand = '';
  const apply = async () => {
    const q = input.value;
    const res = await search(q);
    const ok = new Map(res.map(x => [x.e.id, x.s]));
    const cards = $$('[data-machine]', grid);
    let shown = 0;
    for (const c of cards) {
      const vis = ok.has(c.dataset.machine) && (!brand || c.dataset.brand === brand);
      c.hidden = !vis;
      if (vis) shown++;
    }
    if (q.trim()) cards.sort((a, b) => (ok.get(b.dataset.machine) || 0) - (ok.get(a.dataset.machine) || 0)).forEach(c => grid.appendChild(c));
    $('[data-empty]').hidden = shown > 0;
  };
  const q0 = new URLSearchParams(location.search).get('q');
  if (q0) input.value = q0;
  input.addEventListener('input', apply);
  $$('[data-brand-filter]').forEach(b => b.addEventListener('click', () => {
    brand = b.dataset.brandFilter;
    $$('[data-brand-filter]').forEach(x => x.classList.toggle('on', x === b));
    apply();
  }));
  if (q0) apply();
}

// ---------- machine page ----------

function initMachine(m) {
  const pk = E.knob(m, 'program');
  const panelEl = $('[data-panel]');
  const angles = {};          // cumulative rotation per knob, so cw-only knobs always turn forward
  let preset = m.presets?.[0] || null;
  let lastWarn = null;
  let layout = store.get('panel-layout') || (innerWidth < 760 ? 'compact' : 'machine');

  let state = fromUrl() || E.defaultState(m);
  if (new URLSearchParams(location.search).toString()) preset = matchPreset(state);

  function fromUrl() {
    const q = new URLSearchParams(location.search);
    if (q.get('preset')) {
      const p = m.presets?.find(x => x.id === q.get('preset'));
      if (p) { preset = p; return E.stateFromPreset(m, p); }
    }
    if (!q.get('p') || !E.position(pk, q.get('p'))) return null;
    let s = E.withProgramDefaults(m, { prog: q.get('p'), temp: null, spin: null, options: {} });
    const tk = E.knob(m, 'temperature'), sk = E.knob(m, 'spin');
    if (q.get('t') && E.position(tk, q.get('t'))) s.temp = q.get('t');
    if (q.get('s') && E.position(sk, q.get('s'))) s.spin = q.get('s');
    const opts = (q.get('o') || '').split(',').filter(Boolean);
    for (const b of E.optionButtons(m)) s.options[b.id] = opts.includes(b.id);
    return s;
  }

  function matchPreset(s) {
    return m.presets?.find(p => {
      const ps = E.stateFromPreset(m, p);
      return ps.prog === s.prog && ps.temp === s.temp && ps.spin === s.spin
        && Object.keys(ps.options).every(k => ps.options[k] === s.options[k]);
    }) || null;
  }

  function toUrl() {
    const q = new URLSearchParams();
    if (preset && matchPreset(state) === preset) q.set('preset', preset.id);
    else {
      q.set('p', state.prog);
      if (state.temp != null) q.set('t', state.temp);
      if (state.spin != null) q.set('s', state.spin);
      const on = Object.keys(state.options).filter(k => state.options[k]);
      if (on.length) q.set('o', on.join(','));
    }
    history.replaceState(null, '', `${location.pathname}?${q}`);
  }

  function drawPanel() {
    panelEl.innerHTML = R.panelSVG(m, state, { layout, uid: 'pm' });
    $$('[data-layout-btn]').forEach(b => b.classList.toggle('on', b.dataset.layoutBtn === layout));
    panelEl.classList.toggle('compact', layout === 'compact');
    for (const g of $$('.knob', panelEl)) {
      const rot = $('.rot', g);
      angles[g.dataset.ctrl] = Number(rot.dataset.angle);
    }
  }

  function turn(ctrl, value) {
    const c = E.control(m, ctrl);
    const target = E.position(c, value)?.angle ?? 0;
    const cur = angles[ctrl] ?? target;
    const curMod = ((cur % 360) + 360) % 360;
    let delta = target - curMod;
    if (c.rotation === 'cw-only') delta = (delta + 360) % 360;
    else if (delta > 180) delta -= 360; else if (delta < -180) delta += 360;
    angles[ctrl] = cur + delta;
    return angles[ctrl];
  }

  function syncPanel() {
    for (const g of $$('.knob', panelEl)) {
      const c = E.control(m, g.dataset.ctrl);
      const val = R.knobValue(state, c);
      const rot = $('.rot', g);
      rot.style.transform = `rotate(${turn(c.id, val)}deg)`;
      $$('.pos', g).forEach(p => p.classList.toggle('on', p.dataset.val === val));
    }
    for (const g of $$('.btn', panelEl)) {
      const on = Boolean(state.options[g.dataset.ctrl]);
      g.classList.toggle('on', on);
      if (g.hasAttribute('aria-pressed')) g.setAttribute('aria-pressed', on);
    }
  }

  function update({ from } = {}) {
    syncPanel();
    $('[data-chips]').innerHTML = R.chipsHTML(m, state);
    const html = R.resultHTML(m, state, lastWarn ? [{ level: 'info', message: lastWarn }] : []);
    $('[data-result]').innerHTML = html;
    $('[data-howto]').innerHTML = R.howToHTML(m, state, preset);
    $('[data-preset-note]').textContent = preset?.note || '';
    const tray = $('[data-tray]');
    if (tray) tray.innerHTML = R.trayHTML(m, E.dosing(m, state), preset?.dose || {});
    $$('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === preset?.id));
    $$('tr[data-prog]').forEach(r => r.classList.toggle('on', r.dataset.prog === state.prog));
    if (from !== 'init') toUrl();
  }

  function setKnob(ctrlId, value) {
    const c = E.control(m, ctrlId);
    if (!c || !E.position(c, value)) return;
    lastWarn = null;
    if (c.role === 'program') {
      const before = E.position(c, state.prog), after = E.position(c, value);
      if (c.rotation === 'cw-only' && before && after && after.angle < before.angle) {
        lastWarn = tr.cwWarn(E.label(before), E.label(after));
      }
      if (m.panel.programChangeWhenOff) {
        const pw = m.panel.controls.find(x => x.role === 'power');
        lastWarn = (lastWarn ? lastWarn + ' ' : '') + (pw ? tr.offWarn(pw.label || tr.powerWord) : '');
      }
      state = E.withProgramDefaults(m, { ...state, prog: value });
    } else if (c.role === 'temperature') state = { ...state, temp: value };
    else if (c.role === 'spin') state = { ...state, spin: value };
    preset = matchPreset(state);
    update();
  }

  function toggleOption(id) {
    state = { ...state, options: { ...state.options, [id]: !state.options[id] } };
    lastWarn = null;
    preset = matchPreset(state);
    update();
  }

  // panel clicks
  const onPanel = ev => {
    const pos = ev.target.closest('.pos[data-val]');
    if (pos) { setKnob(pos.closest('.knob, .slider').dataset.ctrl, pos.dataset.val); return; }
    const btn = ev.target.closest('.btn');
    if (btn && E.control(m, btn.dataset.ctrl)?.role === 'option') toggleOption(btn.dataset.ctrl);
  };
  panelEl.addEventListener('click', onPanel);
  panelEl.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPanel(ev); } });

  $('[data-chips]').addEventListener('click', ev => {
    const chip = ev.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.opt) toggleOption(chip.dataset.opt);
    else setKnob(chip.closest('[data-ctrl]').dataset.ctrl, chip.dataset.val);
  });

  $('[data-presets]')?.addEventListener('click', ev => {
    const b = ev.target.closest('[data-preset]');
    if (!b) return;
    preset = m.presets.find(p => p.id === b.dataset.preset);
    state = E.stateFromPreset(m, preset);
    lastWarn = null;
    update();
    if (innerWidth < 900) $('.panel-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $$('[data-pgroup]').forEach(b => b.addEventListener('click', () => {
    $$('[data-pgroup]').forEach(x => x.classList.toggle('on', x === b));
    $$('[data-preset]').forEach(p => { p.hidden = Boolean(b.dataset.pgroup) && p.dataset.group !== b.dataset.pgroup; });
  }));
  $$('[data-layout-btn]').forEach(b => b.addEventListener('click', () => {
    layout = b.dataset.layoutBtn;
    store.set('panel-layout', layout);
    drawPanel();
    syncPanel();
  }));

  const pickRow = r => { setKnob(pk.id, r.dataset.prog); $('.panel-card').scrollIntoView({ behavior: 'smooth' }); };
  $$('tr[data-prog]').forEach(r => {
    r.addEventListener('click', () => pickRow(r));
    r.addEventListener('keydown', ev => { if (ev.key === 'Enter') pickRow(r); });
  });

  // tabs
  $$('[data-tab]').forEach(t => t.addEventListener('click', () => {
    $$('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === t));
    $$('[data-tabpanel]').forEach(p => { p.hidden = p.dataset.tabpanel !== t.dataset.tab; });
  }));

  // care log
  const careKey = `care:${m.id}`;
  const careLog = () => { try { return JSON.parse(store.get(careKey) || '{}'); } catch { return {}; } };
  const drawCare = () => {
    const log = careLog();
    $$('[data-care]').forEach(el => {
      const d = log[el.dataset.care];
      $('[data-care-last]', el).textContent = d ? tr.careLast(d) : tr.careNever;
    });
  };
  $$('[data-care-done]').forEach(b => b.addEventListener('click', () => {
    const log = careLog();
    log[b.dataset.careDone] = new Date().toLocaleDateString(tr.locale);
    store.set(careKey, JSON.stringify(log));
    drawCare();
  }));
  drawCare();

  initLoad(m, () => state);
  drawPanel();
  update({ from: 'init' });
  syncPanel();
}

// ---------- laundry weight ----------
const ITEMS = [500, 800, 200, 200, 600, 450, 400, 120, 1200, 500, 1000, 250].map((g, i) => [tr.items[i], g]);

function initLoad(m, getState) {
  const el = $('[data-load]');
  if (!el) return;
  const counts = ITEMS.map(() => 0);
  const half = E.optionButtons(m).find(b => b.effect?.waterFactor);
  const draw = () => {
    const g = counts.reduce((a, c, i) => a + c * ITEMS[i][1], 0);
    const p = E.program(m, getState().prog);
    const limit = (p?.loadKg || m.capacityKg || 5) * 1000;
    const pct = Math.min(100, Math.round(g / limit * 100));
    let advice = tr.loadEmpty;
    let cls = '';
    if (g > limit) { advice = tr.loadOver(limit / 1000); cls = 'bad'; }
    else if (g > 0 && half && g <= limit / 2) { advice = tr.loadHalf(half.label || tr.halfWord); cls = 'good'; }
    else if (g > 0) { advice = tr.loadOk; cls = 'good'; }
    el.innerHTML = `<p class="hint">${tr.loadHint}</p>
      <div class="load-grid">${ITEMS.map(([n, w], i) => `<div class="load-item"><span>${n}<small>${w} ${tr.g}</small></span><div class="stepper"><button type="button" data-d="-1" data-i="${i}" aria-label="${tr.less}">−</button><b>${counts[i]}</b><button type="button" data-d="1" data-i="${i}" aria-label="${tr.more}">+</button></div></div>`).join('')}</div>
      <div class="load-sum ${cls}"><b>${tr.num((g / 1000).toFixed(1))} ${tr.kg}</b> ${tr.of} ${tr.num(limit / 1000)} ${tr.kg}<div class="meter"><i style="width:${pct}%"></i></div><p>${advice}</p></div>`;
  };
  el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-d]');
    if (!b) return;
    counts[b.dataset.i] = Math.max(0, counts[b.dataset.i] + Number(b.dataset.d));
    draw();
  });
  draw();
}

const dataEl = $('#machine-data');
if (dataEl) initMachine(JSON.parse(dataEl.textContent));
