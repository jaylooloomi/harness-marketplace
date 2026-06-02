#!/usr/bin/env node
/**
 * iteration-decision.js — the harness loop's single deterministic decision point.
 *
 * Replaces the prose arithmetic that used to live in SKILL.md Step 5. It owns,
 * in ONE place, the state the loop depends on (fixes D5/O1/O2/D6/A1/D7):
 *   - the authoritative iteration count (derived from score.json files on disk,
 *     so the generator/evaluator/skill no longer each recompute N — O2)
 *   - the score series (derived from the score.json files = single source of
 *     truth, then mirrored into context.iteration_scores for visibility — O1)
 *   - schema validation of every round's score.json — the latest blocks, an
 *     earlier malformed round warns and is excluded from the math (D6)
 *   - plateau / forced-pivot decision, with a trajectory guard so a healthy
 *     sub-threshold run is not pivoted away from near-success (D7)
 *   - the frame_shift_active lifecycle: SET on a pivot round, always CLEARED
 *     on a refine round, so a stale frame never leaks forward (A1)
 *
 * Usage:
 *   node iteration-decision.js [<harness_dir>]   # default: .harness
 *   node iteration-decision.js selftest
 *
 * Emits the decision as JSON to stdout. The skill reads it and acts; it does
 * not redo any of this arithmetic itself.
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const FRAME_SHIFT_PATH = path.join(PLUGIN_ROOT, 'data', 'frame-shift-prompts.json');

const DEFAULTS = {
  threshold: 90,        // score >= threshold -> done
  max_iterations: 10,   // hard cap
  plateau_window: 3,    // look back this many rounds
  plateau_delta: 3,     // max-min < this over the window -> plateau
  improve_delta: 4,     // last round gained >= this -> "strongly improving" (D7 guard)
};

// ---------- pure decision logic (no IO, unit-tested by selftest) ----------

function validateScore(obj, iterLabel) {
  const errs = [];
  if (!obj || typeof obj !== 'object') return [`${iterLabel}: score.json is not an object`];
  if (typeof obj.total !== 'number' || Number.isNaN(obj.total)) errs.push(`${iterLabel}: "total" must be a number`);
  if (!Array.isArray(obj.dimensions)) errs.push(`${iterLabel}: "dimensions" must be an array`);
  if (obj.strategy !== undefined && obj.strategy !== 'refine' && obj.strategy !== 'pivot') {
    errs.push(`${iterLabel}: "strategy" must be "refine" or "pivot"`);
  }
  return errs;
}

/**
 * @param {number[]} totals   score totals in iteration order (index 0 = iter 1)
 * @param {string}   lastStrategy  evaluator's own strategy on the latest round
 * @param {object}   cfg      merged DEFAULTS
 * @returns decision object (frame selection handled by caller)
 */
function decide(totals, lastStrategy, cfg) {
  const iter = totals.length;
  const latest = totals[iter - 1];

  if (latest >= cfg.threshold) {
    return { iteration: iter, total: latest, done: true, next_strategy: 'done',
      forced: false, reason: `score ${latest} >= threshold ${cfg.threshold}` };
  }
  if (iter >= cfg.max_iterations) {
    return { iteration: iter, total: latest, done: true, next_strategy: 'done',
      forced: false, max_iterations_reached: true,
      reason: `reached max_iterations ${cfg.max_iterations} without hitting ${cfg.threshold}; output all versions` };
  }

  const window = totals.slice(-cfg.plateau_window).filter(t => typeof t === 'number');
  const plateau = iter >= cfg.plateau_window && window.length >= 2 &&
    (Math.max(...window) - Math.min(...window) < cfg.plateau_delta);
  const prev = totals[iter - 2];
  const improving = iter >= 2 && typeof prev === 'number' && typeof latest === 'number' &&
    (latest - prev >= cfg.improve_delta);
  const cadence = iter % 3 === 0;
  const evaluatorPivot = lastStrategy === 'pivot';

  // D7: cadence forces a pivot ONLY when the run is not strongly improving.
  // Plateau and the evaluator's own pivot still force regardless of trajectory.
  const cadencePivot = cadence && !improving;
  const forcePivot = plateau || evaluatorPivot || cadencePivot;
  const next_strategy = forcePivot ? 'pivot' : 'refine';

  const reasons = [];
  if (plateau) reasons.push(`plateau: last ${window.length} scores [${window.join(', ')}] vary < ${cfg.plateau_delta}`);
  if (cadence && improving) reasons.push(`cadence round (iter%3) but improving by >=${cfg.improve_delta} -> allow refine (D7 guard)`);
  if (cadencePivot) reasons.push(`cadence round (iter%3==0) and not strongly improving -> pivot`);
  if (evaluatorPivot) reasons.push('evaluator chose pivot');
  if (!forcePivot) reasons.push(`refining (score ${latest} < ${cfg.threshold}, no pivot trigger)`);

  return {
    iteration: iter,
    total: latest,
    done: false,
    next_iteration: iter + 1,
    next_strategy,
    forced: forcePivot && !evaluatorPivot, // we added/overrode a pivot beyond the evaluator's call
    plateau, improving, cadence,
    need_frame_shift: next_strategy === 'pivot',
    reason: reasons.join('; '),
  };
}

// ---------- frame-shift selection ----------

function selectFrameShift(decision, ctx, taskTags) {
  if (!decision.need_frame_shift) return null;
  let prompts = [];
  try { prompts = JSON.parse(fs.readFileSync(FRAME_SHIFT_PATH, 'utf8')).prompts || []; } catch { return null; }

  const used = new Set(ctx.frame_shift_used || []);
  let pool = prompts.filter(p => !used.has(p.id));

  // Task-type gate (D2): keep prompts whose applies_to intersects the task tags
  // (or are universal / untagged). Falls back to the full pool if none match.
  if (taskTags && taskTags.length) {
    const typed = pool.filter(p => !p.applies_to || p.applies_to.includes('any') ||
      p.applies_to.some(t => taskTags.includes(t)));
    if (typed.length) pool = typed;
  }
  if (!pool.length) return null; // all used / none applicable

  // Deterministic relevance: overlap between the critical_issue text and each
  // frame's lens/question; ties resolved by original array order (no randomness).
  // Tokens: Latin words (>=4 chars) + CJK character bigrams, so a multi-concept
  // Chinese critical_issue can partially overlap a frame's lens instead of
  // requiring an exact full-run substring match (which essentially never hit).
  const issue = String(ctx._critical_issue || '').toLowerCase();
  const tokens = new Set(issue.match(/[a-z]{4,}/g) || []);
  for (const run of issue.match(/[一-龥]{2,}/g) || []) {
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  const score = (p) => {
    const hay = `${p.frame} ${p.trigger_question} ${p.thinking_lens}`.toLowerCase();
    let n = 0;
    for (const t of tokens) if (hay.includes(t)) n++;
    return n;
  };
  pool.sort((a, b) => score(b) - score(a)); // stable in V8 for equal keys -> preserves order
  return pool[0];
}

// ---------- IO orchestration ----------

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function collectScores(harnessDir) {
  const outDir = path.join(harnessDir, 'output');
  const found = [];
  if (fs.existsSync(outDir)) {
    for (const name of fs.readdirSync(outDir)) {
      const m = name.match(/^iteration_(\d+)$/);
      if (!m) continue;
      const sp = path.join(outDir, name, 'score.json');
      if (fs.existsSync(sp)) found.push({ n: Number(m[1]), score: readJson(sp, null), label: name });
    }
  }
  found.sort((a, b) => a.n - b.n);
  const maxN = found.length ? found[found.length - 1].n : 0;
  return { found, maxN };
}

function main() {
  if ((process.argv[2] || '') === 'selftest') return selftest();

  const harnessDir = process.argv[2] || '.harness';
  const ctxPath = path.join(harnessDir, 'context.json');
  const ctx = readJson(ctxPath, {});
  const dims = readJson(path.join(harnessDir, 'dimensions.json'), {});
  const taskType = dims.task_type || ctx.task_type || null;
  const taskTags = Array.isArray(dims.task_tags) ? dims.task_tags
    : (Array.isArray(ctx.task_tags) ? ctx.task_tags : null);
  const cfg = { ...DEFAULTS, threshold: ctx.threshold ?? DEFAULTS.threshold,
    max_iterations: ctx.max_iterations ?? DEFAULTS.max_iterations };

  const { found, maxN } = collectScores(harnessDir);
  if (!found.length) {
    console.log(JSON.stringify({ error: true, reason: 'no score.json found under output/iteration_*; run the evaluator first' }, null, 2));
    process.exitCode = 1;
    return;
  }

  // The round number is the max iteration_<n> index that has a score.json — the
  // SINGLE authoritative count (O2). Require contiguity: every iteration_1..maxN
  // must have a score.json, else the series misaligns (finding #1, e.g. a crashed
  // round left a gap). Block and ask for the missing round rather than miscount.
  if (found.length !== maxN) {
    const present = new Set(found.map(s => s.n));
    const missing = [];
    for (let i = 1; i <= maxN; i++) if (!present.has(i)) missing.push(i);
    console.log(JSON.stringify({ error: true, missing,
      reason: `score.json missing for iteration(s) ${missing.join(', ')} (gap up to iteration_${maxN}); re-run the evaluator for the missing round(s)` }, null, 2));
    process.exitCode = 1;
    return;
  }

  // Validate the LATEST round before trusting its number — block on failure (D6).
  const latest = found[found.length - 1];
  const latestErrs = validateScore(latest.score, latest.label);
  if (latestErrs.length) {
    console.log(JSON.stringify({ error: true, validation_errors: latestErrs,
      reason: `latest ${latest.label}/score.json is malformed; re-run the evaluator` }, null, 2));
    process.exitCode = 1;
    return;
  }
  // Validate EARLIER rounds too: don't block, but exclude their totals from the
  // math and surface a warning instead of silently zeroing them (finding #2).
  const invalidEarlier = found.slice(0, -1).filter(s => validateScore(s.score, s.label).length).map(s => s.n);

  const numOrNull = (s) => (s.score && typeof s.score.total === 'number') ? s.score.total : null;
  const totals = found.map(numOrNull);
  const lastStrategy = latest.score.strategy || 'refine';

  ctx._critical_issue = latest.score.critical_issue || '';
  const decision = decide(totals, lastStrategy, cfg);
  const frame = selectFrameShift(decision, ctx, taskTags);
  if (invalidEarlier.length) {
    decision.warning = `earlier round(s) ${invalidEarlier.join(', ')} have a malformed score.json; their totals are excluded from the plateau math`;
  }

  // --- own the state writes (single source of truth) ---
  ctx.iteration_scores = found.map(s => ({ iteration: s.n, total: numOrNull(s) }));
  ctx.frame_shift_active = frame || null;            // A1: always null on refine rounds
  if (frame) {
    ctx.frame_shift_used = Array.from(new Set([...(ctx.frame_shift_used || []), frame.id]));
  }
  delete ctx._critical_issue;
  try { fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 2)); } catch (e) {
    decision.warning = `could not write ${ctxPath}: ${e.message}`;
  }

  decision.task_type = taskType;
  decision.task_tags = taskTags;
  decision.frame_shift_active = frame ? { id: frame.id, frame: frame.frame,
    trigger_question: frame.trigger_question } : null;
  console.log(JSON.stringify(decision, null, 2));
}

// ---------- selftest ----------

function selftest() {
  const cfg = DEFAULTS;
  let pass = 0, total = 0;
  const check = (name, got, want) => {
    total++;
    const ok = got === want;
    if (ok) pass++;
    process.stdout.write(`${ok ? '✓' : '✗'} ${name}: got ${got}, want ${want}\n`);
  };

  // 1. >= threshold -> done
  let d = decide([92], 'refine', cfg);
  check('score 92 -> done', d.done, true);

  // 2. low single round -> refine
  d = decide([70], 'refine', cfg);
  check('iter1 70 -> refine', d.next_strategy, 'refine');

  // 3. plateau (80,81,82 span 2 < 3) at iter3 -> pivot
  d = decide([80, 81, 82], 'refine', cfg);
  check('plateau -> pivot', d.next_strategy, 'pivot');
  check('plateau flagged', d.plateau, true);

  // 4. D7 guard: iter3 climbing 70->78->85 (cadence round) -> refine, NOT pivot
  d = decide([70, 78, 85], 'refine', cfg);
  check('climbing iter3 -> refine (D7)', d.next_strategy, 'refine');
  check('climbing iter3 not forced', d.forced, false);

  // 5. cadence iter3 flat-ish but not plateau-tight, not improving (80->82->83 span3 not <3, gain 1<4) -> pivot
  d = decide([80, 82, 83], 'refine', cfg);
  check('cadence not improving -> pivot', d.next_strategy, 'pivot');

  // 6. evaluator pivot honored even when improving
  d = decide([60, 80], 'pivot', cfg);
  check('evaluator pivot honored', d.next_strategy, 'pivot');
  check('evaluator pivot not "forced" by us', d.forced, false);

  // 7. max iterations cap -> done
  d = decide([50, 51, 52, 53, 54, 55, 56, 57, 58, 59], 'refine', cfg);
  check('max iterations -> done', d.done, true);
  check('max flagged', !!d.max_iterations_reached, true);

  // 8. iter4 healthy improving (not cadence, not plateau) -> refine
  d = decide([60, 70, 80, 85], 'refine', cfg);
  check('iter4 improving -> refine', d.next_strategy, 'refine');

  // 9. null-robust (finding #2): a malformed earlier round (null total) must not
  // crash the math; plateau is computed from the valid values [80, 82].
  d = decide([80, null, 82], 'refine', cfg);
  check('null-in-series -> decides without crash', d.next_strategy, 'pivot');

  process.stdout.write(`\n${pass}/${total} passed\n`);
  process.exit(pass === total ? 0 : 1);
}

main();
