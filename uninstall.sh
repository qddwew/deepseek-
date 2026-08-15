#!/usr/bin/env bash
# uninstall.sh — dsh-client-api-stats 卸载脚本 (macOS / Linux)
set -euo pipefail

HOME_DIR="${DSH_HOME:-$HOME/.dsh}"

# 1) 删除插件目录
TARGET="$HOME_DIR/profiles/node_modules/@deepseek-ai/dsh-client-api-stats"
if [[ -d "$TARGET" ]]; then
  rm -rf "$TARGET"
  echo "[OK] 已删除插件目录: $TARGET"
else
  echo "[信息] 插件目录不存在: $TARGET"
fi

# 2) 从 cordis.patch.yml 移除注册条目
PATCH_PATH="$HOME_DIR/profiles/web/cordis.patch.yml"
if [[ -f "$PATCH_PATH" ]]; then
  awk '
    /^[[:space:]]*# DeepSeek API 余额与用量监控圆环插件/ { skip=1; next }
    skip && /^[[:space:]]*- insert:[[:space:]]*$/ { skip=0; next }
    skip && /^[[:space:]]*- id: api-stats[[:space:]]*$/ { next }
    skip && /name: .dsh-client-api-stats/ { next }
    skip { next }
    { print }
  ' "$PATCH_PATH" > "$PATCH_PATH.tmp" && mv "$PATCH_PATH.tmp" "$PATCH_PATH"
  echo "[OK] 已从 cordis.patch.yml 移除 api-stats 条目。"
else
  echo "[信息] cordis.patch.yml 不存在，跳过。"
fi

echo ""
echo "卸载完成，重启 DSH Web 服务（或刷新页面）后圆环消失。"
