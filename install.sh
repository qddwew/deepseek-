#!/usr/bin/env bash
# install.sh — dsh-client-api-stats 一键安装脚本 (macOS / Linux)
# 用法: chmod +x install.sh && ./install.sh
set -euo pipefail

PLUGIN_NAME="@deepseek-ai/dsh-client-api-stats"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOME_DIR="${DSH_HOME:-$HOME/.dsh}"

if [[ ! -f "$SCRIPT_DIR/package.json" ]]; then
  echo "[错误] 请在插件源码目录（含 package.json 的目录）中运行本脚本。" >&2
  exit 1
fi
if [[ ! -d "$HOME_DIR/profiles" ]]; then
  echo "[警告] 未找到 DSH 主目录: $HOME_DIR" >&2
  echo "      请确认 DSH 已安装，或设置 DSH_HOME 环境变量后重试。" >&2
  exit 1
fi

# 1) 复制插件到 profile 的扁平 node_modules
TARGET="$HOME_DIR/profiles/node_modules/@deepseek-ai/dsh-client-api-stats"
mkdir -p "$TARGET"
cp -f "$SCRIPT_DIR/package.json" "$TARGET/"
if [[ -d "$SCRIPT_DIR/lib" ]]; then
  cp -rf "$SCRIPT_DIR/lib" "$TARGET/"
fi
echo "[OK] 插件已复制到: $TARGET"

# 2) 注册到 profiles/web/cordis.patch.yml
PROFILE_DIR="$HOME_DIR/profiles/web"
PATCH_PATH="$PROFILE_DIR/cordis.patch.yml"
if [[ ! -d "$PROFILE_DIR" ]]; then
  echo "[警告] 未找到 web profile 目录: $PROFILE_DIR，跳过补丁注册。" >&2
  echo "      若 DSH 的 profile 名称不同，请手动在对应 cordis.patch.yml 中加入条目。" >&2
else
  if [[ ! -f "$PATCH_PATH" ]]; then
    cat > "$PATCH_PATH" <<'EOF'
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
EOF
  fi
  if grep -q "api-stats" "$PATCH_PATH"; then
    echo "[OK] cordis.patch.yml 已包含 api-stats 条目，跳过注册。"
  else
    cat >> "$PATCH_PATH" <<'EOF'

# DeepSeek API 余额与用量监控圆环插件（设置按钮上方）
- insert:
    - id: api-stats
      name: '@deepseek-ai/dsh-client-api-stats'
EOF
    echo "[OK] 已在 cordis.patch.yml 注册 api-stats 条目。"
  fi
fi

echo ""
echo "安装完成！接下来："
echo "  1. 重启 DSH Web 服务（dsh web），或直接刷新浏览器页面；"
echo "  2. 确认 \$DSH_HOME/.credentials.yaml 已配置 DEEPSEEK_API_KEY；"
echo "  3. 侧边栏设置按钮上方将出现余额圆环，悬停查看明细。"
