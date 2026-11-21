#!/usr/bin/env bash
# do.sh — unified task router for the local agent toolkit.
#
# 让"按既有链路做事"比"手搓"更简单。
# 每个动作内部调 ~/.agents/tools/ 下已经稳定的工具，错误路径由实现兜。
#
# 使用：do.sh <action> [args]  （do.sh help 看全部动作）

set -eo pipefail
TOOLS="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VAULT="{USER_HOME}/Documents/Obsidian Vault/AI沉淀"

usage() {
  cat <<'EOF'
do.sh — 统一任务入口（capability-map 的可执行版）

抓取 / 读站：
  do.sh linuxdo <topic> [out_dir] [--start 1] [--end 100] [--target-id ID]
      专用标签内读取 /raw/<topic>/<n>；固定标签，仅首次创建页面，不逐楼导航。
      默认最多读到100楼，可显式指定末楼；缓存续读，连续3楼失败或验证/限流立即停。
      写 manifest.json 记录成功、缺失、停止原因。支持 --delay-ms 1000。
  do.sh linuxdo-floor <topic> <n> [out_file] [--target-id ID]
      抓单楼（返回路径）。

调研 / 搜索 / 记忆：
  do.sh research <kw> [--en <en-kw>]
      深度调研：content_chain.sh 14 通道。
  do.sh search <query>
      普通搜索（不跑 14 通道）。
  do.sh vault <kw>
      查 Obsidian AI沉淀库。

脱水 / 处理：
  do.sh html2text <in.html> <out.txt>
      HTML 脱水（xGoose 五步法）。

网关 / 系统：
  do.sh kiro-restart
      重启 Kiro 网关（ASCII-safe 入口）。

其他：
  do.sh help
EOF
}

action="${1:-help}"
shift || true

case "$action" in
  linuxdo)
    topic="${1:?topic required: do.sh linuxdo <topic> [out_dir]}"
    shift
    out="$HOME/tmp/linuxdo-$topic"
    if [ "$#" -gt 0 ] && [[ "$1" != --* ]]; then out="$1"; shift; fi
    node "$TOOLS/browser-text.mjs" linuxdo "$topic" "$out" "$@"
    ;;

  linuxdo-floor)
    topic="${1:?topic required}"
    n="${2:?floor required}"
    shift 2
    out="floor-$n.md"
    if [ "$#" -gt 0 ] && [[ "$1" != --* ]]; then out="$1"; shift; fi
    [[ "$topic" =~ ^[0-9]+$ && "$n" =~ ^[1-9][0-9]*$ ]] || { echo 'numeric topic/floor required' >&2; exit 2; }
    bash "$TOOLS/bfetch-text.sh" \
      "https://linux.do/t/topic/$topic" \
      "https://linux.do/raw/$topic/$n" \
      "$out" 6 "$@"
    ;;

  research)
    bash "$TOOLS/content_chain.sh" "$@"
    ;;

  search)
    q="${1:?query required}"
    py "$TOOLS/search_api.py" --engine all --query "$q"
    ;;

  vault)
    py "$TOOLS/vaultfind.py" "$@"
    ;;

  html2text)
    in="${1:?input required}"
    out="${2:?output required}"
    py "$TOOLS/html2text.py" "$in" "$out"
    ;;

  kiro-restart)
    powershell -NoProfile -ExecutionPolicy Bypass \
      -File '{USER_HOME}/.agents/tools/kiro-gateway/restart-tray.ps1'
    ;;

  help|-h|--help|'')
    usage
    ;;

  *)
    echo "unknown action: $action"
    echo
    usage
    exit 2
    ;;
esac
