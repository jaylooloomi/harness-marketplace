# Harness Marketplace

> 基於 Anthropic Harness 架構 + agency-agents-zh 動態選角的自動迭代生成系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 這是什麼？

受到 Anthropic 工程部落格《[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)》啟發，結合 [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) 的 80+ 個專業角色，打造一套「輸入任務 → 自動選角 → 規劃 → 生成 → 評估 → 迭代」的完整流程。

### 核心概念

一般 AI 生成是這樣：
```
你輸入 → AI 輸出 → 結束
```

這個系統是這樣：
```
你輸入任務
   ↓
自動從 80+ 個專業角色中選出最適合的 3 個角色
   ↓
規劃器角色：分析任務，自動設計 4 個評估維度
   ↓
生成器角色：實際創作（第一輪）
   ↓
評估器角色：嚴格打分 + 給出具體改善建議
   ↓
分數 < 80 → 帶著 feedback 自動迭代
分數 ≥ 80 → 輸出所有版本，讓你選擇
```

---

## 安裝

需要：**Claude Code v2.1.139+**

### 步驟一：加入 Marketplace

在 Claude Code 中執行：

```
/plugin marketplace add jaylooloomi/harness-marketplace
```

### 步驟二：安裝 Plugin

```
/plugin install harness-plugin@harness-marketplace
```

安裝時會自動下載 agency-agents-zh 角色庫（需要網路，約 10 秒）。

### 步驟三：確認安裝成功

```
/plugin list
```

看到 `harness-plugin` 出現就代表安裝成功。

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
/harness:run 幫我重新設計羅浮宮美術館網站
```

### 更新角色庫

當 agency-agents-zh 有新角色時，執行：

```
/harness:update
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
├── roles.json           ← 本次選用的角色
├── dimensions.json      ← 自動生成的 4 個評估維度
└── output/
    ├── iteration_1/     ← 第一輪輸出
    │   ├── index.html   ← 實際輸出物（依任務類型不同）
    │   ├── generator_notes.md  ← 生成器的設計說明
    │   └── score.json   ← 評分結果
    ├── iteration_2/
    └── ...
```

每輪都會保留，你可以回頭查看任何一個版本。

---

## 常見問題

**Q：角色庫下載失敗怎麼辦？**
A：確認網路連線後執行 `/harness:update`

**Q：自動觸發一直沒有作用？**
A：改用 `/harness:run <任務描述>` 明確觸發

**Q：分數一直在 80 以下怎麼辦？**
A：系統最多跑 10 輪，結束後會把所有版本列出，你可以挑最接近的繼續手動調整

**Q：`.harness/` 資料夾可以刪掉嗎？**
A：可以，下次執行時會重新建立

---

## 系統架構

```
harness-marketplace/
├── .claude-plugin/
│   └── marketplace.json          ← Marketplace 定義
└── plugins/
    └── harness-plugin/
        ├── .claude-plugin/
        │   └── plugin.json       ← Plugin 宣告（含 PostInstall hook）
        ├── scripts/
        │   ├── install-agents.sh ← 安裝時自動 clone agency-agents-zh
        │   └── update-agents.sh  ← 更新角色庫
        ├── agents/
        │   ├── harness-selector.md  ← 動態掃描選角（sonnet）
        │   ├── harness-planner.md   ← 規劃 + 自動生成維度（sonnet）
        │   ├── harness-generator.md ← 以角色身份生成（opus）
        │   └── harness-evaluator.md ← 嚴格評分（opus）
        ├── skills/
        │   └── harness/
        │       └── SKILL.md      ← 主流程（自動觸發）
        └── commands/
            ├── harness.md        ← /harness:run 明確觸發
            └── harness-update.md ← /harness:update 更新角色庫
```

---

## 致謝

- [Anthropic Engineering Blog — Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [agency-agents](https://github.com/msitarzewski/agency-agents) by msitarzewski
- [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) by jnMetaCode

---

## License

MIT License — 自由使用，個人與商業用途均可。
