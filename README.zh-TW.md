<div align="center">

# auto-review

**描述一個任務,拿到多個 90 分以上的版本 —— 自動選角、對標頂尖、雙評審、反覆迭代,直到真的夠好。**

🌐 [English](README.md) · 繁體中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Latest Release](https://img.shields.io/github/v/release/jaylooloomi/mcp-auto-review-anything?label=release&color=blue)](https://github.com/jaylooloomi/mcp-auto-review-anything/releases/latest)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.139%2B-orange)](https://docs.claude.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-install%20%2B%20full--page%20screenshots-green)](https://nodejs.org/)
[![Roles](https://img.shields.io/badge/roles-200%2B%20from%20agency--agents--zh-purple)](https://github.com/jnMetaCode/agency-agents-zh)
[![Personas](https://img.shields.io/badge/personas-15%20from%20nuwa--skill-magenta)](https://github.com/alchaincyf/nuwa-skill)

</div>

---

## 痛點

叫 AI 幫你設計、寫作、做提案,你通常拿到的是:

- **一次就結束。** 沒有品質門檻、沒有第二次檢查 —— 好不好只能你自己判斷。
- **「安全的好看」。** 千篇一律的版型、四平八穩的文案、大家都在用的那種漸層 hero。
- **每次產出都長一樣。** 跨任務下來,模型會收斂到它自己的慣用風格。

流程裡沒有專家、沒有對標基準,也沒有人逼它「更好」,而不只是「做完」。

## 解法

auto-review 是一個 Claude Code 外掛,把生成包進一層 **harness**:自動選出專業角色、錨定天花板級範例,跑一套「規劃 → 生成 → 雙評審 → 迭代」的循環,直到分數突破 90(或把它試過的所有版本都交給你)。

```
你描述一個任務
   │
   ▼
Step 0   自動上網找 5 個「天花板級」範例當對標 seed(來自你的「品味來源」,可加/換)＋ 載入 12 條禁區
   │
   ▼
Step 1   從 200+ 專業角色選出 規劃／生成／評估 三角色
         ＋ 三角色投票,從 nuwa 蒸餾人物選一名「CTO 評審」
   │
   ▼
Step 2   規劃器:設計 4 個評估維度(至少 1 個直接對標 seed)
   │
   ▼
Step 3   生成器:實際創作(每輪必須違反至少 1 條禁區並 documented)
   │
   ▼
Step 4   主評審截圖看圖嚴打分 ＋ CTO 評審用決策者視角共評 → 混合總分
   │
   ├─  分數 < 90 → 自動迭代(每 3 輪／plateau → 強制 pivot ＋ 框架轉換)
   └─  分數 ≥ 90 → 輸出所有版本,讓你挑
```

受到 Anthropic 工程部落格《[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)》啟發,建構於兩個開源專案之上:**[agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)**(200+ 專業角色)與 **[nuwa-skill](https://github.com/alchaincyf/nuwa-skill)**(蒸餾的名人思維 persona)。

## 主要功能

- 🎭 **自動選角** —— 從 200+ 專業角色中,依任務選出規劃／生成／評估三角色。
- 🧑‍⚖️ **雙評審 + CTO 共評** —— 主評審與一名「CTO 評審」(附身 Jobs／Munger／Naval／Karpathy… 等蒸餾人物)共同打分,化解「同一個模型自己評自己」的盲點。
- 🎯 **對標天花板** —— Step 0 從你的品味來源(Awwwards／Active Theory／jerrythewebdev…)自動撈 5 個頂尖範例當評分錨點;可自訂、可跨任務記住。
- 🚫 **禁區清單** —— 12 條 AI 預設套路,generator 每輪必須違反至少 1 條。
- 🔄 **強制 pivot + 框架轉換** —— 每 3 輪(或 plateau)強制橫向思考(「如果這是實體展覽?」),避開只會打磨的 polish trap。
- 🎲 **抗同質** —— 隨機抽「約束牌」+ 跨任務「設計指紋」檔案庫,打破「每個產出都長一樣」。
- 🎬 **動態輸出** —— 視覺／網頁類預設產出會動的單檔(Lenis 平滑捲動＋GSAP),遵守漸進增強、尊重 `prefers-reduced-motion`。
- 📸 **截圖評分** —— 視覺類任務以真實 headless 瀏覽器截圖評分,而非讀 HTML 原始碼。
- 📂 **產出後自動打開** —— 完成後用系統預設程式打開最高分版本。
- 🪟 **跨平台** —— Node 腳本安裝,Windows 無需 git-bash。

## 為什麼用 auto-review

|  | 一般 AI 對話 | 一次性 prompt | **auto-review** |
|---|:---:|:---:|:---:|
| 你得到什麼 | 一則回覆 | 一份產出 | 多個評分版本 |
| 誰在做事 | 通用助手 | 通用助手 | ✅ 自動選的專業角色 |
| 品質門檻 | ❌ 無 | ❌ 無 | ✅ 迭代到 ≥90 |
| 對標頂尖 | ❌ | ❌ | ✅ 天花板級錨點 |
| 抗 generic | ❌ | ❌ | ✅ 禁區 + pivot + 抗同質 |
| 出貨前審查 | ⚠️ 只有自評 | ❌ | ✅ 雙評審 + CTO 共評 |

**切入點:** 多數工具讓你「更快」拿到答案;auto-review 讓答案「更好」 —— 把專家、對標基準和一個挑剔的評審放進流程,而且不在第一版就停手。

## 運作原理

```
任務 → [Step 0 對標 seed + 禁區] → [Step 1 選角 + CTO] → [Step 2 維度]
     → [Step 3 生成] → [Step 4 雙評審] → 分數 ≥ 90 ? 輸出 : 迭代
```

每個角色都是一個 subagent;迭代決策(計數、plateau 偵測、強制 pivot、schema 驗證)交由決策腳本處理,不靠 prose 心算。檔案結構見 [開發](#開發)。

## 安裝

需要 **Claude Code v2.1.139+** 與 **Node.js**(外掛安裝/更新由跨平台 Node 腳本執行,Claude Code 環境通常已內建,Windows 無需 git-bash)。視覺類任務的完整頁截圖也用到 Node + puppeteer-core。

**步驟一:加入 Marketplace** —— 在 Claude Code 中執行:

```
/plugin marketplace add jaylooloomi/mcp-auto-review-anything
```

**步驟二:安裝 Plugin:**

```
/plugin install auto-review@auto-review
```

接著**務必執行 `/reload-plugins`**(或重啟 Claude Code)讓外掛的指令、skill、agents 生效 —— **這步不能省**,否則 `/auto-review:…` 會顯示「Unknown command」。

**步驟三:確認安裝成功:**

```
/plugin list
```

看到 `auto-review` 出現就代表安裝成功。

> 💡 **第一次使用**(描述任務或執行 `/auto-review:run`)時,系統會自動下載 agency-agents-zh 角色庫並建立索引(需要網路,約 10–30 秒),之後就直接用。想先手動觸發下載:reload 後執行一次 `/auto-review:update`。
>
> ⚠️ 指令請**一行一行**輸入,不要把多行一次貼上。

## 使用方式

### 方式一:直接說話(推薦)

安裝後,直接描述你的任務,系統會自動觸發:

```
幫我重新設計羅浮宮美術館網站
```
```
幫我寫一篇小紅書種草文案,主題是夏日防曬
```
```
幫我設計一個用戶登入流程的 UI
```
```
幫我製作一份產品發表會的簡報大綱
```

### 方式二:明確指令

如果自動觸發沒有作用,可以明確使用指令:

```
/auto-review:run 幫我重新設計羅浮宮美術館網站
```

### 更新角色庫

當 agency-agents-zh 有新角色時,執行:

```
/auto-review:update
```

### 觸發條件

| ✅ 會觸發 | ❌ 不會觸發 |
|---|---|
| 設計網站、UI、海報 | 問問題(「什麼是 CSS flexbox?」) |
| 撰寫文案、文章、腳本 | 除錯(「這段程式為什麼報錯?」) |
| 製作簡報、企劃書 | 解釋概念 |
| 建立 Landing Page、產品頁 | 修改現有檔案的小細節 |

## 輸出說明

系統會在你的專案目錄下建立 `.harness/` 資料夾:

```
.harness/
├── .gitignore           ← 內容 "*",避免在你的 repo 誤 commit
├── context.json         ← 對標 + 禁區 + frame-shift 歷程 + 迭代分數
├── roles.json           ← 本次選用的角色
├── dimensions.json      ← 自動生成的 4 個評估維度(含 task_type / task_tags)
└── output/
    ├── iteration_1/                ← 第一輪輸出
    │   ├── index.html              ← 實際輸出物(依任務類型不同)
    │   ├── generator_notes.md      ← 生成器的設計說明
    │   ├── screenshots/            ← 視覺類任務的截圖(desktop / mobile)
    │   └── score.json              ← 評分結果(視覺類任務以截圖為主要評分依據)
    ├── iteration_2/
    └── ...
```

每輪都會保留,你可以回頭查看任何一個版本。

> 💡 **視覺類任務(網站、UI)會用 headless Chrome/Edge 自動截圖**:桌面 + mobile viewport(hero 首屏),以及完整頁面 + 每個 section 獨立截圖。評估器以人眼看圖的方式評分,而非讀 HTML 原始碼。需要本機安裝 **Chrome 或 Edge**;若有 **Node.js**,安裝時會自動裝 puppeteer-core 啟用完整頁截圖。

## 常見問題

**Q:角色庫下載失敗怎麼辦?**
A:確認網路連線後執行 `/auto-review:update`。

**Q:自動觸發一直沒有作用?**
A:改用 `/auto-review:run <任務描述>` 明確觸發。

**Q:分數一直在 90 以下怎麼辦?**
A:系統最多跑 10 輪,結束後會把所有版本列出,你可以挑最接近的繼續手動調整。

**Q:`.harness/` 資料夾可以刪掉嗎?**
A:可以,下次執行時會重新建立。

## 已知限制

- **第一次執行需要網路**,以 clone agency-agents-zh 角色庫並建立索引。
- **截圖評分需本機安裝 Chrome 或 Edge**;完整頁截圖另需 Node.js(puppeteer-core)。
- **同模型偏誤是「緩解」而非「消除」。** CTO 評審降低了「模型評自己作品」的盲點,但兩個評審仍跑在同一系列的模型上。
- **品質受評分預算上限約束:** 最多 10 輪。若無法突破 90,會輸出所有版本供人工挑選,而不是無限迴圈。

## 開發

```
auto-review/
├── .claude-plugin/
│   └── marketplace.json          ← Marketplace 定義
└── plugins/
    └── auto-review/
        ├── .claude-plugin/
        │   └── plugin.json       ← Plugin 宣告(PostInstall 跑 node setup.js)
        ├── scripts/
        │   ├── setup.js              ← 跨平台安裝/更新:clone 角色庫 + 建索引 + puppeteer
        │   ├── iteration-decision.js ← 迭代決策:計數/plateau/pivot/frame-shift/schema 驗證
        │   ├── screenshot.sh         ← 偵測瀏覽器並轉呼叫 screenshot.js(fallback chrome CLI)
        │   ├── screenshot.js         ← puppeteer-core 全頁 + 分段截圖
        │   ├── open.js               ← 產出後用系統預設程式打開
        │   └── diversity.js          ← 抗同質:隨機抽約束牌
        ├── data/
        │   ├── global-forbidden.json    ← 禁區清單(applies_to 依任務類型分流)
        │   ├── frame-shift-prompts.json ← 框架轉換 prompt
        │   ├── role-filter.json         ← 角色過濾規則(單一來源)
        │   ├── constraint-deck.json     ← 約束牌庫(抗同質)
        │   ├── taste-sources.json       ← 品味來源(對標頂尖設計)
        │   └── motion-kit.md            ← 動態頁配方(Lenis+GSAP)
        ├── agents/
        │   ├── harness-selector.md  ← 動態掃描選角(sonnet)
        │   ├── harness-planner.md   ← 規劃 + 自動生成維度(sonnet)
        │   ├── harness-generator.md ← 以角色身份生成(opus)
        │   ├── harness-evaluator.md ← 嚴格評分(opus)
        │   └── harness-cto.md       ← CTO 共評,附身 nuwa 人物決策者視角(opus)
        ├── skills/
        │   └── harness/
        │       └── SKILL.md      ← 主流程(自動觸發)
        └── commands/
            ├── run.md        ← /auto-review:run 明確觸發
            └── update.md     ← /auto-review:update 更新角色庫
```

## 致謝

- [Anthropic Engineering Blog — Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [agency-agents](https://github.com/msitarzewski/agency-agents) by msitarzewski
- [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) by jnMetaCode —— 200+ 專業角色來源
- [nuwa-skill](https://github.com/alchaincyf/nuwa-skill) by alchaincyf —— CTO 評審的 perspective 人物來源(MIT)

本專案整合 MIT 授權的 agency-agents-zh 與 nuwa-skill 兩個開源專案;與其作者及 Anthropic 無隸屬或背書關係。

## License

MIT License —— 自由使用,個人與商業用途均可。
