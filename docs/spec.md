# washguide — design

Reference service for old electromechanical washing machines with confusing panels.
A visitor finds their machine, sees its panel and detergent drawer drawn as they really look,
and gets the exact knob positions for a task, with an honest time estimate and conflict warnings.

## Goals

- Many machines, each with its own panel, drawer, timer cycle, programs and rules (`docs/schema.md`).
- Find a machine fast: search by brand, model, Cyrillic or Latin spelling, or panel features.
- Interactive panel: turn knobs and press buttons yourself; the page recomputes
  the remaining time and lists conflicts for the current combination.
- Presets for everyday tasks set all controls at once.
- Mobile first: panel is SVG with a viewBox, no horizontal page scroll at 360 px.
- Indexable by search engines and AI agents without running JS.

## Non-goals (v1)

User accounts, uploads, server-side code, comments, deployment (static `dist/` keeps any host open).

## Architecture

```
data/machines/<id>.json   source of truth, one file per machine
scripts/build.mjs         Node, no dependencies: validates data, renders dist/
src/app.js                browser: panel renderer, timing engine, conflict engine, search
src/engine.js             pure functions shared by build (prerender) and browser
src/style.css             one stylesheet, light + dark tokens
dist/                     index.html, m/<id>/index.html, m/<id>.json, search-index.json,
                          llms.txt, llms-full.txt, robots.txt, sitemap.xml
```

`engine.js` is plain ES module code used both by `build.mjs` (to prerender the default state
into HTML) and by the page (to recompute on interaction). One implementation, no drift.

## Timing engine

Program knob position = entry point into `cycle.steps`. The timer walks the steps in order
from that position until the first step with `end`. Remaining time:

```
sum(step.min for walked steps)
+ heating minutes, if cycle.timerPausesForHeating and a walked step heats:
    litres * 4.186 kJ/(kg*K) * (target - inlet) / (heaterW / 1000) / 60
    litres scaled by any active option's waterFactor;
    target = min(temp knob tempC, step.maxHeatC, program tempMaxC)
+ spin step uses 0 min of spinning if spin knob = 0 (drain only), as declared in data
```

Output: total minutes, breakdown by phase, the walked path (shown as a strip of dial
positions), end condition (stops by itself / stops with water / drains). Every result is
labeled "оценка" when `cycle.estimate` is true, and the manual's stated duration is shown
next to it when the program table has one.

## Conflict engine

For the current control state, collect:

1. Derived from `programs[pos]`: temperature above `tempMaxC`, spin above `spinMaxRpm`,
   option button pressed that is not in `options`.
2. Every `rules[]` entry whose `when` matches.
3. Generic: program knob on a stop position; temperature set but the walked path never heats
   (info: "нагрев не используется"); ends with water stop (info with how to continue).

Levels: error (do not run like this), warn (works but harmful/wasteful), info.

## UI

- Home: search box, filter chips (brand, loading type, panel features), grid of machine cards
  with a mini panel drawing.
- Machine page, top to bottom on mobile:
  1. Header: brand, model, years, one-line summary, pitfalls.
  2. Task picker (presets) as horizontally scrollable chips.
  3. Panel (SVG), interactive. Tap a knob label to set it, tap a button to toggle.
  4. Result card: settings in words, time, path strip, conflicts, how it ends.
  5. Drawer (SVG) with compartments lit for the current program.
  6. Tabs: all programs (table, tap to set), troubleshooting, care, sources.
- Desktop: panel and result side by side.

## Agent discoverability

`llms.txt` (what the site is, how to use it, URL patterns, JSON endpoints), `llms-full.txt`
(all machines as text), `robots.txt` allowing AI crawlers, `sitemap.xml`, JSON-LD per page,
`<link rel="alternate" type="application/json">`, and a visually hidden (`sr-only`, in the DOM)
block per page that tells agents where the structured data is. No `display:none` cloaking.

## Data honesty

Values come from the manufacturer's manual with page references. Estimates are flagged
in data and in the UI. Each machine page lists its sources and known gaps.

## Testing

`node scripts/build.mjs --check` validates every machine file (required fields, positions
referenced by programs/presets/steps exist, every walk reaches an end). `node scripts/test-engine.mjs`
runs engine assertions (timing, conflicts) on fixtures. Visual check in a browser at 375 px
and desktop.
