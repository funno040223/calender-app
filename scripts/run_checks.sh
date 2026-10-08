#!/usr/bin/env bash
# ナレッジグラフの検証①〜⑤を実行する。①〜③が不合格なら終了コード 1。
# 使い方：scripts/run_checks.sh [graph.json] [report.json]
# Neo4j が使える環境（NEO4J_URI など設定済み、cypher-shell あり）では docs/graph/checks.cypher を同じ内容で実行できる。
set -euo pipefail
cd "$(dirname "$0")/.."
GRAPH="${1:-docs/graph/data/graph.json}"
REPORT="${2:-docs/graph/data/check_report.json}"
if [[ -n "${NEO4J_URI:-}" ]] && command -v cypher-shell >/dev/null 2>&1; then
  echo "(Neo4j が使えます。checks.cypher を $NEO4J_URI で実行する場合は、パラメータ \$files / \$lines を渡してください)"
fi
node scripts/graph/run_checks.mjs "$GRAPH" "$REPORT"
