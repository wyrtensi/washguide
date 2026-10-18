// Pure machine logic shared by the build script (prerender) and the browser (interaction).
// No DOM access here.

import { L } from './i18n.js';

const WATER_KJ_PER_KG_K = 4.186;

export function controlsByRole(m, role) {
  return m.panel.controls.filter(c => c.role === role);
}

export function control(m, id) {
  return m.panel.controls.find(c => c.id === id);
}

export function knob(m, role) {
  return m.panel.controls.find(c => c.type === 'knob' && c.role === role)
      || m.panel.controls.find(c => c.type === 'slider' && c.role === role);
}


// Human name of a control for text: printed label if it reads as a word, else what its symbol means.
export function controlTitle(c, m) {
  if (c.name) return c.name;
  const sym = L(m).symbolNames[c.symbol];
  if (c.label && sym && c.label.length <= 3) return `${c.label} (${sym})`;
  return c.label || sym || c.id;
}

export function optionButtons(m) {
  return m.panel.controls.filter(c => c.type === 'button' && c.role === 'option');
}

export function position(ctrl, value) {
  return ctrl ? ctrl.positions.find(p => p.value === value) : undefined;
}

export function program(m, pos) {
  return m.programs.find(p => p.pos === pos);
}

// State: { prog, temp, spin, options: { [buttonId]: bool } }
export function defaultState(m) {
  const preset = m.presets && m.presets[0];
  if (preset) return stateFromPreset(m, preset);
  const prog = knob(m, 'program');
  const first = prog.positions.find(p => !p.stop);
  return withProgramDefaults(m, { prog: first.value, temp: null, spin: null, options: {} });
}

export function stateFromPreset(m, preset) {
  const s = preset.set;
  const options = {};
  for (const b of optionButtons(m)) options[b.id] = Boolean(s[b.id]);
  // presets may name a knob by role (prog/temp/spin) or by its control id
  const byRole = role => { const k = knob(m, role); return k ? s[k.id] : undefined; };
  return { prog: s.prog ?? byRole('program'), temp: s.temp ?? byRole('temperature') ?? null, spin: s.spin ?? byRole('spin') ?? null, options };
}

// When the visitor turns the program knob, suggest the manual's default temperature and the
// highest allowed spin, the way the old cheat sheet did. Only fills what the program defines.
export function withProgramDefaults(m, state) {
  const p = program(m, state.prog);
  const next = { ...state, options: { ...state.options } };
  const tk = knob(m, 'temperature');
  const sk = knob(m, 'spin');
  if (p && tk) {
    const want = p.tempDefaultC ?? (p.tempMaxC === 0 ? 0 : p.tempMaxC);
    if (want != null) next.temp = closestBelow(tk.positions, 'tempC', want)?.value ?? next.temp;
  }
  if (p && sk && p.spinMaxRpm != null) {
    next.spin = closestBelow(sk.positions, 'rpm', p.spinMaxRpm)?.value ?? next.spin;
  }
  if (p) {
    for (const b of optionButtons(m)) {
      if (next.options[b.id] && !(p.options || []).includes(b.id)) next.options[b.id] = false;
    }
  }
  return next;
}

function closestBelow(positions, key, target) {
  const candidates = positions.filter(p => typeof p[key] === 'number' && p[key] <= target);
  if (!candidates.length) return positions.find(p => typeof p[key] === 'number');
  return candidates.reduce((a, b) => (b[key] > a[key] ? b : a));
}

function activeEffects(m, state) {
  const eff = { waterFactor: 1, holdBeforeSpin: false, extraRinseMin: 0 };
  for (const b of optionButtons(m)) {
    if (!state.options[b.id] || !b.effect) continue;
    if (b.effect.waterFactor) eff.waterFactor *= b.effect.waterFactor;
    if (b.effect.holdBeforeSpin) eff.holdBeforeSpin = true;
    if (b.effect.extraRinseMin) eff.extraRinseMin += b.effect.extraRinseMin;
  }
  return eff;
}

function selectedTempC(m, state) {
  const p = position(knob(m, 'temperature'), state.temp);
  return p && typeof p.tempC === 'number' ? p.tempC : null;
}

function selectedRpm(m, state) {
  const p = position(knob(m, 'spin'), state.spin);
  return p && typeof p.rpm === 'number' ? p.rpm : null;
}

// Walk the timer from the program knob position to the first step that ends the cycle.
export function walk(m, state) {
  const steps = m.cycle?.steps || [];
  const start = steps.findIndex(s => s.pos === state.prog);
  if (start < 0) return { steps: [], end: null, missing: true };
  const eff = activeEffects(m, state);
  const out = [];
  let end = null;
  let seenRinse = false;
  for (let i = start; i < steps.length; i++) {
    const s = steps[i];
    if (eff.holdBeforeSpin && seenRinse && (s.phase === 'spin' || s.phase === 'drain')) {
      end = 'water-stop';
      break;
    }
    out.push(s);
    if (s.phase === 'rinse' || s.phase === 'softener') seenRinse = true;
    if (s.end) { end = s.end; break; }
  }
  return { steps: out, end: end || 'stop', missing: false };
}

export function timing(m, state) {
  const w = walk(m, state);
  const prog = program(m, state.prog);
  const cyc = m.cycle || {};
  const eff = activeEffects(m, state);
  const tempC = selectedTempC(m, state);
  const rpm = selectedRpm(m, state);
  const phases = { heat: 0, prewash: 0, wash: 0, rinse: 0, spin: 0, drain: 0 };
  const inlet = cyc.inletTempC ?? 15;
  const litres = (cyc.washLitres ?? 12) * eff.waterFactor;
  const kw = (m.heaterW ?? 2000) / 1000;
  let water = inlet;
  let prevPhase = null;
  let heats = false;

  for (const s of w.steps) {
    if (prevPhase && s.phase !== prevPhase) water = inlet; // drained and refilled
    let min = s.min || 0;
    if ((s.phase === 'spin') && rpm === 0 && s.minNoSpin != null) min = s.minNoSpin;
    const bucket = s.phase === 'softener' ? 'rinse' : (s.phase === 'soak' ? 'wash' : s.phase);
    phases[bucket] = (phases[bucket] || 0) + min;

    if (s.heats && tempC && tempC > 0) {
      const target = Math.min(tempC, s.maxHeatC ?? Infinity);
      if (target > water) {
        heats = true;
        const minutes = litres * WATER_KJ_PER_KG_K * (target - water) / kw / 60;
        if (cyc.timerPausesForHeating !== false) phases.heat += minutes;
        water = target;
      }
    }
    prevPhase = s.phase;
  }
  if (eff.extraRinseMin && w.steps.some(s => s.phase === 'rinse')) phases.rinse += eff.extraRinseMin;

  for (const k of Object.keys(phases)) phases[k] = Math.round(phases[k]);
  const total = Object.values(phases).reduce((a, b) => a + b, 0);
  return {
    total,
    phases,
    path: w.steps.map(s => s.pos),
    walked: w.steps,
    end: w.end,
    heats,
    missingCycle: w.missing,
    estimate: cyc.estimate !== false,
    manual: prog && prog.durationMin ? { min: prog.durationMin, atC: prog.durationAtC ?? null } : null
  };
}

// Compartments the walked steps take detergent from; falls back to the program table.
export function dosing(m, state) {
  const w = walk(m, state);
  const used = new Set();
  for (const s of w.steps) for (const d of s.dose || []) used.add(d);
  if (!w.steps.length) {
    const p = program(m, state.prog);
    for (const d of p?.dose || []) used.add(d);
  }
  return used;
}

function matches(when, m, state) {
  if (!when) return true;
  if (when.pos && !when.pos.includes(state.prog)) return false;
  if (when.options && !when.options.every(o => state.options[o])) return false;
  if (when.fabric) {
    const p = program(m, state.prog);
    if (!p || !when.fabric.includes(p.fabric)) return false;
  }
  if (when.tempAboveC != null) {
    const t = selectedTempC(m, state);
    if (t == null || t <= when.tempAboveC) return false;
  }
  if (when.spinAboveRpm != null) {
    const r = selectedRpm(m, state);
    if (r == null || r <= when.spinAboveRpm) return false;
  }
  return true;
}

export function conflicts(m, state) {
  const out = [];
  const progKnob = knob(m, 'program');
  const progPos = position(progKnob, state.prog);
  const p = program(m, state.prog);
  const tempC = selectedTempC(m, state);
  const rpm = selectedRpm(m, state);
  const t = timing(m, state);
  const tr = L(m);

  if (progPos?.stop) {
    out.push({ level: 'error', message: tr.cStop });
    return out;
  }
  if (p) {
    if (p.tempMaxC != null && tempC != null && tempC > p.tempMaxC) {
      out.push({
        level: p.tempMaxC === 0 ? 'info' : 'error',
        message: p.tempMaxC === 0
          ? tr.cNoHeat
          : tr.cTempMax(label(progPos), p.tempMaxC, tempC),
        sourcePage: p.sourcePage
      });
    }
    if (p.spinMaxRpm != null && rpm != null && rpm > p.spinMaxRpm) {
      out.push({
        level: 'warn',
        message: p.spinMaxRpm === 0
          ? tr.cNoSpin
          : tr.cSpinMax(p.spinMaxRpm, rpm),
        sourcePage: p.sourcePage
      });
    }
    for (const b of optionButtons(m)) {
      if (state.options[b.id] && p.options && !p.options.includes(b.id)) {
        out.push({ level: 'warn', message: tr.cOption(controlTitle(b, m)), sourcePage: p.sourcePage });
      }
    }
  }
  for (const r of m.rules || []) {
    if (!matches(r.when, m, state)) continue;
    const c = r.check || {};
    let hit = true;
    if (c.tempMaxC != null) hit = tempC != null && tempC > c.tempMaxC;
    if (c.spinMaxRpm != null) hit = rpm != null && rpm > c.spinMaxRpm;
    if (c.forbidOptions) hit = c.forbidOptions.some(o => state.options[o]);
    if (c.requireOptions) hit = c.requireOptions.some(o => !state.options[o]);
    if (hit) out.push({ level: r.level || 'warn', message: r.message, sourcePage: r.sourcePage });
  }
  if (t.missingCycle && !p) {
    out.push({ level: 'warn', message: tr.cNoData });
  }
  if (!t.missingCycle && !t.heats && tempC && tempC > 0 && !(p && p.tempMaxC === 0)) {
    out.push({ level: 'info', message: tr.cNoHeatHere });
  }
  const order = { error: 0, warn: 1, info: 2 };
  return dedupe(out).sort((a, b) => order[a.level] - order[b.level]);
}

function dedupe(list) {
  const seen = new Set();
  return list.filter(c => (seen.has(c.message) ? false : (seen.add(c.message), true)));
}

export function label(pos) {
  if (!pos) return '';
  return pos.short || pos.label;
}

export function formatMin(min, m) {
  if (min == null) return '';
  const tr = L(m);
  const h = Math.floor(min / 60);
  const mm = Math.round(min % 60);
  return h ? tr.hm(h, mm) : tr.min(mm);
}

export const endText = (m, end) => L(m).end[end] || '';
export const phaseText = (m, ph) => L(m).phase[ph] || ph;

// What to do next when the cycle ends with water in the drum: find the first spin step after
// the end of the walk on the same dial.
export function continueAfterWaterStop(m, state) {
  const steps = m.cycle?.steps || [];
  const w = walk(m, state);
  if (w.end !== 'water-stop' || !w.steps.length) return null;
  const lastIdx = steps.indexOf(w.steps[w.steps.length - 1]);
  const after = steps.slice(lastIdx + 1);
  const spin = after.find(s => s.phase === 'spin');
  const drain = after.find(s => s.phase === 'drain');
  return { spin: spin?.pos ?? null, drain: drain?.pos ?? null, viaButton: activeEffects(m, state).holdBeforeSpin };
}

// Short human summary of where each control must be.
export function settingsList(m, state) {
  const rows = [];
  const tr = L(m);
  for (const c of m.panel.controls) {
    if (c.type === 'knob' || c.type === 'slider') {
      const val = c.role === 'program' ? state.prog : c.role === 'temperature' ? state.temp : c.role === 'spin' ? state.spin : null;
      const pos = position(c, val);
      if (pos) rows.push({ id: c.id, role: c.role, control: c.label || c.role, value: pos.label, pos });
    } else if (c.type === 'button' && c.role === 'option') {
      rows.push({ id: c.id, role: 'option', control: controlTitle(c, m), value: state.options[c.id] ? tr.pressed : tr.released, pressed: Boolean(state.options[c.id]) });
    }
  }
  return rows;
}

// Search normalisation: lower case, ё→е, Cyrillic brand names to Latin, then a plain transliteration.
const BRANDS = {
  'индезит': 'indesit', 'индесит': 'indesit', 'аристон': 'ariston', 'хотпоинт': 'hotpoint',
  'занусси': 'zanussi', 'занусси': 'zanussi', 'электролюкс': 'electrolux', 'канди': 'candy',
  'бош': 'bosch', 'сименс': 'siemens', 'атлант': 'atlant', 'вятка': 'vyatka', 'беко': 'beko',
  'ардо': 'ardo', 'вирпул': 'whirlpool', 'вирлпул': 'whirlpool', 'аег': 'aeg', 'миле': 'miele',
  'самсунг': 'samsung', 'элджи': 'lg', 'хувер': 'hoover', 'горенье': 'gorenje'
};
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

export function normalize(text) {
  let t = String(text || '').toLowerCase().replace(/ё/g, 'е');
  for (const [ru, en] of Object.entries(BRANDS)) t = t.split(ru).join(en);
  return t;
}

export function searchKeys(text) {
  const n = normalize(text);
  const lat = n.replace(/[а-я]/g, ch => TRANSLIT[ch] ?? ch);
  const compact = s => s.replace(/[\s\-_.]+/g, '');
  return [...new Set([n, lat, compact(n), compact(lat)])];
}

// Features a visitor might search by, derived from the data.
export function features(m) {
  const tr = L(m);
  const f = [];
  const pk = knob(m, 'program');
  f.push(tr.fPrograms(m.programs.length));
  const knobs = m.panel.controls.filter(c => c.type === 'knob').length;
  if (knobs) f.push(tr.fKnobs(knobs));
  const buttons = m.panel.controls.filter(c => c.type === 'button').length;
  if (buttons) f.push(tr.fButtons(buttons));
  if (pk?.rotation === 'cw-only') f.push(tr.fCw);
  if (m.programs.some(p => p.ends === 'water-stop')) f.push(tr.fWaterStop);
  if (pk && pk.positions.every(p => p.stop || p.timerOnly || /^[0-9]+$/.test(p.label))) f.push(tr.fDigits);
  if (pk && pk.positions.some(p => /^[A-Za-zА-Яа-я]$/.test(p.label))) f.push(tr.fLetters);
  f.push(m.loading === 'top' ? tr.fTop : tr.fFront);
  if (m.capacityKg) f.push(tr.fKg(m.capacityKg));
  if (m.maxSpinRpm) f.push(tr.fRpm(m.maxSpinRpm));
  return f;
}

export function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
