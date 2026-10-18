# Machine data schema

One file per machine: `data/machines/<id>.json`, UTF-8, user-facing strings in Russian.
`id` is kebab-case latin: `<brand>-<model>`, e.g. `indesit-wgs-834-txr`.

Every number that comes from the manual carries its page in `sources` / `sourcePage`.
Anything not taken from the manual is marked `"estimate": true` or listed in `notes.assumptions`.
Never invent values silently: if the manual does not give a value, leave the field out
and say so in `notes.gaps`.

```jsonc
{
  "id": "indesit-wgs-834-txr",
  "brand": "Indesit",
  "model": "WGS 834 TXR",
  "aliases": ["индезит wgs 834", "wgs834", "WGS 834 TX"],   // search terms, cyr + lat
  "years": "1998-2004",                                      // approximate is fine, say so in notes
  "loading": "front",                                         // front | top
  "capacityKg": 3.5,
  "maxSpinRpm": 800,
  "heaterW": 1800,                                            // if the manual states it
  "summary": "Одна-две фразы: что за машина и чем запутывает панель.",
  "pitfalls": [                                                // the confusing bits, short
    "Ручку программ можно крутить только по часовой стрелке и только при выключенной машине."
  ],

  "panel": {
    "face": "#e8d8bf",          // panel plastic colour (hex), approximate from photos
    "ink": "#3b2a17",           // print colour on the panel
    "rows": [                   // one row on most machines; controls listed left to right
      ["power", "half", "waterstop", "lamp-on", "spin", "temp", "prog"]
    ],
    "controls": [
      {
        "id": "power", "type": "button", "role": "power",
        "label": "I/O",                     // text/symbol printed next to the control
        "symbol": "power",                  // optional icon key, see "Symbols" below
        "latching": true,                   // stays pressed (true) or momentary (false)
        "help": "Включение/выключение. Программа стартует при нажатии."
      },
      {
        "id": "half", "type": "button", "role": "option", "label": "1/2", "symbol": "half-load",
        "latching": true, "effect": { "waterFactor": 0.7 },
        "help": "Половинная загрузка: меньше воды."
      },
      { "id": "lamp-on", "type": "lamp", "color": "red", "lit": "power", "label": "", "help": "Горит, когда машина включена." },
      {
        "id": "prog", "type": "knob", "role": "program", "label": "P",
        "rotation": "cw-only",               // cw-only | free
        "pointer": "bar",                    // bar | notch | arrow  (how the knob shows its position)
        "positions": [                        // clockwise from 12 o'clock, angle in degrees 0..359
          { "value": "1", "label": "1", "angle": 8, "zone": "cotton" },
          { "value": "stop-a", "label": "•", "angle": 181, "stop": true }
        ],
        "zones": [ { "id": "cotton", "label": "Хлопок", "color": "#0d9488" } ],
        "help": "..."
      },
      {
        "id": "temp", "type": "knob", "role": "temperature", "label": "°C", "rotation": "free", "pointer": "bar",
        "positions": [
          { "value": "0", "label": "*", "angle": 0, "tempC": 0 },     // 0 = cold / no heating
          { "value": "40", "label": "40", "angle": 122, "tempC": 40 }
        ]
      },
      {
        "id": "spin", "type": "knob", "role": "spin", "label": "об/мин", "rotation": "free", "pointer": "bar",
        "positions": [ { "value": "0", "label": "без отжима", "angle": 0, "rpm": 0 } ]
      }
    ]
  },
  // control.type: knob | button | lamp | slider (slider = linear selector, positions use "offset" 0..1 instead of angle)
  // control.role: program | temperature | spin | power | option | start | lamp
  // Symbols (icon keys): power, half-load, water-stop, no-spin, rinse, softener, prewash, eco,
  //                      intensive, extra-rinse, door, snowflake, bleach, wool, delicate, drain, spin, start

  "tray": {
    "location": "top-left",              // where the drawer is: top-left | top-right | top-centre | lid (top loaders)
    "layout": "columns",                 // columns (side by side, front view) | custom
    "compartments": [                    // left to right as seen from the front
      { "id": "I",  "mark": "I",  "use": "prewash",  "label": "Предварительная стирка", "width": 1 },
      { "id": "II", "mark": "II", "use": "main",     "label": "Основная стирка",       "width": 2 },
      { "id": "flower", "mark": "flower", "use": "softener", "label": "Кондиционер",   "width": 1 },
      { "id": "cl", "mark": "triangle-cl", "use": "bleach", "label": "Отбеливатель",   "width": 1 }
    ],
    "help": "Как вынимается лоток, что где моется."
  },
  // compartment.use: prewash | main | softener | bleach | starch
  // compartment.mark: what is printed on it: I | II | 1 | 2 | 3 | flower | triangle-cl | asterisk | text

  // Mechanical timer (cam). The machine starts at the position the program knob points to and
  // walks through the steps in order until a step with "end".
  // Durations are minutes of timer motor time WITHOUT heating (heating pauses the timer on most
  // thermostat machines; the engine adds it from water volume and heater power).
  "cycle": {
    "timerPausesForHeating": true,       // true for classic thermostat machines
    "washLitres": 12,                     // water heated in the main wash, estimate if not in manual
    "inletTempC": 15,
    "steps": [
      { "pos": "1", "phase": "prewash", "min": 20, "heats": true, "maxHeatC": 40, "dose": ["I"] },
      { "pos": "2", "phase": "wash",    "min": 30, "heats": true, "dose": ["II"] },
      { "pos": "5", "phase": "rinse",   "min": 15 },
      { "pos": "6", "phase": "rinse",   "min": 8, "dose": ["flower"] },
      { "pos": "7", "phase": "spin",    "min": 7, "end": "stop" }
      // end: "stop" (knob reaches a stop dot) | "water-stop" (stops with water in the drum) | "drain"
    ],
    "estimate": true
  },
  // phase: prewash | wash | rinse | softener | spin | drain | soak | pause

  "programs": [                           // straight from the manual's program table
    {
      "pos": "1",                         // program knob position value
      "name": "Хлопок, очень грязное, с предварительной стиркой",
      "fabric": "cotton",                 // cotton | synthetic | delicate | wool | mixed | special
      "tempMaxC": 90, "tempDefaultC": 90,
      "spinMaxRpm": 800,
      "dose": ["I", "II", "flower"],      // compartments the program uses
      "options": ["half", "waterstop"],   // option buttons allowed with this program
      "durationMin": 140, "durationAtC": 90,   // as stated in the manual, if stated
      "loadKg": 3.5,
      "ends": "stop",                     // stop | water-stop | drain
      "note": "",
      "sourcePage": 6
    }
  ],

  "rules": [                              // conflicts the engine checks; derive from the manual
    {
      "when": { "pos": ["14", "15", "16", "17", "18"] },
      "check": { "tempMaxC": 40 },        // tempMaxC | spinMaxRpm | forbidOptions: [] | requireOptions: []
      "level": "error",                   // error | warn | info
      "message": "Шерсть: не выше 40 °C, иначе вещи сядут.",
      "sourcePage": 6
    }
  ],
  // The engine also derives conflicts from programs[].tempMaxC / spinMaxRpm / options automatically;
  // rules[] are for anything extra (e.g. "button X must be released", "knob must be on stop to switch").

  "presets": [                            // everyday scenarios, neutral voice
    {
      "id": "everyday-40",
      "title": "Повседневная одежда",
      "group": "wash",                    // wash | rinse | spin | care
      "set": { "prog": "4", "temp": "40", "spin": "600", "half": false, "waterstop": false },
      "dose": { "II": "Порошок или гель" },
      "note": "Короткий путь: стирка, полоскание, отжим."
    }
  ],

  "troubleshooting": [ { "title": "...", "causes": ["..."], "sourcePage": 9 } ],
  "care": [ { "title": "...", "text": "...", "sourcePage": 8 } ],

  "sources": [
    { "title": "Инструкция по эксплуатации (RU)", "url": "https://...", "kind": "manufacturer", "pages": "1-12" }
    // kind: manufacturer | manual-archive | photo | forum
  ],
  "notes": {
    "assumptions": ["Углы меток на ручках сняты с фото панели, приблизительно."],
    "gaps": ["Инструкция не приводит длительность программ 10-13."]
  }
}
```

## Optional fields found in practice

| Field | Where | Meaning |
|---|---|---|
| `completeness: "partial"` | machine | The manual found lacks key tables; the page shows a "данные неполные" banner built from `notes.gaps`. |
| `cycle.dialMoves: false` | cycle | Electronic control: the program knob does not turn during the cycle; the page labels the step strip as program stages instead of the knob path. |
| `positions[].timerOnly: true` | knob position | A mark the timer passes through by itself (rinse, softener, end); shown on the panel, hidden from the input chips unless current. |
| `positions[].symbol` | knob position | Draw an icon instead of text (keys from "Symbols" above). |
| `positions[].short` | knob position | Shorter text for the dial when `label` is long. |
| `control.anglesEstimate: true` | knob | The manual has no knob drawing; angles are placeholders. |
| `control.name` | any control | Human name for text when the printed label is a symbol or abbreviation. |
| `lamp.lit: "door" \| "phase" \| "heat"` | lamp | What lights the lamp besides `power`. Informational. |
| `panel.programChangeWhenOff: true` | panel | Program knob may only be turned with the machine switched off; the page reminds about it. |
| `sourcePage` as string | anywhere | When the manual has no page numbers, a section or table reference, e.g. `"разд. 5, табл. 2"`. |
| repeated `pos` in `cycle.steps` | cycle | Several sub-steps on one position, or a separate step block per start position for electronic machines (each block ends with `end`). The walk starts at the first step with that `pos`. |
| preset `set` keyed by knob id | presets | `set` may use a knob's `id` instead of `prog`/`temp`/`spin`. |
