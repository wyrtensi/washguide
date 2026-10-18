// Run the engine over every program and preset of every machine; report anything odd.
import { readFileSync, readdirSync } from 'node:fs';
import * as E from '../src/engine.js';
import * as R from '../src/render.js';
const dir = new URL('../data/machines/', import.meta.url);
let issues = 0;
for (const f of readdirSync(dir)) {
  const m = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const states = [
    ...m.programs.map(p => ['prog ' + p.pos, E.withProgramDefaults(m, { prog: p.pos, temp: null, spin: null, options: {} })]),
    ...(m.presets || []).map(p => ['preset ' + p.id, E.stateFromPreset(m, p)])
  ];
  const out = [];
  for (const [name, st] of states) {
    try {
      const t = E.timing(m, st);
      const c = E.conflicts(m, st);
      R.resultHTML(m, st); R.howToHTML(m, st); R.panelSVG(m, st, { layout: 'compact' }); R.chipsHTML(m, st);
      if (!Number.isFinite(t.total)) out.push(`${name}: total ${t.total}`);
      if (t.missingCycle) out.push(`${name}: no cycle steps`);
      else if (t.total === 0) out.push(`${name}: 0 min`);
      if (name.startsWith('preset') && c.some(x => x.level === 'error')) out.push(`${name}: preset has error: ${c.find(x => x.level === 'error').message}`);
      if (t.manual && !t.missingCycle && Math.abs(t.total - t.manual.min) / t.manual.min > 0.35) out.push(`${name}: estimate ${t.total} vs manual ${t.manual.min}`);
    } catch (e) { out.push(`${name}: THROWS ${e.message}`); }
  }
  issues += out.length;
  console.log(`${m.id}: ${states.length} states${out.length ? '\n  ' + out.join('\n  ') : ' ok'}`);
}
console.log(issues ? `${issues} issues` : 'all clean');
