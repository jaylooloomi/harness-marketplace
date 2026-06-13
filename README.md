# auto-review

> 基於 Anthropic Harness 架構，結合 **agency-agents-zh**（專業角色）＋ **nuwa-skill**（蒸餾人物）兩個開源專案的自動迭代生成系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Latest Release](https://img.shields.io/github/v/release/jaylooloomi/mcp-auto-review-anything?label=release&color=blue)](https://github.com/jaylooloomi/mcp-auto-review-anything/releases/latest)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.139%2B-orange)](https://docs.claude.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-install%20%2B%20full--page%20screenshots-green)](https://nodejs.org/)
[![Roles](https://img.shields.io/badge/roles-200%2B%20from%20agency--agents--zh-purple)](https://github.com/jnMetaCode/agency-agents-zh)
[![Personas](https://img.shields.io/badge/personas-15%20from%20nuwa--skill-magenta)](https://github.com/alchaincyf/nuwa-skill)

---

## 這是什麼？

受到 Anthropic 工程部落格《[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)》啟發，**結合兩個開源專案**：

- **[agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)**（jnMetaCode）的 200+ 個**專業角色** —— 用來動態選出規劃／生成／評估三角色。
- **[nuwa-skill](https://github.com/alchaincyf/nuwa-skill)**（alchaincyf）蒸餾的**名人思維 persona**（Jobs / Munger / Naval…）—— 用來選出一名「CTO 評審」與主評審共同打分（v1.4）。

打造一套「輸入任務 → 自動選角（＋選 CTO 評審）→ 規劃 → 生成 → 雙評審 → 迭代」的完整流程。

### 核心概念

一般 AI 生成是這樣：
```
你輸入 → AI 輸出 → 結束
```

這個系統是這樣（v1.4）：
```
你輸入任務
   ↓
Step 0  自動上網找 5 個「天花板級」範例當對標 seed（你可加/換）＋ 載入 12 條禁區
   ↓
Step 1  從 200+ 專業角色選出 規劃/生成/評估 三角色
        ＋ 三角色投票，從 nuwa 蒸餾人物選一名「CTO 評審」
   ↓
Step 2  規劃器：設計 4 個評估維度（至少 1 個直接對標 seed）
   ↓
Step 3  生成器：實際創作（每輪必須違反至少 1 條禁區並 documented）
   ↓
Step 4  主評審截圖看圖嚴打分　＋　CTO 評審用決策者視角共評 → 混合總分
   ↓
分數 < 90 → 自動迭代
        ├ 每 3 輪 / plateau → 強制 pivot ＋ 注入框架轉換（「如果這是實體展覽？」）
        │  （但明顯進步則放行 refine）
        └ 否則 refine
分數 ≥ 90 → 輸出所有版本，讓你選擇
```

**v1.1 三大新機制**：
- 🎯 **對標參考**：使用者提供天花板等級範例，作為 evaluator 評分的 anchor
- 🚫 **禁區清單**：12 條 AI 預設套路，generator 每輪必須違反至少 1 條
- 🔄 **強制 pivot + 框架轉換**：避免 polish trap，每 3 輪強制橫向思考

**v1.2 強化**（可靠性與通用性）：
- 🧩 **任務類型分流**：禁區/框架轉換用 `applies_to` 標籤，非網頁任務（文案/策略/程式）不再被套用網頁專屬規則
- 🧮 **決策腳本**：迭代計數、plateau/pivot、frame-shift 生命週期、schema 驗證集中到 `iteration-decision.js`，不再靠 prose 心算；每 3 輪強制 pivot 新增「明顯進步則放行」護欄
- 🪟 **跨平台安裝**：改用 Node 腳本，Windows 無 git-bash 也能裝
- 📇 **角色索引**：選角讀預建索引，不再每次掃全部角色檔
- 🔢 **可選 best-of-N**：`candidates_per_round` 開啟同輪平行生成多版本擇優
- 🌱 **自動對標 seed（v1.3，v1.8 升級）**：Step 0 從你的「品味來源」（Awwwards／Active Theory／jerrythewebdev… 可自訂、可跨任務記住）撈 5 個天花板級範例當參考種子（你還能再補/換），餵給規劃、生成、評估當對標基準
- 🧑‍⚖️ **雙評審 / CTO 共評（v1.4）**：選角後三角色投票，從 nuwa-skill 蒸餾人物（Jobs / Munger / Naval / Karpathy…）選一名「CTO 評審」,評分時用決策者視角共評、混入總分 —— 化解「同模型自評」的盲點
- 📂 **產出後自動打開（v1.5）**：完成後自動用系統預設程式打開最佳版本（html→瀏覽器、docx/pdf→Office…），可用 `context.json.auto_open` 關閉
- 🎲 **抗同質（v1.7）**：每個任務隨機抽 2 張「約束牌」（美學運動／結構／硬限制…，自動避開最近用過的）強制注入，＋跨任務「設計指紋」檔案庫讓 CTO 把「撞自己家族臉」當扣分 —— 打破「每個產出都長一樣」。可用 `context.json.diversity` 關閉
- 🎬 **動態模式（v1.9）**：視覺/網頁類預設產出**會動的單檔**（Lenis 平滑捲動＋GSAP 捲動進場＋客製緩動，jerrythewebdev／Awwwards 那種「感覺」），遵守漸進增強（沒 JS 也完整、尊重 `prefers-reduced-motion`）；截圖看不出動態 → evaluator 改「讀 code」評動態層。可用 `context.json.motion` 關閉

---

## 安裝

需要：**Claude Code v2.1.139+** 與 **Node.js**（外掛安裝/更新由跨平台 Node 腳本執行；Claude Code 環境通常已內建，Windows 無需 git-bash）。視覺類任務的完整頁截圖也用到 Node + puppeteer-core。

### 步驟一：加入 Marketplace

在 Claude Code 中執行：

```
/plugin marketplace add jaylooloomi/mcp-auto-review-anything
```

### 步驟二：安裝 Plugin

```
/plugin install auto-review@auto-review
```

安裝後**務必執行 `/reload-plugins`**（或重啟 Claude Code）讓外掛的指令、skill、agents 生效 —— **這步不能省**，否則 `/auto-review:…` 會顯示「Unknown command」。

> 💡 **第一次使用**（描述任務或執行 `/auto-review:run`）時，系統會自動下載 agency-agents-zh 角色庫並建立索引（需要網路，約 10–30 秒），之後就直接用。
> 想先手動觸發下載也可以：reload 後執行一次 `/auto-review:update`。
>
> ⚠️ 指令請**一行一行**輸入,不要把多行一次貼上。

### 步驟三：確認安裝成功

```
/plugin list
```

看到 `auto-review` 出現就代表安裝成功。

---

## 使用方式

### 方式一：直接說話（推薦）

安裝後，直接描述你的任務，系統會自動觸發：

```
幫我重新設計羅浮宮美術館網站
```

```
幫我寫一篇小紅書種草文案，主題是夏日防曬
```

```
幫我設計一個用戶登入流程的 UI
```

```
幫我製作一份產品發表會的簡報大綱
```

### 方式二：明確指令

如果自動觸發沒有作用，可以明確使用指令：

```
/auto-review:run 幫我重新設計羅浮宮美術館網站
```

### 更新角色庫

當 agency-agents-zh 有新角色時，執行：

```
/auto-review:update
```

---

## 觸發條件

**會觸發**的任務類型：
- 設計網站、UI、海報
- 撰寫文案、文章、腳本
- 製作簡報、企劃書
- 建立 Landing Page、產品頁

**不會觸發**的任務類型：
- 問問題（「什麼是 CSS flexbox？」）
- 除錯（「這段程式為什麼報錯？」）
- 解釋概念
- 修改現有檔案的小細節

---

## 輸出說明

系統會在你的專案目錄下建立 `.harness/` 資料夾：

```
.harness/
├── .gitignore           ← 內容 "*"，避免在你的 repo 誤 commit（v1.2）
├── context.json         ← 對標 + 禁區 + frame-shift 歷程 + 迭代分數
├── roles.json           ← 本次選用的角色
├── dimensions.json      ← 自動生成的 4 個評估維度（含 task_type / task_tags）
└── output/
    ├── iteration_1/     ← 第一輪輸出
    │   ├── index.html   ← 實際輸出物（依任務類型不同）
    │   ├── generator_notes.md  ← 生成器的設計說明
    │   ├── screenshots/        ← 視覺類任務的截圖（desktop / mobile）
    │   └── score.json   ← 評分結果（視覺類任務以截圖為主要評分依據）
    ├── iteration_2/
    └── ...
```

每輪都會保留，你可以回頭查看任何一個版本。

> 💡 **視覺類任務（網站、UI）會用 headless Chrome/Edge 自動截圖**：
> - 桌面 + mobile viewport（hero 首屏）
> - **完整頁面 + 每個 section 獨立截圖**（v1.0.2+，需 Node.js）
>
> 評估器以人眼看圖的方式評分，而非讀 HTML 原始碼。
> 需要本機安裝 **Chrome 或 Edge**；若有 **Node.js**，安裝時會自動裝 puppeteer-core 啟用完整頁截圖。

---

## 常見問題

**Q：角色庫下載失敗怎麼辦？**
A：確認網路連線後執行 `/auto-review:update`

**Q：自動觸發一直沒有作用？**
A：改用 `/auto-review:run <任務描述>` 明確觸發

**Q：分數一直在 90 以下怎麼辦？**
A：系統最多跑 10 輪，結束後會把所有版本列出，你可以挑最接近的繼續手動調整

**Q：`.harness/` 資料夾可以刪掉嗎？**
A：可以，下次執行時會重新建立

---

## 系統架構

```
auto-review/
├── .claude-plugin/
│   └── marketplace.json          ← Marketplace 定義
└── plugins/
    └── auto-review/
        ├── .claude-plugin/
        │   └── plugin.json       ← Plugin 宣告（PostInstall 跑 node setup.js）
        ├── scripts/
        │   ├── setup.js              ← 跨平台安裝/更新：clone 角色庫 + 建索引 + puppeteer
        │   ├── iteration-decision.js ← 迭代決策：計數/plateau/pivot/frame-shift/schema 驗證
        │   ├── screenshot.sh         ← 偵測瀏覽器並轉呼叫 screenshot.js（fallback chrome CLI）
        │   ├── screenshot.js         ← puppeteer-core 全頁 + 分段截圖
        │   ├── open.js               ← 產出後用系統預設程式打開（v1.5）
        │   └── diversity.js          ← 抗同質：隨機抽約束牌（v1.7）
        ├── data/
        │   ├── global-forbidden.json    ← 禁區清單（applies_to 依任務類型分流）
        │   ├── frame-shift-prompts.json ← 框架轉換 prompt
        │   ├── role-filter.json         ← 角色過濾規則（單一來源）
        │   ├── constraint-deck.json     ← 約束牌庫（抗同質，v1.7）
        │   ├── taste-sources.json       ← 品味來源（對標頂尖設計，v1.8）
        │   └── motion-kit.md            ← 動態頁配方（Lenis+GSAP，v1.9）
        ├── agents/
        │   ├── harness-selector.md  ← 動態掃描選角（sonnet）
        │   ├── harness-planner.md   ← 規劃 + 自動生成維度（sonnet）
        │   ├── harness-generator.md ← 以角色身份生成（opus）
        │   ├── harness-evaluator.md ← 嚴格評分（opus）
        │   └── harness-cto.md       ← CTO 共評，附身 nuwa 人物決策者視角（opus, v1.4）
        ├── skills/
        │   └── harness/
        │       └── SKILL.md      ← 主流程（自動觸發）
        └── commands/
            ├── run.md        ← /auto-review:run 明確觸發
            └── update.md ← /auto-review:update 更新角色庫
```

---

## 致謝

- [Anthropic Engineering Blog — Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [agency-agents](https://github.com/msitarzewski/agency-agents) by msitarzewski
- [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) by jnMetaCode
- [nuwa-skill](https://github.com/alchaincyf/nuwa-skill) by alchaincyf — CTO 評審的 perspective 人物來源（v1.4，MIT）

---

## License

MIT License — 自由使用，個人與商業用途均可。
