# GraphQL レビューAPI リファレンス

## 未解決のレビュースレッドを取得

GraphQL APIで未解決スレッドのみを直接取得する（REST APIでは解決済み/未解決の区別ができないため）:

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

取得できる情報:
- **thread ID**: resolve時に使用（`PRRT_...`形式）
- **databaseId**: コメント詳細取得/参照用
- **path / line**: 対象ファイルと行番号
- **body**: コメント内容（先頭120文字で要約表示）

**注意**: `first:100` / `first:10` は通常のPRで十分な件数だが、上限に達している場合は `pageInfo { hasNextPage endCursor }` でページネーションすること。

## コメントの詳細を取得

body要約（120文字）では指摘内容を十分把握できない場合に、REST APIでコメント全文を取得する:

```
gh api repos/{owner}/{repo}/pulls/comments/<databaseId> --jq '{id, path, line, body}'
```

**注意**: パスは `pulls/<PR番号>/comments/<id>` ではなく `pulls/comments/<id>`（PR番号なし）。

## スレッドに返信

GraphQL APIで対象スレッドに返信する（REST APIの `/replies` エンドポイントは404になる場合があるため）:

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

## スレッドをresolve

```
gh api graphql -f query='
  mutation { resolveReviewThread(input: {threadId: "<thread_id>"}) {
    thread { isResolved }
  } }'
```
