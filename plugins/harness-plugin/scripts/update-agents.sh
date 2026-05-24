#!/bin/bash
# 更新 agency-agents-zh 到最新版本

AGENTS_DIR="${CLAUDE_PLUGIN_DATA}/agency-agents-zh"

if [ -d "$AGENTS_DIR" ]; then
  echo "🔄 正在更新 agency-agents-zh..."
  cd "$AGENTS_DIR" && git pull
  
  ROLE_COUNT=$(find "$AGENTS_DIR" -name '*.md' \
    ! -name 'README*' \
    ! -name 'CONTRIBUTING*' \
    ! -name 'UPSTREAM*' \
    ! -name 'LICENSE*' \
    ! -name 'EXECUTIVE*' \
    ! -name 'QUICKSTART*' | wc -l)
  
  echo "✅ 更新完成！目前共 ${ROLE_COUNT} 個角色"
else
  echo "📥 角色庫不存在，正在重新安裝..."
  git clone --depth=1 \
    https://github.com/jnMetaCode/agency-agents-zh \
    "$AGENTS_DIR"
  echo "✅ 安裝完成"
fi
