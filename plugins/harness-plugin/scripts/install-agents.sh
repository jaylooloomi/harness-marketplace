#!/bin/bash
# 安裝 harness-plugin 時自動執行
# 將 agency-agents-zh clone 到持久化目錄 ${CLAUDE_PLUGIN_DATA}

AGENTS_DIR="${CLAUDE_PLUGIN_DATA}/agency-agents-zh"

echo "🔍 檢查 agency-agents-zh 角色庫..."

if [ ! -d "$AGENTS_DIR" ]; then
  echo "📥 正在下載 agency-agents-zh 角色庫..."
  git clone --depth=1 \
    https://github.com/jnMetaCode/agency-agents-zh \
    "$AGENTS_DIR"
  
  ROLE_COUNT=$(find "$AGENTS_DIR" -name '*.md' \
    ! -name 'README*' \
    ! -name 'CONTRIBUTING*' \
    ! -name 'UPSTREAM*' \
    ! -name 'LICENSE*' \
    ! -name 'EXECUTIVE*' \
    ! -name 'QUICKSTART*' | wc -l)
  
  echo "✅ 角色庫安裝完成！共 ${ROLE_COUNT} 個角色"
  echo "📁 儲存位置：${AGENTS_DIR}"
else
  echo "✅ 角色庫已存在，跳過安裝"
  echo "💡 若要更新，請執行：/harness:update"
fi
