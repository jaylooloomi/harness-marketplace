#!/usr/bin/env node
/**
 * diversity.js — anti-homogeneity lever ①: draw randomized aesthetic constraints
 * from data/constraint-deck.json, biased AWAY from those used in recent runs
 * (read from the persistent design-archive.json). Injected at SKILL Step 0; the
 * generator must honor the drawn cards so each task starts in a DIFFERENT region.
 *
 * (entropy = random draw; memory = avoid recently-used. The archive itself —
 * lever ③ — is written/read by the skill; this script only consumes it for bias.)
 *
 * Usage:
 *   node diversity.js draw [--data-dir <dir>]   # -> {"constraints":[{axis,value},...]}
 *   node diversity.js selftest
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const DECK_PATH = path.join(PLUGIN_ROOT, 'data', 'constraint-deck.json');

function argVal(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; }
function dataDir() {
  return argVal('--data-dir') || process.env.CLAUDE_PLUGIN_DATA
    || path.join(os.homedir(), '.claude', 'plugins', 'data', 'auto-review');
}
function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Values used across the last N archived runs (to bias the draw away from them).
function recentlyUsed(archive, n) {
  const used = new Set();
  for (const e of (archive || []).slice(-n)) for (const c of (e.constraints || [])) used.add(c.value);
  return used;
}

// Draw: always 1 "movement" card + 1 card from a random other axis, each chosen
// from the values NOT used recently (falls back to the full axis if all are recent).
function draw(deck, recent) {
  const axes = Object.keys(deck.axes);
  const movementAxis = deck.axes.movement ? 'movement' : axes[0];
  const otherAxes = axes.filter(a => a !== movementAxis);
  const otherAxis = pick(otherAxes);
  const fromAxis = (axis) => {
    let pool = deck.axes[axis].filter(v => !recent.has(v));
    if (!pool.length) pool = deck.axes[axis];
    return pick(pool);
  };
  return [
    { axis: movementAxis, value: fromAxis(movementAxis) },
    { axis: otherAxis, value: fromAxis(otherAxis) },
  ];
}

function main() {
  const mode = process.argv[2] || 'draw';
  if (mode === 'selftest') return selftest();

  const deck = readJson(DECK_PATH, null);
  if (!deck || !deck.axes) {
    console.log(JSON.stringify({ error: true, reason: 'constraint-deck.json missing or invalid' }));
    process.exit(1);
  }
  const archive = readJson(path.join(dataDir(), 'design-archive.json'), []);
  const recent = recentlyUsed(archive, 8);
  const constraints = draw(deck, recent);
  console.log(JSON.stringify({ constraints, avoided_recent: [...recent] }, null, 2));
}

function selftest() {
  const deck = readJson(DECK_PATH, null);
  let pass = 0, total = 0;
  const check = (n, c) => { total++; if (c) pass++; process.stdout.write(`${c ? '✓' : '✗'} ${n}\n`); };

  check('deck loads with axes', !!(deck && deck.axes && deck.axes.movement));

  // 20 draws: always 2 constraints, each a valid {axis,value} present in the deck.
  let ok = true;
  for (let i = 0; i < 20; i++) {
    const cs = draw(deck, new Set());
    if (cs.length !== 2) { ok = false; break; }
    for (const c of cs) if (!deck.axes[c.axis] || !deck.axes[c.axis].includes(c.value)) { ok = false; break; }
  }
  check('20 draws all valid (2 cards, real axis+value)', ok);

  // recency bias: if all movement values but one are "recent", that one is drawn.
  const movs = deck.axes.movement;
  const recent = new Set(movs.slice(1));
  let onlyFirst = true;
  for (let i = 0; i < 20; i++) {
    const cs = draw(deck, recent);
    const m = cs.find(c => c.axis === 'movement');
    if (m.value !== movs[0]) { onlyFirst = false; break; }
  }
  check('recency bias excludes recently-used movement values', onlyFirst);

  process.stdout.write(`\n${pass}/${total} passed\n`);
  process.exit(pass === total ? 0 : 1);
}

main();
