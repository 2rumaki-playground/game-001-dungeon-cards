# 現在の作業をcommit・push・PR作成

## 指示

現在のブランチの変更をコミットし、リモートにpushし、PRを作成してください。

### 1. 状態確認

以下を並列実行して現在の状態を把握する:

- `git status` で未コミットの変更を確認
- `git diff` でステージされていない変更の内容を確認
- `git log --oneline main..HEAD` でmainからの全コミット履歴を確認
- `git diff main...HEAD --stat` でmainからの変更ファイル一覧を確認
- 現在のブランチがリモートに存在するか確認

### 2. コミット前チェック

以下を順に実行し、問題があれば修正する:

1. `pnpm format` — フォーマット適用
2. `pnpm lint` — リントチェック
3. `pnpm build` — TypeScriptビルド確認（ビルドエラー時は vite skill を参照）
4. `pnpm test:run` — ユニットテスト全通過を確認（テスト失敗時は vitest skill を参照）

問題が見つかった場合は修正してから次に進む。Vite設定やVitest設定に関する問題は、各スキルのreferencesディレクトリ内の詳細ドキュメントを参照すること。

### 3. コミット

- 未コミットの変更がある場合のみコミットする（変更がなければスキップ）
- Conventional Commits形式、日本語、50文字以内
- CLAUDE.mdに記載のtype一覧（feat/fix/docs/refactor/test/chore/build/ci/perf/style）から選択
- 関連ファイルを個別に `git add` する（`git add .` は使わない）

### 4. Push

- `git push -u origin <ブランチ名>` でリモートにpush

### 5. PR作成

- 既にこのブランチのPRが存在するか `gh pr list --head <ブランチ名>` で確認
- PRが既に存在する場合はpushのみで完了（PRのURLを表示する）
- PRが存在しない場合は以下の形式で新規作成:

```
gh pr create --base main --title "<type>: <日本語の説明>" --body "$(cat <<'EOF'
## 概要
<mainからの全変更内容を分析した箇条書き>

Closes #<関連Issue番号（ブランチ名から推測）>

## テスト計画
<テスト方法のチェックリスト>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- PRタイトルはConventional Commits形式、日本語、70文字以内
- PRの概要にはmainからの**全コミット**の変更内容を反映する（最新コミットだけでなく）
- ブランチ名に含まれるIssue番号から `Closes #<番号>` を生成する
- 最後にPRのURLを表示する
