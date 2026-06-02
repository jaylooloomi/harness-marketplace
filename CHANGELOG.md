# Changelog

All notable changes to auto-review are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] — 2026-06-02

### Changed
- **Renamed the project to `auto-review`** (was `harness-marketplace` /
  `harness-plugin`). The repo, marketplace, and plugin are now all `auto-review`;
  the commands are **`/auto-review:run <task>`** and **`/auto-review:update`**.
  - ⚠️ **Breaking for existing installs** — re-add the marketplace under the new
    name: `/plugin marketplace add jaylooloomi/auto-review` →
    `/plugin install auto-review@auto-review` → `/reload-plugins`.
  - Internal subagent files keep their `harness-*` names (implementation detail,
    not user-facing).

[1.6.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.6.0

## [1.5.0] — 2026-06-02

### Added
- **Auto-open the result.** After Step 6 the harness opens the top-scoring
  version's artifact with the OS default app via the new cross-platform
  `scripts/open.js` (index.html → browser, .docx / .pdf → Office, images →
  viewer, …). Unsupported file types are skipped and any launch failure is
  non-fatal (so headless/CI runs are unaffected). Toggle with
  `context.json.auto_open` (default true).

[1.5.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.5.0

## [1.4.0] — 2026-06-02

### Added
- **Dual-judge evaluation with an elected "CTO reviewer."** A second source —
  [`alchaincyf/nuwa-skill`](https://github.com/alchaincyf/nuwa-skill) (distilled
  real-person "perspective" personas: Jobs, Munger, Naval, Karpathy, …) — is
  cloned into a separate `perspectives-index.json`.
  - **Step 1.2**: after casting the 3 roles, they *vote* to elect one persona as
    the CTO reviewer (`roles.json.cto_reviewer`).
  - **Step 4.2**: a new `harness-cto` agent (opus) embodies that persona and
    co-reviews the output from a decision-maker lens — its own `score`,
    `verdict` (ship/iterate/kill), and a `dealbreaker` — then blends into the
    round's `total`: `main×(1−w) + cto×w` (w = `cto_weight`, default 0.3),
    capped at 89 when it flags a `block`ing dealbreaker.
  - Directly tackles the long-standing **self-referential-judge** weakness: the
    generator and main evaluator are the same model family; the CTO is a
    different, opinionated perspective. Toggle via `context.json.cto_review`;
    auto-disabled when the perspective pool is absent.
  - `iteration-decision.js` is **unchanged** — it still reads the single blended
    `total`, so the loop math didn't have to move.

### Changed
- `setup.js` now also clones nuwa-skill (non-fatal) and builds
  `perspectives-index.json` on install/update.

[1.4.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.4.0

## [1.3.0] — 2026-06-02

### Added
- **Auto-seeded references (Step 0).** Before asking the user, the harness now
  **WebSearches for ~5 of the most popular / award-winning real-world examples**
  for the task (Awwwards / SiteInspire / Dribbble … for visual work), fetches a
  one-line "why it's top-tier" for each, and stores them as `references` (with
  `description`, `source: "auto_seed"`) in `context.json`. These seeds anchor the
  planner's benchmark dimension, the generator's target, and the evaluator's
  scoring. The user can still add or replace them; falls back to the built-in
  description set when there is no web access.

### Changed
- The evaluator now benchmarks against the `description` captured on each
  reference at Step 0 (it has no WebFetch tool of its own) instead of trying to
  fetch URLs itself — fixing a path that could never have run.

### Fixed
- **First-run `npm install puppeteer-core` robustness.** npm is now invoked via
  its JS entry next to the running `node` (PATH-independent), and a failed
  install self-heals with `npm cache clean --force` + one retry before falling
  back to the chrome CLI. Resolves real install failures observed on Windows
  (npm-not-on-PATH in the exec sandbox, and a corrupt-cache ENOENT).

[1.3.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.3.0

## [1.2.0] — 2026-06-01

### Why this release
A structured review of the v1.1 system surfaced three root problems. (1) The
iteration state machine lived in prose: the model re-did the arithmetic,
recomputed the round number three different ways, and never cleared the
frame-shift flag — so a stale frame leaked into every later round. (2) The
whole anti-pattern apparatus was web-only despite the system advertising
support for copy / strategy / code tasks. (3) The bash-only installer silently
failed on Windows (no git-bash). This release moves the loop's decisions into
code, gates the machinery by task type, and makes install/update cross-platform.

### Added
- **`scripts/iteration-decision.js`** — the loop's single deterministic
  decision point. Owns the authoritative iteration count (derived from the
  score.json files on disk), the score series, schema validation, the
  plateau / forced-pivot logic, and the `frame_shift_active` lifecycle.
  Replaces the prose arithmetic in SKILL.md Step 5. Ships a `selftest` mode.
- **`scripts/setup.js`** — cross-platform (Node) installer/updater. Clones the
  role library (shallow-aware update), builds `roles-index.json`, and installs
  puppeteer-core. Replaces `install-agents.sh` / `update-agents.sh`; the
  PostInstall hook now runs `node setup.js install`.
- **`data/role-filter.json`** — single source of truth for the role-exclusion
  filter (previously duplicated and inconsistent across the selector and the
  two shell scripts).
- **`roles-index.json`** (built at install/update) — the selector reads this
  once instead of scanning ~200+ role files on every run.
- **`applies_to` task-type tags** on every forbidden pattern and frame-shift
  prompt, plus **`task_tags`** emitted by the planner — the anti-pattern
  machinery now only fires for task types it fits (web/visual) and is waived
  for copy / strategy / code.
- **Pre-registration of forbidden violations** — the generator declares which
  pattern it will violate (and how) *before* generating; the evaluator checks
  the artifact against that pre-commitment. Plus a documented
  "convention is optimal here" exception so the system isn't forced into
  novelty-for-novelty's-sake.
- **Optional best-of-N** (`candidates_per_round`) — parallel candidates per
  round into `iteration_N/candidate_M/`, evaluator scores each and picks the
  winner. Per-candidate state is namespaced so parallel writers never clobber
  the shared `context.json`.
- **Auto-written `.harness/.gitignore`** (`*`) so the working dir isn't
  accidentally committed into a user's own repo.

### Changed
- **SKILL.md Step 5** now calls `iteration-decision.js` and acts on its JSON
  output instead of performing the arithmetic itself.
- **Forced pivot every 3rd round now yields to a strongly-improving
  trajectory** (last-round gain ≥ 4 points) so a healthy sub-threshold run is
  refined, not abandoned near success.
- **Evaluator** reads `desktop_full` + `mobile` by default and a per-section
  screenshot only when a dimension flags a concern (cuts the recurring
  multimodal cost that scaled with section count × every round).
- **Image references** are converted to a text description at intake — the
  evaluator subagent cannot see images pasted in the main session, so a raw
  image reference was previously a dead input.
- **Least privilege**: `Bash` removed from the selector and generator tool
  grants (only the evaluator, which runs the screenshot script, keeps it).
- **`screenshot.js`** tolerates a non-settling page (resilient `goto`), waits
  on `document.fonts.ready` before capture, and falls back to viewport-region
  screenshots when a layout exposes fewer than two id'd landmarks
  (`section`/`main`/`article[id]`).

### Fixed
- **`frame_shift_active` was set on a pivot round but never cleared**, so the
  same frame was wrongly re-applied on every following round until the next
  pivot. It is now owned (set on pivot, cleared on refine) by
  `iteration-decision.js`.
- **Role count is no longer hardcoded inconsistently** — the README claimed
  both "80+" and "242"; `setup.js` now reports the live count and the docs use
  a non-asserting "200+".
- **The plugin can now actually install-and-run out of the box** (it could not
  before, on any platform). The `PostInstall` hook was removed — plugin
  lifecycle hooks are not a supported Claude Code event, so it never fired and
  the role library was never downloaded. Setup now runs **lazily on first use**:
  the skill / `/auto-review:run` command runs
  `setup.js install --data-dir "${CLAUDE_PLUGIN_DATA}"` when the role index is
  missing. Data persists in the documented writable `${CLAUDE_PLUGIN_DATA}`
  (`~/.claude/plugins/data/...`); `setup.js` gained a `--data-dir` flag.
- **Corrected the documented commands** to the plugin-namespaced
  `/auto-review:run` and `/auto-review:update` — the old docs
  said `/harness:run` / `/harness:update`, which do not exist as commands.
- **Added `name: harness`** to the skill frontmatter (required for the skill to
  load and auto-trigger).

### Removed
- `scripts/install-agents.sh` and `scripts/update-agents.sh` — superseded by
  the cross-platform `scripts/setup.js`. (`screenshot.sh` remains, since the
  evaluator invokes it through bash.)

### Deferred (still)
- Multi-evaluator personas with conflicting values — would reduce judge
  variance but needs a larger orchestration change; revisit after best-of-N
  sees real use.

---

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
- Initial release of auto-review.
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

[1.2.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.2.0
[1.1.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.1.0
[1.0.3]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.0.3
[1.0.2]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.0.2
[1.0.1]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.0.1
[1.0.0]: https://github.com/jaylooloomi/auto-review/releases/tag/v1.0.0
