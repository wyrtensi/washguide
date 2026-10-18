// Refresh the machine tables in README.md (English) and README.ru.md (Russian)
// between the machines:start/end markers.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const dir = new URL('../data/machines/', import.meta.url);
const ms = readdirSync(dir).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
  .sort((a, b) => (a.brand + a.model).localeCompare(b.brand + b.model));

const VARIANTS = {
  en: {
    file: '../README.md',
    base: 'https://washguide.ru/en/m/',
    header: ['Machine', 'Years', 'Programmes', 'Control'],
    years: m => m.en?.years || m.years || '',
    kind: m => (m.cycle?.dialMoves === false ? 'electronic, dial' : 'mechanical timer'),
    flag: ' (incomplete data)'
  },
  ru: {
    file: '../README.ru.md',
    base: 'https://washguide.ru/m/',
    header: ['Машина', 'Годы', 'Программ', 'Управление'],
    years: m => m.years || '',
    kind: m => (m.cycle?.dialMoves === false ? 'электронное, ручка' : 'механический таймер'),
    flag: ' (неполные данные)'
  }
};

for (const v of Object.values(VARIANTS)) {
  const rows = ms.map(m => {
    const flag = m.completeness === 'partial' ? v.flag : '';
    return `| [${m.brand} ${m.model}](${v.base}${m.id}/) | ${v.years(m)} | ${m.programs.length} | ${v.kind(m)}${flag} |`;
  });
  const table = [`| ${v.header.join(' | ')} |`, '|---|---|---|---|', ...rows].join('\n');
  const path = new URL(v.file, import.meta.url);
  if (!existsSync(path)) { console.log(`${v.file}: missing, skipped`); continue; }
  const s = readFileSync(path, 'utf8');
  writeFileSync(path, s.replace(/<!-- machines:start -->[\s\S]*<!-- machines:end -->/, `<!-- machines:start -->\n${table}\n<!-- machines:end -->`));
  console.log(`${v.file}: ${ms.length} machines`);
}
