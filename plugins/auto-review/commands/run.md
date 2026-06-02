---
description: >
  明確啟動 Harness 迭代生成流程。
  當自動觸發沒有作用，或使用者想要明確指定任務時使用。
  用法：/auto-review:run <任務描述>
  例如：/auto-review:run 幫我重新設計羅浮宮美術館網站
---

# /auto-review:run

收到指令後，立即執行 Harness 完整流程：

1. **確認角色索引**：`${CLAUDE_PLUGIN_DATA}/roles-index.json` 是否存在。
   - 不存在 → 第一次使用，先用 Bash 跑一次安裝（約 10–30 秒，需要網路）：
     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.js" install --data-dir "${CLAUDE_PLUGIN_DATA}"
     ```
   - 安裝失敗 → 提示使用者檢查網路後手動執行 `/auto-review:update`，再重試。
2. 以 `$ARGUMENTS`（使用者提供的任務描述）啟動完整流程：
   **選角 → 規劃 → 生成 → 評估 → 迭代 → 輸出**

詳細流程請參照 harness skill（SKILL.md）。
