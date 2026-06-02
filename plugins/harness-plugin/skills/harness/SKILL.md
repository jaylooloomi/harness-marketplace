---
name: harness
description: >
  使用在使用者明確要求「生成」、「設計」、「重新設計」、「製作」、
  「撰寫」、「建立」某個完整輸出物時。
  觸發範例：「幫我設計一個網站」、「幫我寫一篇文案」、
  「重新設計這個頁面」、「製作一份簡報」、「建立一個 landing page」。
  不觸發：問問題、除錯、解釋概念、修改現有小細節、純程式開發任務。
---

# Harness 自動迭代生成系統 (v1.2+)

接到任務後，依照以下流程完整執行，不要跳過任何步驟。

---

## 前置確認

確認角色索引存在：`${CLAUDE_PLUGIN_DATA}/roles-index.json`（selector 讀這個，不再每次掃全部檔案）。

**若不存在 → 首次使用，自動安裝（v1.2；取代不被支援的 PostInstall hook）**：用 Bash 執行一次
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.js" install --data-dir "${CLAUDE_PLUGIN_DATA}"
```
這會 clone agency-agents-zh + 建 `roles-index.json` + 裝 puppeteer-core（首次約 10–30 秒，需要網路）。先告訴使用者「第一次使用,正在安裝角色庫,約 10–30 秒」,完成後再繼續流程。
- 若安裝失敗（多半是沒網路）→ 提示使用者檢查網路後手動執行 `/harness-plugin:harness-update`,再重試。

建立本次任務的工作目錄，並**寫入 `.harness/.gitignore`，內容為單獨一行 `*`**，避免在使用者自己的 git repo 裡誤把 `.harness/`（含截圖）commit 進去：

```
.harness/
├── .gitignore          ← 內容 "*"，保護使用者 repo（v1.2 新增）
├── context.json        ← 對標 + 禁區 + 框架轉換歷程 + 迭代分數（由 iteration-decision.js 維護）
├── roles.json          ← 選角結果
├── dimensions.json     ← 評估維度（含 task_type / task_tags）
└── output/
    ├── iteration_1/
    │   ├── index.html (或 content.md / plan.md)
    │   ├── generator_notes.md  ← 含本輪 pre-registered + 已違反的 forbidden patterns
    │   ├── screenshots/        ← 視覺類任務的截圖（評估器看圖用）
    │   │   ├── desktop.png        (1440×900 hero)
    │   │   ├── desktop_full.png   (完整桌面頁面)
    │   │   ├── desktop_<id>.png   (每個 section 一張，評估器按需讀)
    │   │   ├── mobile.png         (390×844 hero)
    │   │   └── mobile_full.png    (完整 mobile 頁面)
    │   ├── candidate_1/ … candidate_N/   ← 僅當 best-of-N 啟用（candidates_per_round > 1）
    │   └── score.json          ← 本輪（或勝出 candidate）的評分
    ├── iteration_2/
    └── ...
```

---

## Step 0：對標參考 + 禁區清單

這一步在 selector 之前執行，奠定「品味校準」與「反 AI 慣性」基礎。

### 0a. 對標參考（seed）— 先自動上網找，再讓使用者補

**不要一開始就只問使用者。先自動找 5 個『天花板等級』範例當 seed 餵入：**

1. 用 **WebSearch** 針對本任務搜尋業界最熱門 / 得獎 / 頂尖的實際範例。
   - 視覺/網頁類 → 優先 Awwwards、SiteInspire、Godly、Land-book、Dribbble 等 showcase；關鍵字如 `award winning <主題> website`、`best <主題> landing page`。
   - 文案類 → 該平台的爆款 / 頂尖品牌文案；簡報類 → 頂尖 deck 範例。
2. 從結果挑 **5 個**品質最高、且**彼此有差異**（別 5 個都同一招）的範例。
3. 每個用 **WebFetch** 抓重點，寫一句「它好在哪 / 風格 / 版型或結構特徵」（fetch 失敗就用搜尋摘要寫）。
4. 寫進 `.harness/context.json`（`references_source: "auto_seed"`）：
   ```json
   {
     "task": "<original task>",
     "references": [
       { "type": "url", "value": "https://…", "description": "為何頂尖：深色沉浸＋scroll 敘事＋襯線大標", "source": "auto_seed" }
       // …共 5 個
     ],
     "references_source": "auto_seed",
     "forbidden_patterns": [...],
     "frame_shift_used": [],
     "frame_shift_active": null,
     "iteration_scores": [],
     "candidates_per_round": 1,
     "threshold": 90,
     "max_iterations": 10,
     "cto_review": true,
     "cto_weight": 0.3
   }
   ```
5. 把找到的 5 個簡短列給使用者，並問：
   > 「我先上網找了 5 個這類任務的天花板級範例（列出 + 一句話特色）。要不要**換掉/刪掉**某幾個、或**貼你自己的**參考？直接說『就用這些』也可以。」
   使用者補充的存成額外 reference（`source: "user_provided"`）；要換就替換。

**關鍵**：這 5 個 seed 同時餵給 planner（設計『對標 references』維度）、generator（朝天花板走）、evaluator（評分基準）。**每筆 reference 都要附 `description`** —— 因為下游 agent（尤其 evaluator）不上網，只讀 context.json 裡你抓好的描述。

**使用者貼圖片時**：evaluator 看不到主 session 的圖，所以你要當場把圖用文字描述清楚，存成 `{ "type": "image", "value": "<文字描述>", "description": "<同上>", "source": "user_provided" }`。

**fallback**：環境沒有 WebSearch / 無網路 / 搜不到 → `references_source: "system_fallback"`，改用內建該類型頂尖範例的文字描述，並告知使用者可手動貼參考。

### 0b. 載入 anti-pattern 禁區清單
讀取 `${CLAUDE_PLUGIN_ROOT}/data/global-forbidden.json` 全部 patterns，寫進 `context.json.forbidden_patterns`。

**注意**：禁區是否對本任務生效，取決於 pattern 的 `applies_to` 是否與 planner 之後寫入的 `dimensions.task_tags` 有交集 —— 這個過濾在 Step 3（生成）時做，這裡先載入完整清單即可。

**使用者可選自訂**：在 `.harness/context.json` 加 `additional_forbidden` 陣列、或 `disabled_forbidden` 排除某些 id；也可設 `candidates_per_round`（best-of-N）、`threshold`、`max_iterations`、`cto_review`（true/false 開關雙評審）、`cto_weight`（CTO 占比，預設 0.3）。

---

## Step 1：選角

呼叫 @harness-selector agent：
- 讀取 `${CLAUDE_PLUGIN_DATA}/roles-index.json`（已含每個角色的 name / department / path / expertise）
- 讀取 `.harness/context.json`（了解對標方向，可能影響選角偏好）
- 分別為規劃/生成/評估三個階段各選出最適合的 1 個角色
- 結果寫入 `.harness/roles.json`
- **1.2（v1.4）CTO 評審選舉**：若 `context.json.cto_review` 為 true 且 `${CLAUDE_PLUGIN_DATA}/perspectives-index.json` 存在，selector 再讓三角色投票選出一名 CTO 評審，寫入 `roles.json.cto_reviewer`（詳見 harness-selector）。沒有 perspective 池就設 `cto_reviewer: null`，CTO 共評自動停用。

---

## Step 2：規劃

呼叫 @harness-planner agent：
- 讀取 `.harness/roles.json` 的規劃器角色，以該角色身份思考
- 讀取 `.harness/context.json` 的 references + forbidden_patterns
- 分析任務性質，並寫入 **`task_type`（中文分類）與 `task_tags`（標準化標籤陣列：web / visual / copy / strategy / code）** 到 `dimensions.json` —— 這組 tags 決定哪些禁區與框架轉換對本任務生效
- 自動生成 4 個評估維度，規則：
  - AI 天生強的維度（技術執行類）→ 權重 15-20%
  - AI 天生弱的維度（原創性/個性類）→ 權重 25-35%
  - **至少 1 個維度必須是「對標 references 的程度」**
  - 4 個維度權重加總必須 = 100%
- `generator_instruction` 必須包含：「禁區清單見 context.json，**限 applies_to 與 task_tags 有交集者**；本輪必須 pre-register 並違反至少 1 條（若無適用條目則豁免），理由 documented 在 generator_notes.md」
- 結果寫入 `.harness/dimensions.json`

---

## Step 3：生成

**先決定本輪要產生幾個 candidate**：讀 `context.json.candidates_per_round`（預設 1）。
- `= 1`：直接輸出到 `.harness/output/iteration_N/`（一般情況）
- `> 1`（best-of-N，v1.2）：**平行呼叫 @harness-generator N 次**，各自輸出到 `.harness/output/iteration_N/candidate_1/ … candidate_N/`。每個 generator 只讀 context（唯讀），只寫自己的 candidate 目錄，**不寫 context.json**（避免平行覆寫），交由 Step 4 挑選勝出者。

每個 @harness-generator agent：
- 讀取 `.harness/roles.json` 的生成器角色設定
- 讀取 `.harness/dimensions.json` 與 `.harness/context.json`
- **計算本輪適用的禁區** = `forbidden_patterns` 中 `applies_to` 與 `dimensions.task_tags` 有交集者
  - **pre-register（v1.2）**：生成『之前』先在 generator_notes.md 宣告本輪要違反哪一條、打算怎麼違反
  - 若沒有任何適用禁區（例如純 code 任務）→ 本輪豁免，不需違反
  - 若認為慣例才是最佳解 → 可援引 convention exception，但須論證為何慣例在此最優
- 若非第一輪，讀取上一輪的 `score.json`，針對 feedback 改善
  - strategy = "refine" → 精修現有方向
  - strategy = "pivot" → 完全推翻；**檢查 context.json.frame_shift_active**（已由 iteration-decision.js 設定/清空），若有則先以該 frame 思考再翻譯回網頁
- 輸出結果到對應目錄，並完成 `generator_notes.md`（見 harness-generator.md 範本）

---

## Step 4：評估

### 4.1 主評審
呼叫 @harness-evaluator agent：
- 讀取 `.harness/roles.json` 的評估器角色、`.harness/dimensions.json` 與 `.harness/context.json`
- **對標基準用 context.json 裡每筆 reference 的 `description`**（Step 0 已上網/看圖抓好；evaluator 不上網）
- 讀取本輪輸出（HTML → 用 `${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.sh` 截圖 → Read PNG）
  - **預設只讀 `desktop_full.png` + `mobile.png`**；只有當某維度懷疑特定 section 有問題時，才額外讀該 `desktop_<id>.png`（節省多模態成本，v1.2）
- **查核 pre-registered 違反**：generator_notes.md 宣告的違反是否真的在成品中做到；敷衍或沒做到 → 扣 5-10 分
- 嚴格打分；**best-of-N**（candidates_per_round > 1）時對每個 candidate 各打分存 `candidate_M/score.json`，挑最高者寫成 `iteration_N/` 代表並標 `winning_candidate`
- 結果寫入 `.harness/output/iteration_N/score.json`（此時 `total` = 主評審 4 維度加權分）

### 4.2 CTO 共評（v1.4 新增）
若 `roles.json.cto_reviewer` 不為 null（且 `context.json.cto_review` 為 true）→ 呼叫 @harness-cto agent：
- 它**附身**當選的 perspective 人物，用「決策者視角」獨立看同一份成品（重用 4.1 的截圖，不重截）。
- 產出 `cto_score`（自己的尺）/ `verdict`（ship/iterate/kill）/ `block`（有無硬傷）/ dealbreaker / highlight / critique。
- **混分寫回同一份 score.json**：`main_total` = 4.1 的分；`total` = `round(main_total×(1−cto_weight) + cto_score×cto_weight)`，若 `block` 則封頂 89。**`total` 是 Step 5 唯一會讀的數字。**
- 若 cto_reviewer 為 null（無 perspective 池）→ 跳過，score.json 維持 4.1 原樣。

---

## Step 5：迭代判斷（v1.2：交給決策腳本）

**不要手算**。呼叫決策腳本，它擁有計數、分數來源、plateau/pivot、frame-shift 生命週期與 schema 驗證：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/iteration-decision.js" .harness
```

解析它印出的 JSON，依欄位行動：

- `error: true` → 看 `reason`：上一輪 `score.json` 壞了（`validation_errors`）就回 Step 4 重評；若是 gap（`missing` 列出缺漏的輪次 score.json）就補跑那幾輪的評估。
- `done: true` → 進入 Step 6。
  - 若 `max_iterations_reached: true`，照樣進 Step 6（攤開所有版本），不要再迭代。
- 否則 → 帶 `next_strategy`（refine / pivot）**與 `next_iteration`** 回 **Step 3** 跑下一輪。
  - **`next_iteration` 是唯一權威輪數**：明確告訴 generator 本輪寫到 `iteration_<next_iteration>/`，不要讓它自己靠「資料夾存不存在」猜（否則會與決策腳本的計數分歧）。
  - 腳本**已經**把 `frame_shift_active` 寫進 context.json（pivot 輪填入一個框架；refine 輪清成 null），generator 直接讀即可，你不需要再手動設定或清空。
  - **若 score.json 有 `cto.dealbreaker`**（v1.4）：refine 時務必把它連同主評審的 feedback 一起交給 generator —— 這是兩個視角的改善訊號。

腳本內含的判斷（你不需重做）：分數 ≥ threshold(90) 即完成；iteration ≥ 3 且最近 3 輪變動 < 3 為 plateau 強制 pivot；每 3 輪強制 pivot **但若上一輪明顯進步（≥4 分）則放行 refine**（避免砍掉健康軌跡）；evaluator 自己標 pivot 一律尊重；最多 max_iterations(10) 輪。

---

## Step 6：輸出結果

列出所有已完成的 iteration 版本：
- 顯示每個版本的總分（v1.4：含 main 分 vs CTO 分、CTO verdict）、各維度分數、是否觸發 pivot / 用了哪個 frame-shift
- 標記分數最高的版本
- 額外標記「最有突破性」的版本（即使分數不最高 — 用了 frame-shift 的版本）
- 顯示 `context.json.references` 提醒對標來源
- 詢問使用者想要哪個版本，或是否繼續迭代

所有狀態都寫入 `.harness/` 資料夾，即使 context reset 也能恢復（iteration-decision.js 會從磁碟上的 score.json 重新推導計數與分數）。
