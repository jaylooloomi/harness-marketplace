---
description: 更新 agency-agents-zh 角色庫到最新版本，並重建角色索引。當角色庫不存在或需要取得最新角色時使用。
---

執行 agency-agents-zh 角色庫更新（跨平台 Node 腳本，Windows/macOS/Linux 通用）：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.js" update
```

此指令會：
- 以 shallow-aware 方式更新角色庫（fetch + reset，適用 `--depth=1` clone）
- 重建 `${CLAUDE_PLUGIN_DATA}/roles-index.json`（selector 讀這個索引，不再每次掃全部檔案）

更新完成後回報：
1. 更新結果（腳本輸出）
2. 目前角色總數（腳本最後一行 `roles available`）
3. 各部門角色數量分布（可從 `roles-index.json` 的 `department` 欄位彙整）
