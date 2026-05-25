---
description: >
  使用在使用者明確要求「生成」、「設計」、「重新設計」、「製作」、
  「撰寫」、「建立」某個完整輸出物時。
  觸發範例：「幫我設計一個網站」、「幫我寫一篇文案」、
  「重新設計這個頁面」、「製作一份簡報」、「建立一個 landing page」。
  不觸發：問問題、除錯、解釋概念、修改現有小細節、純程式開發任務。
---

# Harness 自動迭代生成系統 (v1.1+)

接到任務後，依照以下流程完整執行，不要跳過任何步驟。

---

## 前置確認

確認 agency-agents-zh 角色庫存在：
- 路徑：`${CLAUDE_PLUGIN_DATA}/agency-agents-zh/`
- 若不存在：提示使用者執行 `/harness:update` 後再試

建立本次任務的工作目錄：
```
.harness/
├── context.json        ← v1.1 新增：對標 + 禁區 + 框架轉換歷程
├── roles.json          ← 選角結果
├── dimensions.json     ← 評估維度
└── output/
    ├── iteration_1/    ← 每輪輸出
    │   ├── index.html (或 content.md / plan.md)
    │   ├── generator_notes.md  ← 含本輪 forbidden_violations 紀錄
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

## Step 0 (v1.1 新增)：對標參考 + 禁區清單

這一步在 selector 之前執行，奠定整個生成的「品味校準」與「反 AI 慣性」基礎。

### 0a. 取得對標參考
詢問使用者：
> 「這類任務你心中的『天花板等級』範例是什麼？給我 1-3 個就好，可以是：
> - 網站 URL
> - 描述（例如『The Met 那種感覺』）
> - 圖片參考（如果在這個 session 已經貼過）
> 
> 不知道沒關係，可以說『隨便』，我會用內建 fallback。」

把回應寫入 `.harness/context.json`：
```json
{
  "task": "<original task>",
  "references": [
    { "type": "url|description|image", "value": "...", "user_note": "..." }
  ],
  "references_source": "user_provided | system_fallback",
  "forbidden_patterns": [...],
  "frame_shift_used": [],
  "iteration_scores": []
}
```

若使用者跳過 → `references_source: "system_fallback"` + 系統載入該任務類型的內建範例描述。

### 0b. 載入 anti-pattern 禁區清單
讀取 `${CLAUDE_PLUGIN_ROOT}/data/global-forbidden.json` 全部 patterns，寫進 `context.json.forbidden_patterns`。

**使用者可選自訂**（在 `.harness/context.json` 中加 `additional_forbidden` 陣列、或 `disabled_forbidden` 排除某些 id）。

---

## Step 1：選角

呼叫 @harness-selector agent：
- 掃描 `${CLAUDE_PLUGIN_DATA}/agency-agents-zh/` 下所有部門的角色
- 讀取 `.harness/context.json`（了解對標方向，可能影響選角偏好）
- 分別為規劃/生成/評估三個階段各選出最適合的 1 個角色
- 結果寫入 `.harness/roles.json`

---

## Step 2：規劃

呼叫 @harness-planner agent：
- 讀取 `.harness/roles.json` 的規劃器角色，以該角色身份思考
- 讀取 `.harness/context.json` 的 references + forbidden_patterns
- 分析任務性質
- 自動生成 4 個評估維度，規則：
  - AI 天生強的維度（技術執行類）→ 權重 15-20%
  - AI 天生弱的維度（原創性/個性類）→ 權重 25-35%
  - **至少 1 個維度必須是「對標 references 的程度」**（v1.1 強制）
  - 4 個維度權重加總必須 = 100%
- `generator_instruction` 必須包含：「禁區清單見 context.json，必須違反至少 1 條，理由 documented 在 generator_notes.md」
- 結果寫入 `.harness/dimensions.json`

---

## Step 3：生成

呼叫 @harness-generator agent：
- 讀取 `.harness/roles.json` 的生成器角色設定
- 讀取 `.harness/dimensions.json` 與 `.harness/context.json`
- **從 forbidden_patterns 選至少 1 條明確違反**（必填）
- 若非第一輪，讀取上一輪的 `score.json`，針對 feedback 改善
  - strategy = "refine" → 精修現有方向
  - strategy = "pivot" → 完全推翻；**檢查 context.json.frame_shift_active** 是否有指定的框架轉換 prompt 要套用
- 輸出結果到 `.harness/output/iteration_N/`
- 在 `generator_notes.md` 末尾必須加：
  ```markdown
  ## Forbidden patterns violated this iteration
  - [pattern.id]: [本版本如何違反這條]
  - [pattern.id]: [本版本如何違反這條]
  ```

---

## Step 4：評估

呼叫 @harness-evaluator agent：
- 讀取 `.harness/roles.json` 的評估器角色
- 讀取 `.harness/dimensions.json` 與 `.harness/context.json`
- **若 context.json.references 中有 URL，用 WebFetch 抓取簡述/描述當對標**
- 讀取本輪輸出（HTML → 用 `${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.sh` 截圖 → Read PNG）
- 嚴格打分（標準維持原規範）
- **特別查核**：generator_notes.md 宣稱的 forbidden_violations 是否屬實
  - 屬實 → 該維度可正常評分
  - 不屬實或敷衍 → 整體扣 5-10 分並標記為「未違反慣性」
- 結果寫入 `.harness/output/iteration_N/score.json`

---

## Step 5：迭代判斷（v1.1 新邏輯）

讀取 `score.json` 的 total 分數，並更新 `context.json.iteration_scores`。

### 5a. 基本門檻判斷
```
total >= 90 → 進入 Step 6
total <  90 → 進入 5b
```

### 5b. Plateau 偵測（v1.1 新增）
若 iteration ≥ 3，計算最近 3 輪分數的 max - min：
```
若 max - min < 3 → 偵測到 plateau（陷入 polish trap）
```

### 5c. 強制 pivot 觸發（v1.1 新增）
**任一條件成立 → 強制下一輪 strategy = pivot（覆寫 evaluator 的決定）**：
- Plateau detected
- 當前 iteration % 3 == 0（每 3 輪強制一次橫向思考）
- Evaluator 自己就標 pivot

### 5d. Frame-shift prompt 注入
當強制 pivot 觸發時：
1. 讀取 `${CLAUDE_PLUGIN_ROOT}/data/frame-shift-prompts.json`
2. 排除 `context.json.frame_shift_used` 中已用過的
3. 從剩餘中選**最契合當前 critical_issue** 的一個（如果都不契合則隨機選）
4. 寫入 `context.json.frame_shift_active = <prompt object>`
5. 加進 `frame_shift_used` 陣列
6. 回到 Step 3 — generator 必須先以該 frame 思考，再翻譯回網頁

### 5e. 一般 refine
若沒觸發強制 pivot，依 evaluator 的 strategy 執行：
- refine → 帶 score.json + context.json 回 Step 3
- pivot（evaluator 自主判斷）→ 同 5d 注入 frame-shift prompt

**最多迭代 10 輪**，避免無限迴圈。

---

## Step 6：輸出結果

列出所有已完成的 iteration 版本：
- 顯示每個版本的總分、各維度分數、是否觸發 pivot / 用了哪個 frame-shift
- 標記分數最高的版本
- 額外標記「最有突破性」的版本（即使分數不最高 — 用了 frame-shift 的版本）
- 顯示 `context.json.references` 提醒對標來源
- 詢問使用者想要哪個版本，或是否繼續迭代

所有狀態都寫入 `.harness/` 資料夾，即使 context reset 也能恢復。
