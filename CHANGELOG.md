# Changelog

All notable changes to harness-plugin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.3]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.3
[1.0.2]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.2
[1.0.1]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.1
[1.0.0]: https://github.com/jaylooloomi/harness-marketplace/releases/tag/v1.0.0
