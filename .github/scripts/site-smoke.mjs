// Post-deploy check of the live site: every sitemap page answers 200 with
// HTML, the agent files answer 200, unknown paths answer 404, www and http
// redirect to https://washguide.ru. Retried, because a fresh host name may
// wait a minute for its certificate.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = 'https://washguide.ru';
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 10);
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 30_000);

const sitemap = await readFile(resolve(import.meta.dirname, '../../dist/sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>https:\/\/washguide\.ru([^<]*)<\/loc>/g)].map((match) => match[1]);
const files = {
  '/llms.txt': 'text/plain',
  '/robots.txt': 'text/plain',
  '/machines.json': 'application/json',
  '/search-index.json': 'application/json',
  '/en/search-index.json': 'application/json'
};

async function check() {
  const failures = [];
  try {
    for (const path of pages) {
      const response = await fetch(`${base}${path}`, { redirect: 'manual' });
      if (response.status !== 200) failures.push(`${path}: HTTP ${response.status}`);
      else if (!response.headers.get('content-type')?.startsWith('text/html')) failures.push(`${path}: not HTML`);
    }
    for (const [path, type] of Object.entries(files)) {
      const response = await fetch(`${base}${path}`, { redirect: 'manual' });
      if (response.status !== 200) failures.push(`${path}: HTTP ${response.status}`);
      else if (!response.headers.get('content-type')?.startsWith(type)) failures.push(`${path}: ${response.headers.get('content-type')}, expected ${type}`);
    }
    const missing = await fetch(`${base}/this-page-does-not-exist/`, { redirect: 'manual' });
    if (missing.status !== 404) failures.push(`unknown path: HTTP ${missing.status}, expected 404`);
    for (const from of ['https://www.washguide.ru/en/', 'http://washguide.ru/en/']) {
      const response = await fetch(from, { redirect: 'manual' });
      const location = response.headers.get('location');
      if (response.status < 300 || response.status > 308 || location !== `${base}/en/`) {
        failures.push(`${from}: HTTP ${response.status} to ${location}, expected a redirect to ${base}/en/`);
      }
    }
  } catch (error) {
    failures.push(`${error.cause?.code ?? error.name}: ${error.cause?.message ?? error.message}`);
  }
  return failures;
}

for (let attempt = 1; ; attempt += 1) {
  const failures = await check();
  if (failures.length === 0) {
    console.log(`Production OK: ${pages.length} pages, agent files, 404 page, www and http redirects.`);
    break;
  }
  if (attempt >= attempts) {
    console.error(`Production check failed after ${attempt} attempts:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Attempt ${attempt}: ${failures.length} problem(s), retrying in ${delayMs / 1000}s.`);
  await new Promise((done) => setTimeout(done, delayMs));
}
