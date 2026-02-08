# PRレビューコメント解決

## コンテキスト

### 対象PR
- 引数: `$ARGUMENTS`
- 引数にPR番号が指定されていればそのPRを対象とする（スペース区切りで複数指定可能）
- 引数が空の場合は、現在のブランチに紐づく最新のPRを対象とする

### リポジトリ情報の取得

owner/repo名は以下で取得する:

```
gh repo view --json owner,name -q '(.owner.login) + "/" + .name'
```

この出力（例: `2rumaki-playground/game-001-dungeon-cards`）をもとに、以降のコマンドで `{owner}` `{repo}` と表記している箇所を置き換えること。

## 指示

以下の手順でPRのレビューコメントを確認・解決し、pushまで行ってください。
複数PR番号が指定されている場合は、**PRごとに順番に**全手順を実行する。

### 1. PR番号の決定と情報取得

引数が空の場合は、現在のブランチに紐づくPR番号を取得する:

```
gh pr view --json number -q .number
```

#### 1a. 未解決のレビュースレッドを取得

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

#### 1b. コメントの詳細を取得

ステップ1aのbody要約（120文字）では指摘内容を十分把握できない場合に、REST APIでコメント全文を取得する:

```
gh api repos/{owner}/{repo}/pulls/comments/<databaseId> --jq '{id, path, line, body}'
```

**注意**: パスは `pulls/<PR番号>/comments/<id>` ではなく `pulls/comments/<id>` （PR番号なし）。

### 2. レビューコメントの分析

取得した未解決スレッドのコメントを分析し、以下を整理する:

- **対応が必要なコメント**: コード変更を求めるもの（修正依頼、改善提案など）
- **確認・質問のみのコメント**: コード変更は不要だが返答が必要なもの

対応が必要なコメントがない場合は、その旨を報告して終了。

### 3. 対応方針の提示

対応が必要なコメントについて、以下を一覧で提示する:

| # | コメント(databaseId) | スレッドID | ファイル | 要約 | 対応方針 |
|---|---------------------|-----------|---------|------|---------|

コメント(databaseId) 列にはコメントの `databaseId`（コメント詳細の取得・参照用。必要に応じて手順1bで全文を取得）、スレッドID 列には返信・解決に使用するスレッドの `id` を記載すること。

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

1. `(cd frontend && pnpm format)` — フォーマット適用
2. `(cd frontend && pnpm lint)` — リントチェック
3. `(cd frontend && pnpm build)` — TypeScriptビルド確認
4. `(cd frontend && pnpm test:run)` — ユニットテスト全通過を確認

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

   - `<thread_id>` はステップ1aで取得済みのスレッドID（`PRRT_...`形式）
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
