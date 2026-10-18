// Engine assertions on the Indesit WGS 834 TXR data. Run: node scripts/test-engine.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';

const m = JSON.parse(readFileSync(new URL('../data/machines/indesit-wgs-834-txr.json', import.meta.url), 'utf8'));
const st = (prog, temp, spin, options = {}) => ({ prog, temp, spin, options: { half: false, waterstop: false, ...options } });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('start on 4 walks 4..7 and stops by itself', () => {
  const r = E.timing(m, st('4', '40', '600'));
  assert.deepEqual(r.path, ['4', '5', '6', '7']);
  assert.equal(r.end, 'stop');
});

t('start on 2 is longer than start on 4 at the same temperature', () => {
  const a = E.timing(m, st('2', '40', '600')).total;
  const b = E.timing(m, st('4', '40', '600')).total;
  assert.ok(a - b >= 30, `${a} vs ${b}`);
});

t('higher temperature adds heating time', () => {
  const a = E.timing(m, st('2', 'MAX', '600'));
  const b = E.timing(m, st('2', '40', '600'));
  assert.ok(a.phases.heat > b.phases.heat);
  // 12 l from 15 to 40 at 1.8 kW is about 11.6 min
  assert.equal(b.phases.heat, 12);
});

t('half load reduces heating time', () => {
  const a = E.timing(m, st('4', '40', '600', { half: true })).phases.heat;
  const b = E.timing(m, st('4', '40', '600')).phases.heat;
  assert.ok(a < b);
});

t('cold wash has no heating', () => {
  assert.equal(E.timing(m, st('4', '0', '600')).phases.heat, 0);
});

t('synthetics stop with water and suggest 12 to continue', () => {
  const s = st('9', '40', '600');
  assert.equal(E.timing(m, s).end, 'water-stop');
  assert.equal(E.continueAfterWaterStop(m, s).spin, '12');
});

t('water-stop button holds before spin on cotton', () => {
  const r = E.timing(m, st('4', '40', '600', { waterstop: true }));
  assert.equal(r.end, 'water-stop');
  assert.ok(!r.path.includes('7'));
});

t('no spin uses the short drain time', () => {
  assert.equal(E.timing(m, st('7', '0', '0')).total, 3);
  assert.equal(E.timing(m, st('7', '0', '600')).total, 7);
});

t('wool at 90 is an error', () => {
  const c = E.conflicts(m, st('14', 'MAX', '400'));
  assert.ok(c.some(x => x.level === 'error' && /40/.test(x.message)));
});

t('spin above program limit warns', () => {
  const c = E.conflicts(m, st('9', '40', '800'));
  assert.ok(c.some(x => x.level === 'warn' && /600/.test(x.message)));
});

t('half-load on wool warns', () => {
  const c = E.conflicts(m, st('14', '30', '400', { half: true }));
  assert.ok(c.some(x => x.level === 'warn' && /1\/2/.test(x.message)));
});

t('stop position is an error', () => {
  const c = E.conflicts(m, st('stop-a', '40', '600'));
  assert.equal(c[0].level, 'error');
});

t('temperature on rinse is info, not error', () => {
  const c = E.conflicts(m, st('5', '60', '600'));
  assert.ok(c.every(x => x.level !== 'error'));
});

t('dosing follows the walk', () => {
  assert.deepEqual([...E.dosing(m, st('1', '60', '600'))].sort(), ['1', '2', '4']);
  assert.deepEqual([...E.dosing(m, st('6', '0', '600'))], ['4']);
});

t('program defaults pick manual temperature and max spin', () => {
  const s = E.withProgramDefaults(m, st('14', 'MAX', '800'));
  assert.equal(s.temp, '30');
  assert.equal(s.spin, '400');
});

t('search normalisation maps Cyrillic brand', () => {
  assert.ok(E.searchKeys('Индезит WGS-834').includes('indesitwgs834'));
});

console.log(`${n} passed`);
