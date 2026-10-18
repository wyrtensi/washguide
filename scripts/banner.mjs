// Render docs/banner.svg (English) and docs/banner.ru.svg (Russian) for the READMEs from the real panel renderer.
import { readFileSync, writeFileSync } from 'node:fs';
import * as E from '../src/engine.js';
import * as R from '../src/render.js';
import { localize } from '../src/i18n.js';

const load = (id, lang) => localize(JSON.parse(readFileSync(new URL(`../data/machines/${id}.json`, import.meta.url), 'utf8')), lang);

const TEXTS = {
  en: {
    file: 'banner.svg',
    subtitle: 'How to work old washing machines with confusing panels',
    line3: 'washguide.ru  ·  interactive panels · time estimates · conflict checks · RU / EN'
  },
  ru: {
    file: 'banner.ru.svg',
    subtitle: 'Как пользоваться старыми стиральными машинами с непонятной панелью',
    line3: 'washguide.ru  ·  панель как на машине · время стирки · проверка настроек · RU / EN'
  }
};

const W = 1280, H = 640;
const inner = (m, uid) => {
  const svg = R.panelSVG(m, E.defaultState(m), { layout: 'machine', uid, interactive: false, mini: true });
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { body: svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), w: Number(vb[1]), h: Number(vb[2]) };
};

function render(lang) {
  const t = TEXTS[lang];
  const panels = ['indesit-wgs-834-txr'].map(id => load(id, lang));
  let y = 262;
  const rows = panels.map((m, i) => {
    const p = inner(m, `b${i}`);
    const scale = 1100 / p.w;
    const out = `<g transform="translate(90 ${y}) scale(${scale.toFixed(4)})">${p.body}</g>`;
    y += p.h * scale + 18;
    return out;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>.hit{fill:transparent}.pos.on .hit{fill:#1d4ed8}.pos.on text{fill:#fff}.cap{font-size:15px;font-weight:700}text{font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:650}</style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101216"/><stop offset="1" stop-color="#1b2433"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    <text x="90" y="118" font-size="64" font-weight="800" fill="#e8eaef">washguide</text>
    <text x="90" y="170" font-size="30" fill="#98a1b0">${t.subtitle}</text>
    <text x="90" y="212" font-size="24" fill="#8ab4ff">${t.line3}</text>
  </g>
  <g opacity=".95">${rows.join('\n')}</g>
  
</svg>
`;
  writeFileSync(new URL(`../docs/${t.file}`, import.meta.url), svg);
  console.log(`docs/${t.file} written`);
}

for (const lang of Object.keys(TEXTS)) render(lang);
