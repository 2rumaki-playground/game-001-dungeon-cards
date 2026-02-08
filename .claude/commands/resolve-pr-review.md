# PRレビューコメント解決

## コンテキスト

### 対象PR
- 引数: `$ARGUMENTS`
- 引数にPR番号が指定されていればそのPRを対象とする
- 引数が空の場合は、現在のブランチに紐づく最新のPRを対象とする（`gh pr view` で取得）

## 指示

以下の手順でPRのレビューコメントを確認・解決し、pushまで行ってください。

### 1. PR情報の取得

対象PRの概要とレビューコメントを取得してください:

```
gh pr view <番号>
gh api repos/{owner}/{repo}/pulls/<番号>/comments
gh pr checks <番号>
```

### 2. レビューコメントの分析

取得したレビューコメントを分析し、以下を整理してください:

- **対応が必要なコメント**: コード変更を求めるもの（修正依頼、改善提案など）
- **確認・質問のみのコメント**: コード変更は不要だが返答が必要なもの
- **解決済みのコメント**: 既に対応済みのもの（スキップ）

対応が必要なコメントがない場合は、その旨を報告して終了してください。

### 3. 対応方針の提示

対応が必要なコメントについて、以下を一覧で提示してください:

- コメントの要約
- 対象ファイル・行
- 対応方針（何をどう変更するか）

ユーザーの承認を得てから実装に進むこと。

### 4. PRをドラフトに変換

修正作業中にCIが不要に実行されるのを防ぐため、実装開始前にPRをドラフトに変換する。

```
gh pr ready --undo <番号>
```

### 5. 実装・コミット・push（1コメントずつ）

承認された方針に従い、**レビューコメント1件ごとに**以下のサイクルを繰り返してください。

#### 5a. コード変更

- CLAUDE.mdの開発方針に従うこと
- 変更は最小差分で行う
- 当該コメントの指摘範囲外の変更はしない

#### 5b. コミット前チェック

コミット前に以下を実行し、問題があれば修正する:

1. `pnpm format` — フォーマット適用
2. `pnpm lint` — リントチェック
3. `pnpm build` — TypeScriptビルド確認
4. `pnpm test:run` — ユニットテスト全通過を確認

#### 5c. コミット・push

- Conventional Commits形式、日本語、50文字以内
- コミットメッセージは当該コメントの指摘内容を反映させる
- 例: `refactor: レビュー指摘に対応し命名を修正`
- **1コメントの対応が完了するたびにコミットしてpushする**

#### 5d. レビューコメントへの返信・resolve

push後、対応したレビューコメントに対して以下を行う:

1. **返信**: 対応内容を簡潔に返信する（コミットハッシュを含める）
   ```
   gh api repos/{owner}/{repo}/pulls/<番号>/comments/<コメントID>/replies -f body="<対応内容の説明> (<コミットハッシュ>)"
   ```
2. **resolve**: 対応したコメントが属するreview threadをresolveする
   - まずPRのreview threadsを取得してthread IDを特定する:
     ```
     gh api graphql -f query='{ repository(owner:"{owner}", name:"{repo}") { pullRequest(number:<番号>) { reviewThreads(first:100) { nodes { id isResolved comments(first:1) { nodes { databaseId } } } } } } }'
     ```
   - 対応したコメントの `databaseId` と一致するthreadの `id` を使ってresolveする:
     ```
     gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<thread_id>"}) { thread { isResolved } } }'
     ```

すべてのコメントについて 5a → 5b → 5c → 5d を完了するまで繰り返す。

### 6. Copilotにレビュー再依頼

すべてのコメント対応とpushが完了したら、Copilotにレビューを再依頼する。

#### 6a. 現在のレビュー状態を確認

```
gh api repos/{owner}/{repo}/pulls/<番号>/reviews --jq '.[] | select(.user.login | startswith("copilot")) | .state'
```

#### 6b. レビュー依頼/再依頼

- Copilotが **レビュー済み（COMMENTED等）** の場合: 再依頼する
  ```
  gh api repos/{owner}/{repo}/pulls/<番号>/requested_reviewers -X POST --raw-field 'reviewers[]=copilot-pull-request-reviewer[bot]'
  ```
- Copilotが **requested_reviewers に既にいる** 場合: 依頼済みなので何もしない（pushにより自動で再レビューされる）
- Copilotの **レビューが存在しない** 場合: 新規依頼する（上記と同じコマンド）

**注意**: botアカウント名は `copilot-pull-request-reviewer[bot]`（`[bot]` サフィックスが必要）。

### 7. PRをOPENに戻す

Copilotへのレビュー再依頼が完了したら、PRをドラフトからOPEN（ready for review）に戻す。

```
gh pr ready <番号>
```

これにより、CIが `ready_for_review` イベントで起動する。

