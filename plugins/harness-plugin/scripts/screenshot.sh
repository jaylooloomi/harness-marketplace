#!/bin/bash
# screenshot.sh — render an HTML file to PNG screenshots via headless browser
# Usage: screenshot.sh <html_path> <output_dir>
# Outputs:
#   <output_dir>/desktop.png  (1440x900)
#   <output_dir>/mobile.png   (390x844)

HTML_PATH="$1"
OUTPUT_DIR="$2"

if [ -z "$HTML_PATH" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Usage: screenshot.sh <html_path> <output_dir>" >&2
  exit 1
fi

if [ ! -f "$HTML_PATH" ]; then
  echo "❌ HTML file not found: $HTML_PATH" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" || exit 1

# Convert MSYS/Cygwin path → native (e.g. /d/foo → D:/foo). No-op on macOS/Linux.
to_native() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    echo "$1"
  fi
}

# Find a headless-capable browser. Try PATH first, then platform-specific install paths.
BROWSER=""
for cmd in google-chrome chromium chromium-browser chrome microsoft-edge msedge; do
  if command -v "$cmd" >/dev/null 2>&1; then
    BROWSER="$cmd"
    break
  fi
done

if [ -z "$BROWSER" ]; then
  for path in \
    "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
    "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    if [ -x "$path" ]; then
      BROWSER="$path"
      break
    fi
  done
fi

if [ -z "$BROWSER" ]; then
  echo "❌ No headless browser found. Install Chrome, Edge, or Chromium." >&2
  exit 2
fi

# Build native paths for the browser process (critical on Windows + git-bash)
HTML_ABS="$(cd "$(dirname "$HTML_PATH")" && pwd)/$(basename "$HTML_PATH")"
OUTPUT_ABS="$(cd "$OUTPUT_DIR" && pwd)"

HTML_NATIVE="$(to_native "$HTML_ABS")"
OUTPUT_NATIVE="$(to_native "$OUTPUT_ABS")"

# Strip a single leading slash so file:/// works on both Windows (D:/...) and POSIX (/abs/...)
HTML_URL="file:///${HTML_NATIVE#/}"

DESKTOP_OUT="$OUTPUT_NATIVE/desktop.png"
MOBILE_OUT="$OUTPUT_NATIVE/mobile.png"

COMMON_FLAGS="--headless --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=2500"

echo "📸 Browser: $BROWSER"
echo "📄 Rendering: $HTML_URL"

"$BROWSER" $COMMON_FLAGS \
  --screenshot="$DESKTOP_OUT" \
  --window-size=1440,900 \
  "$HTML_URL" >/dev/null 2>&1 || true

"$BROWSER" $COMMON_FLAGS \
  --screenshot="$MOBILE_OUT" \
  --window-size=390,844 \
  "$HTML_URL" >/dev/null 2>&1 || true

# Verify outputs exist and are non-empty
DESKTOP_OK=0
MOBILE_OK=0
[ -s "$OUTPUT_DIR/desktop.png" ] && DESKTOP_OK=1
[ -s "$OUTPUT_DIR/mobile.png" ]  && MOBILE_OK=1

if [ "$DESKTOP_OK" = "1" ] && [ "$MOBILE_OK" = "1" ]; then
  echo "✅ Screenshots saved:"
  echo "   $OUTPUT_DIR/desktop.png"
  echo "   $OUTPUT_DIR/mobile.png"
  exit 0
else
  echo "❌ Screenshot generation failed (desktop=$DESKTOP_OK mobile=$MOBILE_OK)" >&2
  exit 3
fi
