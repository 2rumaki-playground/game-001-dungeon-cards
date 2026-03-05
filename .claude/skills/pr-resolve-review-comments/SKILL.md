---
name: pr:resolve-review-comments
description: PRのレビューコメントを確認・解決し、pushまで行う
disable-model-invocation: true
argument-hint: "[PR番号... (スペース区切りで複数指定可)]"
---

# PRレビューコメント解決

## コンテキスト

### 対象PR
- 引数: `$ARGUMENTS`
- 引数にPR番号が指定されていればそのPRを対象とする（スペース区切りで複数指定可能）
- 引数が空の場合は、現在のブランチに紐づく最新のPRを対象とする

## 指示

以下の手順でPRのレビューコメントを確認・解決し、pushまで行ってください。

**複数PR番号が指定された場合**: → [並列処理モード](#並列処理モード複数pr) に進む
**単一PR（または引数なし）の場合**: → [単一処理モード](#単一処理モード) に進む

### 共通リファレンス

実行時に以下の共通ファイルを読み、手順に従うこと:
- `.claude/skills/_shared/graphql-review.md` — GraphQL API（スレッド取得・返信・resolve）
- `.claude/skills/_shared/conflict-resolution.md` — コンフリクト確認・解消
- `.claude/skills/_shared/pre-commit-checks.md` — コミット前チェック
- `.claude/skills/_shared/commit-rules.md` — コミットルール
- `.claude/skills/_shared/spec-sync.md` — 仕様書同期

---

## 並列処理モード（複数PR）

Agentツール（Claude Code）の `isolation: "worktree"` を使って並列に作業を進める。

### P-1. 事前準備

1. 各PRの未解決レビュースレッドを `graphql-review.md` の手順で取得する
2. 必要に応じてコメント全文を取得する
3. 各PRについて `conflict-resolution.md` の手順でコンフリクト有無を確認する
4. 各PRの未解決コメントの分析結果と対応方針の一覧をユーザーに提示する。コンフリクトがあるPRについてはその旨も合わせて提示し、コンフリクト解消も行うか確認する。承認を得てから実装に進む

### P-2. PRをドラフトに変換

各PRをドラフトに変換し、PRブランチ名を取得する:

```bash
gh pr ready --undo <番号>
gh pr view <番号> --json headRefName -q .headRefName
```

### P-3. エージェントの並列起動

各PRに対して、Agentツールで `general-purpose` エージェントを **`isolation: "worktree"`** で**並列に**起動する。

**重要**: 全エージェントを**1つのメッセージ内で同時に**起動すること（逐次起動しない）。

各エージェントへのプロンプトには以下を含める:

````
あなたはPR #<番号> のレビューコメント解決担当です。

## リポジトリ情報
- owner/repo: {owner}/{repo}
- PRブランチ: <ブランチ名>

## 未解決レビューコメント
<コメント一覧（スレッドID、databaseId、ファイル、要約、対応方針）>

## コンフリクト状態
- baseRefName: <baseブランチ名>
- mergeable: <MERGEABLE / CONFLICTING / UNKNOWN>
- コンフリクト解消: <実施する / 実施しない（ユーザー承認結果）>

## 共通リファレンス
実行前に以下のファイルを読んで手順に従うこと:
- `.claude/skills/_shared/graphql-review.md`
- `.claude/skills/_shared/conflict-resolution.md`
- `.claude/skills/_shared/pre-commit-checks.md`
- `.claude/skills/_shared/commit-rules.md`
- `.claude/skills/_shared/spec-sync.md`

## 実装手順

まずPRブランチをチェックアウトする:
gh pr checkout <番号>

<コンフリクト解消が承認されている場合のみ>
`conflict-resolution.md` の手順に従い、コンフリクトを解消してコミット・pushする。
</コンフリクト解消が承認されている場合のみ>

依存関係をインストールする:
pnpm install

レビューコメント1件ごとに以下のサイクルを繰り返す:

1. **コード変更**: CLAUDE.mdの開発方針に従い、最小差分で行う
2. **コミット前チェック**: `pre-commit-checks.md` に従う
3. **仕様書同期チェック**: `spec-sync.md` に従う
4. **コミット・push**: `commit-rules.md` に従い、`git push -u origin <ブランチ名>`
5. **レビューコメントへの返信・resolve**: `graphql-review.md` の手順に従う

すべてのコメントの対応が完了したら:

6. **Copilotにレビュー再依頼**:
   ```
   gh api repos/{owner}/{repo}/pulls/<番号>/requested_reviewers \
     -X POST --raw-field 'reviewers[]=copilot-pull-request-reviewer[bot]'
   ```
   （`Validation Failed` エラーは無視する）

7. **ドラフトを解除**: `gh pr ready <番号>`

完了したら、対応したコメント数とPRのURLを報告してください。
````

### P-4. 完了待機・結果報告

全エージェントの完了を待ち、各エージェントの結果をまとめてユーザーに報告する。ドラフトのまま残っているPRがあれば `gh pr ready <番号>` で解除する。

---

## 単一処理モード

### 1. PR番号の決定と情報取得

引数が空の場合は `gh pr view --json number -q .number` でPR番号を取得する。

`graphql-review.md` の手順でレビュースレッドを取得し、必要に応じてコメント全文を取得する。`conflict-resolution.md` の手順でコンフリクト有無を確認する。

### 2. レビューコメントの分析

取得した未解決スレッドのコメントを分析し、以下を整理する:

- **対応が必要なコメント**: コード変更を求めるもの
- **確認・質問のみのコメント**: コード変更は不要だが返答が必要なもの

対応が必要なコメントがない場合は、その旨を報告して終了。

### 3. 対応方針の提示

| # | コメント(databaseId) | スレッドID | ファイル | 要約 | 対応方針 |
|---|---------------------|-----------|---------|------|---------|

コンフリクトがある場合はその旨も提示し、解消も行うか確認する。ユーザーの承認を得てから実装に進む。

### 4. PRをドラフトに変換・ブランチ切り替え

```
gh pr ready --undo <番号>
gh pr checkout <番号>
```

### 4.5. コンフリクト解消（該当する場合のみ）

ステップ3でコンフリクト解消が承認された場合のみ、`conflict-resolution.md` の手順に従い実施する。

### 5. 実装・コミット・push（1コメントずつ）

**レビューコメント1件ごとに**以下のサイクルを繰り返す:

1. **コード変更**: CLAUDE.mdの開発方針に従い、最小差分で行う
2. **コミット前チェック**: `pre-commit-checks.md` に従う
3. **仕様書同期チェック**: `spec-sync.md` に従う
4. **コミット・push**: `commit-rules.md` に従い、コミットメッセージは指摘内容を反映させる。`git push -u origin <ブランチ名>`
5. **レビューコメントへの返信・resolve**: `graphql-review.md` の手順に従う

### 6. Copilotにレビュー再依頼

```
gh api repos/{owner}/{repo}/pulls/<番号>/requested_reviewers \
  -X POST --raw-field 'reviewers[]=copilot-pull-request-reviewer[bot]'
```

**注意**: `Validation Failed` エラーは無視して続行する。

### 7. PRをOPENに戻す

```
gh pr ready <番号>
```
