#!/bin/bash
# 安裝 harness-plugin 時自動執行
# 1. 將 agency-agents-zh clone 到持久化目錄 ${CLAUDE_PLUGIN_DATA}
# 2. 若有 node + npm，安裝 puppeteer-core 以啟用 full-page 截圖（v1.0.2+）

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

# ---------- screenshot-tool (puppeteer-core) ----------
SCREENSHOT_DIR="${CLAUDE_PLUGIN_DATA}/screenshot-tool"

echo ""
echo "🔍 檢查 screenshot-tool（full-page 截圖工具）..."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "⚠️  未偵測到 node + npm — 跳過 puppeteer-core 安裝"
  echo "    screenshot.sh 將使用 chrome CLI 後備模式（viewport-only，無法截全頁）"
  echo "    若需 full-page 截圖請安裝 Node.js 後重跑此腳本"
elif [ -d "$SCREENSHOT_DIR/node_modules/puppeteer-core" ]; then
  echo "✅ puppeteer-core 已安裝，跳過"
else
  echo "📥 正在安裝 puppeteer-core（約 5–10 秒）..."
  mkdir -p "$SCREENSHOT_DIR"
  (
    cd "$SCREENSHOT_DIR" || exit 1
    if [ ! -f package.json ]; then
      npm init -y >/dev/null 2>&1
    fi
    npm install puppeteer-core --no-fund --no-audit --silent
  )
  if [ -d "$SCREENSHOT_DIR/node_modules/puppeteer-core" ]; then
    echo "✅ puppeteer-core 安裝完成！full-page 截圖已啟用"
    echo "📁 儲存位置：${SCREENSHOT_DIR}"
  else
    echo "❌ puppeteer-core 安裝失敗，screenshot.sh 將退回 chrome CLI 模式"
  fi
fi
