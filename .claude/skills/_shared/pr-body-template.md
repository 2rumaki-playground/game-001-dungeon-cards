# PR作成テンプレート

```
gh pr create --base main --title "<type>: <日本語の説明>" --body "$(cat <<'EOF'
## 概要
<変更内容の箇条書き>

Closes #<Issue番号>

## テスト計画
<テスト方法のチェックリスト>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- PRタイトルはConventional Commits形式、日本語、70文字以内
- bodyに `Closes #<Issue番号>` を必ず含め、マージ時にIssueが自動クローズされるようにする
- 最後にPRのURLをユーザーに報告する
