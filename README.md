<div align="center">

# auto-review

**Describe a task. Get multiple 90+‑scored versions — auto‑cast expert roles, benchmarked against the best, dual‑reviewed, and iterated until it's actually good.**

🌐 English · [繁體中文](README.zh-TW.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Latest Release](https://img.shields.io/github/v/release/jaylooloomi/mcp-auto-review-anything?label=release&color=blue)](https://github.com/jaylooloomi/mcp-auto-review-anything/releases/latest)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.139%2B-orange)](https://docs.claude.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-install%20%2B%20full--page%20screenshots-green)](https://nodejs.org/)
[![Roles](https://img.shields.io/badge/roles-200%2B%20from%20agency--agents--zh-purple)](https://github.com/jnMetaCode/agency-agents-zh)
[![Personas](https://img.shields.io/badge/personas-15%20from%20nuwa--skill-magenta)](https://github.com/alchaincyf/nuwa-skill)

</div>

---

## The problem

Ask an AI to design, write, or pitch something and you usually get:

- **One shot, then it stops.** No quality bar, no second look — you grade it yourself.
- **The "tasteful default."** Generic layouts, safe copy, the same gradient hero everyone ships.
- **Every output looks alike.** Across tasks, the model converges on its own house style.

There's no expert in the loop, nothing to benchmark against, and no one pushing it to be *better* instead of just *done*.

## The solution

auto-review is a Claude Code plugin that wraps generation in a **harness**: it casts expert roles, anchors on ceiling‑level references, and runs a *plan → generate → dual‑review → iterate* loop until the score clears 90 (or it hands you every version it tried).

```
You describe a task
   │
   ▼
Step 0   Auto-seed 5 ceiling-level references (your "taste sources") + load 12 forbidden patterns
   │
   ▼
Step 1   Cast planner / generator / evaluator from 200+ roles
         + vote in a "CTO judge" distilled from a famous-thinker persona
   │
   ▼
Step 2   Planner designs 4 evaluation dimensions (≥1 anchored to the references)
   │
   ▼
Step 3   Generator creates — must break ≥1 forbidden pattern each round, documented
   │
   ▼
Step 4   Main evaluator scores from screenshots + CTO judges from a decision-maker lens → blended score
   │
   ├─  Score < 90 → iterate (every 3 rounds / on plateau → forced pivot + frame-shift)
   └─  Score ≥ 90 → emit all versions, you pick
```

Inspired by Anthropic's [Harness design for long‑running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), built on two open‑source projects: **[agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)** (200+ professional roles) and **[nuwa-skill](https://github.com/alchaincyf/nuwa-skill)** (distilled thinker personas).

## Key features

- 🎭 **Auto role‑casting** — picks a planner, generator, and evaluator from 200+ professional roles to fit your task.
- 🧑‍⚖️ **Dual review + CTO persona** — the main evaluator and a "CTO judge" (channeled from Jobs / Munger / Naval / Karpathy…) score together, breaking the "same model grading itself" blind spot.
- 🎯 **Ceiling‑level benchmarking** — auto‑seeds 5 top‑tier references from your taste sources (Awwwards, Active Theory, jerrythewebdev…) as scoring anchors; customizable and remembered across tasks.
- 🚫 **Forbidden‑pattern list** — 12 default AI clichés the generator must break at least one of every round.
- 🔄 **Forced pivots + frame‑shifts** — every 3 rounds (or on a plateau) it pivots laterally ("what if this were a physical exhibition?") to escape the polish trap.
- 🎲 **Anti‑homogeneity** — random constraint cards plus a cross‑task "design fingerprint" archive so outputs stop converging on the same look.
- 🎬 **Motion‑ready output** — visual/web tasks default to an animated single file (Lenis smooth scroll + GSAP), with progressive enhancement and `prefers-reduced-motion` respected.
- 📸 **Screenshot‑based evaluation** — visual tasks are scored from real headless‑browser screenshots, not raw HTML.
- 📂 **Auto‑open results** — opens the top‑scoring version with your OS default app when it's done.
- 🪟 **Cross‑platform** — Node‑based installer; no git‑bash required on Windows.

## Why auto-review

|  | Plain AI chat | One‑shot prompt | **auto-review** |
|---|:---:|:---:|:---:|
| What you get | one reply | one artifact | multiple scored versions |
| Who's working | generic assistant | generic assistant | ✅ auto‑cast specialists |
| Quality bar | ❌ none | ❌ none | ✅ iterates to ≥90 |
| Benchmarked against the best | ❌ | ❌ | ✅ ceiling‑level anchors |
| Anti‑generic | ❌ | ❌ | ✅ forbidden list + pivots + diversity |
| Review before you ship | ⚠️ self only | ❌ | ✅ dual review + CTO judge |

**The wedge:** most tools help you get an answer *faster*. auto-review makes the answer *better* — by putting an expert, a benchmark, and a skeptical reviewer in the loop, and not stopping at the first draft.

## How it works

```
task → [Step 0 seed + forbidden] → [Step 1 cast roles + CTO] → [Step 2 dimensions]
     → [Step 3 generate] → [Step 4 dual review] → score ≥ 90 ? emit : iterate
```

Each role is a subagent; iteration decisions (counting, plateau detection, forced pivots, schema validation) run in a deterministic script rather than prose. See [Development](#development) for the file layout.

## Install

Requires **Claude Code v2.1.139+** and **Node.js** (the plugin's install/update runs via a cross‑platform Node script — usually already present in Claude Code; no git‑bash needed on Windows). Full‑page screenshots for visual tasks also use Node + puppeteer‑core.

**1. Add the marketplace** — run in Claude Code:

```
/plugin marketplace add jaylooloomi/mcp-auto-review-anything
```

**2. Install the plugin:**

```
/plugin install auto-review@auto-review
```

Then **run `/reload-plugins`** (or restart Claude Code) so the commands, skill, and agents take effect — **don't skip this**, or `/auto-review:…` will report "Unknown command".

**3. Verify:**

```
/plugin list
```

Seeing `auto-review` in the list means you're set.

> 💡 On **first use** (describe a task or run `/auto-review:run`), the system auto‑downloads the agency-agents-zh role library and builds an index (needs network, ~10–30s), then it's instant. To trigger the download manually, run `/auto-review:update` once after reloading.
>
> ⚠️ Enter commands **one line at a time** — don't paste multiple lines at once.

## Usage

### Option 1 — just talk (recommended)

After installing, describe your task and the system triggers automatically:

```
Redesign the Louvre museum website
```
```
Write a Xiaohongshu (RED) product post about summer sunscreen
```
```
Design a UI for a user login flow
```
```
Draft a slide outline for a product launch
```

### Option 2 — explicit command

If auto‑trigger doesn't fire, invoke it directly:

```
/auto-review:run Redesign the Louvre museum website
```

### Update the role library

When agency-agents-zh adds new roles:

```
/auto-review:update
```

### When it triggers

| ✅ Triggers | ❌ Doesn't trigger |
|---|---|
| Designing sites, UI, posters | Answering questions ("what is CSS flexbox?") |
| Writing copy, articles, scripts | Debugging ("why does this code error?") |
| Building slide decks, proposals | Explaining concepts |
| Landing pages, product pages | Small edits to existing files |

## Output

The system creates a `.harness/` folder in your project directory:

```
.harness/
├── .gitignore           ← contents "*", so it never gets committed by accident
├── context.json         ← references + forbidden list + frame-shift history + iteration scores
├── roles.json           ← the roles cast for this task
├── dimensions.json      ← the 4 auto-generated evaluation dimensions (with task_type / task_tags)
└── output/
    ├── iteration_1/
    │   ├── index.html              ← the actual deliverable (varies by task type)
    │   ├── generator_notes.md      ← the generator's design rationale
    │   ├── screenshots/            ← desktop / mobile screenshots for visual tasks
    │   └── score.json              ← scoring result (visual tasks scored mainly from screenshots)
    ├── iteration_2/
    └── ...
```

Every round is kept, so you can revisit any version.

> 💡 **Visual tasks (sites, UI) are auto‑screenshotted with headless Chrome/Edge**: desktop + mobile viewport (hero), plus full‑page and per‑section captures. The evaluator scores them the way a human looks at images, not by reading HTML. Requires **Chrome or Edge** installed locally; with **Node.js**, puppeteer‑core is installed automatically to enable full‑page screenshots.

## FAQ

**Q: The role library failed to download.**
A: Check your network connection, then run `/auto-review:update`.

**Q: Auto‑trigger isn't firing.**
A: Use `/auto-review:run <task description>` to trigger it explicitly.

**Q: The score keeps coming in under 90.**
A: The system runs up to 10 rounds, then lists every version so you can pick the closest one and refine it by hand.

**Q: Can I delete the `.harness/` folder?**
A: Yes — it's recreated on the next run.

## Known limitations

- **Needs network on first run** to clone the agency-agents-zh role library and build the index.
- **Screenshot scoring needs Chrome or Edge** installed locally; full‑page capture additionally needs Node.js (puppeteer‑core).
- **Same‑model bias is mitigated, not eliminated.** The CTO persona reduces the "model grading its own work" blind spot but both judges run on the same family of models.
- **Quality is capped by the score budget:** up to 10 rounds. If it can't clear 90, it emits all versions for manual selection rather than looping forever.

## Development

```
auto-review/
├── .claude-plugin/
│   └── marketplace.json          ← marketplace definition
└── plugins/
    └── auto-review/
        ├── .claude-plugin/
        │   └── plugin.json       ← plugin manifest (PostInstall runs node setup.js)
        ├── scripts/
        │   ├── setup.js              ← cross-platform install/update: clone role lib + build index + puppeteer
        │   ├── iteration-decision.js ← iteration decisions: counting / plateau / pivot / frame-shift / schema validation
        │   ├── screenshot.sh         ← detects browser and delegates to screenshot.js (falls back to chrome CLI)
        │   ├── screenshot.js         ← puppeteer-core full-page + per-section screenshots
        │   ├── open.js               ← opens the result with the OS default app
        │   └── diversity.js          ← anti-homogeneity: draws random constraint cards
        ├── data/
        │   ├── global-forbidden.json    ← forbidden-pattern list (applies_to routes by task type)
        │   ├── frame-shift-prompts.json ← frame-shift prompts
        │   ├── role-filter.json         ← role filtering rules (single source)
        │   ├── constraint-deck.json     ← constraint-card deck (anti-homogeneity)
        │   ├── taste-sources.json       ← taste sources (benchmark against top-tier design)
        │   └── motion-kit.md            ← motion-page recipe (Lenis + GSAP)
        ├── agents/
        │   ├── harness-selector.md  ← dynamic role scanning + casting (sonnet)
        │   ├── harness-planner.md   ← planning + auto-generated dimensions (sonnet)
        │   ├── harness-generator.md ← generates in the role's voice (opus)
        │   ├── harness-evaluator.md ← strict scoring (opus)
        │   └── harness-cto.md       ← CTO co-review, channeling a nuwa persona's decision-maker lens (opus)
        ├── skills/
        │   └── harness/
        │       └── SKILL.md      ← main flow (auto-trigger)
        └── commands/
            ├── run.md        ← /auto-review:run explicit trigger
            └── update.md     ← /auto-review:update refresh the role library
```

## Acknowledgements

- [Anthropic Engineering Blog — Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [agency-agents](https://github.com/msitarzewski/agency-agents) by msitarzewski
- [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) by jnMetaCode — the 200+ professional roles
- [nuwa-skill](https://github.com/alchaincyf/nuwa-skill) by alchaincyf — the persona source for the CTO judge (MIT)

This project integrates the MIT‑licensed agency-agents-zh and nuwa-skill projects; it is not affiliated with or endorsed by their authors or by Anthropic.

## License

MIT License — free to use, personal and commercial alike.
