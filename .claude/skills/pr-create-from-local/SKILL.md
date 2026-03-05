---
name: pr:create-from-local
description: 現在のブランチの変更をコミット・push・PR作成する
disable-model-invocation: true
---

# 現在の作業をcommit・push・PR作成

## 共通リファレンス

実行時に以下の共通ファイルを読み、手順に従うこと:
- `.claude/skills/_shared/pre-commit-checks.md` — コミット前チェック
- `.claude/skills/_shared/commit-rules.md` — コミットルール
- `.claude/skills/_shared/spec-sync.md` — 仕様書同期
- `.claude/skills/_shared/pr-body-template.md` — PRテンプレート

## 指示

現在のブランチの変更をコミットし、リモートにpushし、PRを作成してください。

### 1. 状態確認

以下を並列実行して現在の状態を把握する:

- `git status` で未コミットの変更を確認
- `git diff` でステージされていない変更の内容を確認
- `git log --oneline main..HEAD` でmainからの全コミット履歴を確認
- `git diff main...HEAD --stat` でmainからの変更ファイル一覧を確認
- `git ls-remote --heads origin "$(git rev-parse --abbrev-ref HEAD)"` で現在のブランチがリモートに存在するか確認

mainからの差分（コミット＋未コミット変更）が一切ない場合は「PRにする変更がありません」と報告して終了する。

### 2. コミット前チェック

`pre-commit-checks.md` に従う。問題が見つかった場合は修正してから次に進む。

### 3. 仕様書同期の確認

`spec-sync.md` に従って確認する。

### 4. コミット

- 未コミットの変更がある場合のみコミットする（変更がなければスキップ）
- `commit-rules.md` に従う

### 5. Push

- `git push -u origin <ブランチ名>` でリモートにpush

### 6. PR作成

- 既にこのブランチのPRが存在するか `gh pr list --head <ブランチ名>` で確認
- PRが既に存在する場合はpushのみで完了（PRのURLを表示する）
- PRが存在しない場合は `pr-body-template.md` に従って新規作成:
  - PRの概要にはmainからの**全コミット**の変更内容を反映する（最新コミットだけでなく）
  - ブランチ名に含まれるIssue番号から `Closes #<番号>` を生成する
  - 最後にPRのURLを表示する
