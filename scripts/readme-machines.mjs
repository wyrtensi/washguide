// Refresh the machine table in README.md between the machines:start/end markers.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = new URL('../data/machines/', import.meta.url);
const ms = readdirSync(dir).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
  .sort((a, b) => (a.brand + a.model).localeCompare(b.brand + b.model));
const rows = ms.map(m => {
  const pk = m.panel.controls.find(c => c.role === 'program');
  const kind = m.cycle?.dialMoves === false ? 'electronic, dial' : 'mechanical timer';
  const flag = m.completeness === 'partial' ? ' (incomplete data)' : '';
  return `| [${m.brand} ${m.model}](https://washguide.ru/en/m/${m.id}/) | ${m.en?.years || m.years || ''} | ${m.programs.length} | ${kind}${flag} |`;
});
const table = ['| Machine | Years | Programmes | Control |', '|---|---|---|---|', ...rows].join('\n');
const readme = new URL('../README.md', import.meta.url);
const s = readFileSync(readme, 'utf8');
writeFileSync(readme, s.replace(/<!-- machines:start -->[\s\S]*<!-- machines:end -->/, `<!-- machines:start -->\n${table}\n<!-- machines:end -->`));
console.log(`README: ${ms.length} machines`);
