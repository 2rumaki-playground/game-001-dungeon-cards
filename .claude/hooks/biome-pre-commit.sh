#!/bin/bash
# git commit 前に biome format + lint を実行するhook

set -e

# stdin からツール入力のJSONを読み取る
input_json=$(cat)
command=$(echo "$input_json" | jq -r '.tool_input.command // empty')

# git commit コマンド以外はスキップ
if [[ "$command" != *"git commit"* ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "biome format を実行中..." >&2
pnpm format >&2

echo "biome lint を実行中..." >&2
if ! pnpm lint >&2; then
  echo "biome lint でエラーが見つかりました。修正してください。" >&2
  exit 2
fi

# フォーマットで変更されたファイルを再ステージ
changed=$(git diff --name-only -- src/)
if [ -n "$changed" ]; then
  echo "フォーマットで変更されたファイルを再ステージ..." >&2
  echo "$changed" | xargs git add
fi
