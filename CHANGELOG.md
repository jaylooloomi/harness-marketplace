# Changelog

All notable changes to harness-plugin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-25

### Why this release
End-to-end testing (Taiwan Palace Museum, 2026-05-25) surfaced a fundamental
limitation: harness was a **polishing system, not a creative system**. It
could iterate within a given frame but never found new frames. The 3D
gallery breakthrough only happened because a human (Arthur) injected a
reference image. Without that, iter_1 → iter_n would polish forever.

v1.1.0 adds three structural mechanisms to systematically push past
conventional thinking, drawn from the lessons of that test.

### Added
- **Step 0: References + Forbidden Patterns** (new in SKILL.md). Before
  selector runs, the harness asks the user for 1-3 reference URLs/images
  representing the "ceiling" for the task. Stored in `.harness/context.json`
  alongside the loaded anti-pattern list.
- **`data/global-forbidden.json`** — 12 anti-patterns AI generators
  routinely fall into (default sans-serif fonts, purple/blue gradients,
  hero+grid+footer structure, generic CTA copy, sticky-nav-blur, etc.).
  Generator **must violate at least 1 per iteration** and document it.
  User can override via `additional_forbidden` / `disabled_forbidden`
  in `.harness/context.json`.
- **`data/frame-shift-prompts.json`** — 8 lateral-thinking framings
  (physical exhibition, photo book, video game level, magazine spread,
  handwritten letter, documentary film, subway map, tarot card spread).
  Injected on forced-pivot rounds.
- **Plateau detection in SKILL.md Step 5b**: if iter ≥ 3 and the last
  3 scores vary by < 3 points, the harness detects a polish trap.
- **Forced pivot + frame-shift injection in Step 5c-5d**: triggered by
  plateau OR every 3rd iteration. A frame-shift prompt is selected
  (excluding already-used ones) and passed to the next generator round.

### Changed
- **`harness-planner.md`** now requires at least one dimension to directly
  benchmark against `context.json.references`. The `generator_instruction`
  must include the forbidden-pattern requirement.
- **`harness-generator.md`** now requires reading `context.json`, picking
  ≥1 forbidden pattern to violate per iteration, and documenting violations
  in `generator_notes.md`. On pivot rounds, generator must first think in
  the active frame-shift frame and translate back to web.
- **`harness-evaluator.md`** now uses WebFetch to load reference URLs,
  must benchmark concretely against references (no "feels close" hand-waving),
  and verifies the generator's claimed forbidden violations — empty or
  hand-wavy violations deduct 5-10 points.

### Why these specific mechanisms (and not others)
Considered but deferred to future versions:
- Multi-evaluator personas with conflicting values (would require multi-agent
  architecture changes)
- N-parallel generation per round (would require new orchestration layer)
- Self-learning forbidden list (system observes AI patterns and grows the
  list) — defer to v1.2

The three included mechanisms were chosen because they (a) cover the three
distinct failure modes observed in testing (no taste anchor, AI default
patterns, polish trap), (b) plug into the existing skill+agent architecture
without restructuring, and (c) keep the harness user-overridable rather
than dogmatic.

---

## [1.0.3] — 2026-05-25

### Changed
- **Iteration threshold raised from 80 → 90.** The harness now keeps iterating
  generator+evaluator until the weighted total reaches 90, instead of 80.
  Stricter quality bar produces more polished output at the cost of more rounds
  (still capped at 10 iterations).
- Updated SKILL.md Step 5, harness-evaluator.md success message, and
  README.md flow diagram + FAQ to reflect the new threshold.

### Why
Real-world testing (Taiwan Palace Museum site, 2026-05-25) showed that
iteration 1 could already reach 83 with a strong planner + role selection —
threshold 80 was no longer a meaningful filter. Raising to 90 forces at
least one polish round for non-trivial work.

---

## [1.0.2] — 2026-05-25

### Added
- `scripts/screenshot.js` — Node + puppeteer-core implementation that captures
  **full-page screenshots** and **per-section screenshots** (one per
  `<section id="...">`) using `headless=new` + `fullPage: true` +
  `scrollIntoView`.
- `install-agents.sh` now also installs `puppeteer-core` into
  `${CLAUDE_PLUGIN_DATA}/screenshot-tool/` when Node + npm are present.
  Gracefully warns and skips when not installed.

### Changed
- `scripts/screenshot.sh` detects Node + puppeteer-core and uses
  `screenshot.js` automatically; falls back to the v1.0.1 chrome CLI
  behavior (viewport-only) when puppeteer-core is unavailable.
- `harness-evaluator.md` documents the expanded screenshot set
  (`desktop_full`, `desktop_<id>`, `mobile_full`) and requires reading
  the full-page screenshot for whole-page brand evaluation.
- README + SKILL.md updated to reflect the new output tree and
  Node.js prerequisite for full-page capture.

### Fixed
- v1.0.1 evaluator could only judge the hero of an HTML page —
  `story` / `menu` / `visit` sections were invisible because Chrome's
  `--headless` CLI only captures viewport size, and URL anchor jumps
  (`file://...#story`) don't trigger scroll in headless mode.
  Both limitations resolved by routing through puppeteer-core.

---

## [1.0.1] — 2026-05-25

### Added
- `scripts/screenshot.sh` — cross-platform headless Chrome / Edge / Chromium
  wrapper. Renders HTML to `desktop.png` (1440×900) and `mobile.png`
  (390×844). Handles Windows + git-bash path translation via `cygpath -m`.

### Changed
- `harness-evaluator.md` Step 3 rewritten: HTML output is now
  **screenshotted and visually evaluated via the multi-modal Read tool**.
  Source-code inspection is the explicit fallback, not the primary path.
- `harness-generator.md` warns the generator that visual output will be
  screenshotted — visual quality (color, whitespace, hierarchy, hero
  impact) is what gets scored, not code cleverness.
- SKILL.md output tree includes the new `screenshots/` subdirectory.
- README documents the screenshot-based evaluation and Chrome/Edge
  prerequisite.

### Fixed
- v1.0.0 evaluator scored HTML output by `cat`-ing the source
  (`cat index.html | head -50`), which cannot judge visual design
  quality — color palette, whitespace, typography craft, hero impact,
  and visual hierarchy are invisible to a code-only reader.

---

## [1.0.0] — 2026-05-25

### Added
- Initial release of harness-plugin.
- Marketplace definition at `.claude-plugin/marketplace.json`.
- Skill `harness/SKILL.md` — auto-triggers on creative tasks (設計 /
  撰寫 / 製作 / 重新設計 / 建立 ...).
- Commands:
  - `/harness:run <task>` — explicit invocation.
  - `/harness:update` — refresh agency-agents-zh role library.
- Four orchestration agents:
  - `harness-selector` (sonnet) — scans agency-agents-zh and selects
    one planner / generator / evaluator role per task.
  - `harness-planner` (sonnet) — adopts the planner role and emits
    four weighted evaluation dimensions.
  - `harness-generator` (opus) — adopts the generator role and
    produces output, iterating per evaluator feedback.
  - `harness-evaluator` (opus) — adopts the evaluator role and scores
    strictly against the dimensions.
- PostInstall hook clones [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)
  (242 roles) into `${CLAUDE_PLUGIN_DATA}/agency-agents-zh/`.
- Iteration loop runs up to 10 rounds until score ≥ 80, otherwise
  emits all versions.

[1.1.0]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.1.0
[1.0.3]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.3
[1.0.2]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.2
[1.0.1]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.1
[1.0.0]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.0
