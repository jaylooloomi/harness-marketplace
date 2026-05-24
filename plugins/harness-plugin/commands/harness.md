---
description: >
  明確啟動 Harness 迭代生成流程。
  當自動觸發沒有作用，或使用者想要明確指定任務時使用。
  用法：/harness:run <任務描述>
  例如：/harness:run 幫我重新設計羅浮宮美術館網站
---

# /harness:run

收到指令後，立即執行 Harness 完整流程：

1. 確認 `${CLAUDE_PLUGIN_DATA}/agency-agents-zh/` 存在
   - 不存在 → 提示執行 `/harness:update`
2. 以使用者提供的任務描述啟動完整流程：
   **選角 → 規劃 → 生成 → 評估 → 迭代 → 輸出**

詳細流程請參照 harness skill。
