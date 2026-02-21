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

---

## 並列処理モード（複数PR）

複数のPR番号が指定された場合、Task toolの `isolation: "worktree"` を使って並列に作業を進める。

### P-1. 事前準備

1. 各PRの未解決レビュースレッドを [未解決スレッドの取得](#ref-未解決のレビュースレッドを取得) の手順で取得する
2. 各PRについて [コメントの詳細を取得](#ref-コメントの詳細を取得) で必要に応じて全文を取得する
3. 各PRの未解決コメントの分析結果と対応方針の一覧をユーザーに提示し、承認を得る

### P-2. PRをドラフトに変換

各PRをドラフトに変換し、PRブランチ名を取得する:

```bash
gh pr ready --undo <番号>
gh pr view <番号> --json headRefName -q .headRefName
```

### P-3. エージェントの並列起動

各PRに対して、Taskツールで `general-purpose` エージェントを **`isolation: "worktree"`** で**並列に**起動する。

**重要**: 全エージェントを**1つのメッセージ内で同時に**起動すること（逐次起動しない）。

各エージェントへのプロンプトには以下を含める:

```
あなたはPR #<番号> のレビューコメント解決担当です。

## リポジトリ情報
- owner/repo: <owner>/<repo>
- PRブランチ: <ブランチ名>

## 未解決レビューコメント
<コメント一覧（スレッドID、databaseId、ファイル、要約、対応方針）>

## 実装手順

まずPRブランチをチェックアウトし、依存関係をインストールする:
gh pr checkout <番号>
pnpm install

レビューコメント1件ごとに以下のサイクルを繰り返す:

1. **コード変更**:
   - CLAUDE.mdの開発方針に従うこと
   - 変更は最小差分で行う
   - 当該コメントの指摘範囲外の変更はしない

2. **コミット前チェック**（各コミットの前に必ず実行）:
   - `pnpm format`
   - `pnpm lint`
   - `pnpm build`（ビルドエラー時は vite skill を参照）
   - `pnpm test:run`（テスト失敗時は vitest skill を参照）

3. **コミット・push**:
   - Conventional Commits形式、日本語、50文字以内
   - コミットメッセージは当該コメントの指摘内容を反映させる
   - `git add <files>`（対象ファイルを個別指定、`git add .` は使わない）
   - `git commit -m "<message>"`
   - `git push -u origin <ブランチ名>`

4. **レビューコメントへの返信・resolve**:
   push後、対応したレビューコメントに対して以下を行う:

   a. 返信（GraphQL API）:
   ```
   gh api graphql -f query='
     mutation { addPullRequestReviewThreadReply(
       input: {
         pullRequestReviewThreadId: "<thread_id>",
         body: "<対応内容の説明> (<コミットハッシュ>)"
       }
     ) { comment { id } } }'
   ```
   - `<thread_id>` はスレッドID（`PRRT_...`形式）
   - 返信内容にはコミットハッシュ（短縮形7桁）を含める

   b. resolve:
   ```
   gh api graphql -f query='
     mutation { resolveReviewThread(input: {threadId: "<thread_id>"}) {
       thread { isResolved }
     } }'
   ```

すべてのコメントの対応が完了したら:

5. **Copilotにレビュー再依頼**:
   ```
   gh api repos/{owner}/{repo}/pulls/<番号>/requested_reviewers \
     -X POST --raw-field 'reviewers[]=copilot-pull-request-reviewer[bot]'
   ```
   （既にreviewerの場合の `Validation Failed` エラーは無視する）

6. **ドラフトを解除**:
   ```
   gh pr ready <番号>
   ```

完了したら、対応したコメント数とPRのURLを報告してください。
```

### P-4. 完了待機・結果報告

全エージェントの完了を待ち、以下を行う:

1. 各エージェントの結果（対応コメント数、PRのURL等）をまとめてユーザーに報告する
2. 各PRのドラフトが解除されているか確認し、ドラフトのまま残っている場合は `gh pr ready <番号>` で解除する

**注意**: worktreeは `isolation: "worktree"` により自動管理される（変更なしなら自動削除、変更ありなら保持）。手動での削除は不要。

---

## 単一処理モード

### 1. PR番号の決定と情報取得

引数が空の場合は、現在のブランチに紐づくPR番号を取得する:

```
gh pr view --json number -q .number
```

[未解決スレッドの取得](#ref-未解決のレビュースレッドを取得) の手順でレビュースレッドを取得し、必要に応じて [コメントの詳細を取得](#ref-コメントの詳細を取得) で全文を取得する。

### 2. レビューコメントの分析

取得した未解決スレッドのコメントを分析し、以下を整理する:

- **対応が必要なコメント**: コード変更を求めるもの（修正依頼、改善提案など）
- **確認・質問のみのコメント**: コード変更は不要だが返答が必要なもの

対応が必要なコメントがない場合は、その旨を報告して終了。

### 3. 対応方針の提示

対応が必要なコメントについて、以下を一覧で提示する:

| # | コメント(databaseId) | スレッドID | ファイル | 要約 | 対応方針 |
|---|---------------------|-----------|---------|------|---------|

コメント(databaseId) 列にはコメントの `databaseId`（コメント詳細の取得・参照用。必要に応じてリファレンスの手順で全文を取得）、スレッドID 列には返信・解決に使用するスレッドの `id` を記載すること。

ユーザーの承認を得てから実装に進むこと。

### 4. PRをドラフトに変換・ブランチ切り替え

```
gh pr ready --undo <番号>
gh pr checkout <番号>
```

### 5. 実装・コミット・push（1コメントずつ）

承認された方針に従い、**レビューコメント1件ごとに**以下のサイクルを繰り返す。

#### 5a. コード変更

- CLAUDE.mdの開発方針に従うこと
- 変更は最小差分で行う
- 当該コメントの指摘範囲外の変更はしない

#### 5b. コミット前チェック

コミット前に以下を**リポジトリルートから**実行し、問題があれば修正する。各コマンドはサブシェルで実行し、カレントディレクトリが戻るようにする:

1. `pnpm format` — フォーマット適用
2. `pnpm lint` — リントチェック
3. `pnpm build` — TypeScriptビルド確認（ビルドエラー時は vite skill を参照）
4. `pnpm test:run` — ユニットテスト全通過を確認（テスト失敗時は vitest skill を参照）

#### 5c. コミット・push

- Conventional Commits形式、日本語、50文字以内
- コミットメッセージは当該コメントの指摘内容を反映させる
- 例: `fix: 除去アニメーションでemit完了を待たずフェードアウト完了で遷移`
- **1コメントの対応が完了するたびにコミットしてpushする**
- `git add` は対象ファイルを個別指定する（`git add .` は使わない）

#### 5d. レビューコメントへの返信・resolve

push後、対応したレビューコメントに対して以下を行う。

1. **返信**: GraphQL APIで対象スレッドに返信する（REST APIの `/replies` エンドポイントは404になる場合があるため）

   ```
   gh api graphql -f query='
     mutation { addPullRequestReviewThreadReply(
       input: {
         pullRequestReviewThreadId: "<thread_id>",
         body: "<対応内容の説明> (<コミットハッシュ>)"
       }
     ) { comment { id } } }'
   ```

   - `<thread_id>` はステップ1で取得済みのスレッドID（`PRRT_...`形式）
   - 返信内容にはコミットハッシュ（短縮形7桁）を含める

2. **resolve**: 同じスレッドIDでresolveする

   ```
   gh api graphql -f query='
     mutation { resolveReviewThread(input: {threadId: "<thread_id>"}) {
       thread { isResolved }
     } }'
   ```

すべてのコメントについて 5a → 5b → 5c → 5d を完了するまで繰り返す。

### 6. Copilotにレビュー再依頼

すべてのコメント対応とpushが完了したら:

```
gh api repos/{owner}/{repo}/pulls/<番号>/requested_reviewers \
  -X POST --raw-field 'reviewers[]=copilot-pull-request-reviewer[bot]'
```

**注意**:
- botアカウント名は `copilot-pull-request-reviewer[bot]`（`[bot]` サフィックスが必要）
- 既にreviewerとしてrequestされている場合、APIが `Validation Failed` エラーを返すことがある。その場合はエラーを無視して続行する

### 7. PRをOPENに戻す

```
gh pr ready <番号>
```

これにより、CIが `ready_for_review` イベントで起動する。

---

## リファレンス（共通手順）

### Ref: 未解決のレビュースレッドを取得

**GraphQL APIで未解決スレッドのみを直接取得する**（REST APIでは解決済み/未解決の区別ができないため）:

```
gh api graphql -f query='
  { repository(owner:"{owner}", name:"{repo}") {
    pullRequest(number:<番号>) {
      reviewThreads(first:100) { nodes {
        id
        isResolved
        comments(first:10) { nodes { databaseId body path line } }
      } }
    }
  } }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id, comments: [.comments.nodes[] | {databaseId, path, line, body: (.body | split("\n")[0][:120])}]}'
```

このクエリにより以下が1回で取得できる:
- **thread ID**: resolve時に使用
- **databaseId**: コメント詳細取得/参照用（REST APIで個別コメントを取得する際に使用）
- **path / line**: 対象ファイルと行番号
- **body**: コメント内容（先頭120文字で要約表示）

**注意**: `first:100` / `first:10` は通常のPRで十分な件数だが、スレッドやコメントが非常に多い場合は取りこぼす可能性がある。結果が上限に達している場合は `pageInfo { hasNextPage endCursor }` を使ってページネーションすること。

### Ref: コメントの詳細を取得

body要約（120文字）では指摘内容を十分把握できない場合に、REST APIでコメント全文を取得する:

```
gh api repos/{owner}/{repo}/pulls/comments/<databaseId> --jq '{id, path, line, body}'
```

**注意**: パスは `pulls/<PR番号>/comments/<id>` ではなく `pulls/comments/<id>` （PR番号なし）。
