---
description: >
  使用在使用者明確要求「生成」、「設計」、「重新設計」、「製作」、
  「撰寫」、「建立」某個完整輸出物時。
  觸發範例：「幫我設計一個網站」、「幫我寫一篇文案」、
  「重新設計這個頁面」、「製作一份簡報」、「建立一個 landing page」。
  不觸發：問問題、除錯、解釋概念、修改現有小細節、純程式開發任務。
---

# Harness 自動迭代生成系統

接到任務後，依照以下流程完整執行，不要跳過任何步驟。

---

## 前置確認

確認 agency-agents-zh 角色庫存在：
- 路徑：`${CLAUDE_PLUGIN_DATA}/agency-agents-zh/`
- 若不存在：提示使用者執行 `/harness:update` 後再試

建立本次任務的工作目錄：
```
.harness/
├── roles.json          ← 選角結果
├── dimensions.json     ← 評估維度
└── output/
    ├── iteration_1/    ← 每輪輸出
    │   ├── index.html (或 content.md / plan.md)
    │   ├── generator_notes.md
    │   ├── screenshots/        ← 視覺類任務的截圖（評估器看圖用）
    │   │   ├── desktop.png        (1440×900 hero)
    │   │   ├── desktop_full.png   (完整桌面頁面, v1.0.2+)
    │   │   ├── desktop_<id>.png   (每個 section 一張, v1.0.2+)
    │   │   ├── mobile.png         (390×844 hero)
    │   │   └── mobile_full.png    (完整 mobile 頁面, v1.0.2+)
    │   └── score.json
    ├── iteration_2/
    └── ...
```

---

## Step 1：選角

呼叫 @harness-selector agent：
- 掃描 `${CLAUDE_PLUGIN_DATA}/agency-agents-zh/` 下所有部門的角色
- 分別為規劃/生成/評估三個階段各選出最適合的 1 個角色
- 結果寫入 `.harness/roles.json`

---

## Step 2：規劃

呼叫 @harness-planner agent：
- 讀取 `.harness/roles.json` 的規劃器角色設定，以該角色身份思考
- 分析任務性質（是設計？文案？程式？其他？）
- 自動生成 4 個評估維度，規則如下：
  - AI 天生強的維度（技術執行類）→ 權重 15-20%
  - AI 天生弱的維度（原創性/個性類）→ 權重 25-35%
  - 本任務核心維度 → 權重最高
  - 4 個維度權重加總必須 = 100%
- 結果寫入 `.harness/dimensions.json`

---

## Step 3：生成

呼叫 @harness-generator agent：
- 讀取 `.harness/roles.json` 的生成器角色設定，以該角色身份生成
- 讀取 `.harness/dimensions.json`，**從第一輪就朝評分方向生成**
- 若非第一輪，讀取上一輪的 `score.json`，針對 feedback 改善
  - strategy = "refine" → 精修現有方向
  - strategy = "pivot" → 完全推翻，換一個截然不同的方向
- 輸出結果到 `.harness/output/iteration_N/`（N 從 1 開始遞增）

---

## Step 4：評估

呼叫 @harness-evaluator agent：
- 讀取 `.harness/roles.json` 的評估器角色設定，以該角色身份評估
- 讀取 `.harness/dimensions.json` 的 4 個維度，嚴格打分
- **若輸出是 HTML 頁面，必須先用 `scripts/screenshot.sh` 截圖，再用 Read 工具看圖評分**（絕對不要只讀 code）
- 結果寫入 `.harness/output/iteration_N/score.json`

---

## Step 5：迭代判斷

讀取 `score.json` 的 total 分數：

```
total < 90  → 回到 Step 3，帶著 score.json 繼續迭代
total >= 90 → 進入 Step 6
```

**最多迭代 10 輪**，避免無限迴圈。
若第 10 輪仍未達標，直接進入 Step 6，並說明原因。

---

## Step 6：輸出結果

列出所有已完成的 iteration 版本：
- 顯示每個版本的總分和各維度分數
- 標記分數最高的版本
- 詢問使用者想要哪個版本，或是否需要繼續迭代

所有狀態都寫入 `.harness/` 資料夾，即使 context reset 也能恢復。
