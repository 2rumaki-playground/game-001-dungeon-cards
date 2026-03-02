#!/bin/bash
# Codex CLI によるコードレビュー
# 未コミットの変更を対象にレビューを実行し、結果をファイルに保存する
set -euo pipefail

REVIEW_FILE=".codex-review-result.md"

# 変更がなければスキップ
if git diff --quiet && git diff --cached --quiet; then
	echo "レビュー対象の変更がありません。"
	exit 0
fi

echo "Codex CLI でコードレビューを実行中..."

codex exec review \
	--uncommitted \
	--output-last-message "$REVIEW_FILE" \
	"日本語でレビューしてください。以下の観点で指摘してください：
- バグや論理エラー
- パフォーマンス問題
- セキュリティ問題
- コード品質・可読性の改善点
- テスト漏れの可能性"

echo ""
echo "===== レビュー結果 ====="
cat "$REVIEW_FILE"
echo ""
echo "レビュー結果は ${REVIEW_FILE} に保存されました。"
