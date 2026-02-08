# Issue対応ブランチ・PR作成

## コンテキスト: オープンIssue一覧

```
$![gh issue list]
```

## 指示

上記のオープンIssue一覧を確認し、以下の手順で対応ブランチの作成からPR作成までを行ってください。

### 1. 対象Issueの決定

- 引数: `$ARGUMENTS`
- 引数にIssue番号が指定されていればそのIssueを対象とする（スペース区切りで複数指定可能）
- 引数が空の場合は、一覧の中で最も番号が小さい（最も古い）オープンIssueを自動選択する

**複数Issue番号が指定された場合**: → [並列処理モード](#並列処理モード複数issue) に進む
**単一Issue（または引数なし）の場合**: → [単一処理モード](#単一処理モード) に進む

---

## 並列処理モード（複数Issue）

複数のIssue番号が指定された場合、agent teamとgit worktreeを使って並列に作業を進める。

### P-1. 事前準備

1. 各Issueの詳細を `gh issue view <番号>` で取得し、内容を把握する
2. 対応方針の一覧をユーザーに提示し、承認を得る

### P-2. チームの作成

TeamCreateでチームを作成する:
- チーム名: `issue-pr-batch`

### P-3. タスクの作成

各Issueに対してTaskCreateでタスクを作成する。タスクの説明には以下を含める:
- Issue番号とタイトル
- Issueの本文（受け入れ条件）
- worktreeパスとブランチ名

### P-4. git worktreeのセットアップ

各Issueについて以下を実行する:

```bash
# mainから対象ブランチを作成
git branch <ブランチ名> main

# worktreeを作成（/tmp配下に作成し、メインリポジトリを汚さない）
git worktree add /tmp/wt-issue-<番号> <ブランチ名>

# worktreeで依存関係をインストール（サブシェルで実行し、カレントディレクトリを維持）
(cd /tmp/wt-issue-<番号>/frontend && pnpm install)
```

- ブランチ名の規則は [単一処理モードのステップ3](#3-ブランチの作成) と同じ

### P-5. エージェントの並列起動

各Issueに対して、Taskツールで `general-purpose` エージェントを**並列に**起動する。

**重要**: 全エージェントを**1つのメッセージ内で同時に**起動すること（逐次起動しない）。

各エージェントへのプロンプトには以下を含める:

```
あなたはIssue #<番号> の実装担当です。

## 作業ディレクトリ
/tmp/wt-issue-<番号>

## リポジトリ情報
- owner/repo: <owner>/<repo>
- ベースブランチ: main
- 作業ブランチ: <ブランチ名>（作成済み）

## Issue内容
<gh issue viewの出力>

## 実装手順

以下のすべての作業を /tmp/wt-issue-<番号> ディレクトリ内で行うこと。
メインリポジトリのファイルは絶対に変更しないこと。

1. **設計**: Issueが複数ファイルにまたがる変更や設計判断を伴う場合はプランモードで方針を決定
2. **実装（TDD）**:
   - Red: 失敗するテストを先に書く
   - Green: テストが通る最小限の実装
   - Refactor: 必要に応じてリファクタリング
3. **コミット前チェック**（各コミットの前に必ず実行）:
   - `cd /tmp/wt-issue-<番号>/frontend && pnpm format`
   - `cd /tmp/wt-issue-<番号>/frontend && pnpm lint`
   - `cd /tmp/wt-issue-<番号>/frontend && pnpm build`
   - `cd /tmp/wt-issue-<番号>/frontend && pnpm test:run`
   - `cd /tmp/wt-issue-<番号>/frontend && pnpm test:e2e`
4. **コミット**: Conventional Commits形式、日本語、50文字以内
   - `git -C /tmp/wt-issue-<番号> add <files>`
   - `git -C /tmp/wt-issue-<番号> commit -m "<message>"`
5. **push**: `git -C /tmp/wt-issue-<番号> push -u origin <ブランチ名>`
6. **PR作成**（worktreeディレクトリで実行すること）:
   ```
   cd /tmp/wt-issue-<番号> && gh pr create --base main --head <ブランチ名> --title "<type>: <日本語の説明>" --body "$(cat <<'EOF'
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

## 仕様の曖昧さへの対応
実装中に仕様の曖昧さを発見した場合:
1. 曖昧な点を明記した新しいIssueを起票する
2. 最も保守的な解釈で実装し、PRの概要に判断理由を記載する

## コーディング規約
- CLAUDE.mdの開発方針に従うこと
- インデント: タブ、クォート: ダブルクォート
- import順序はBiomeの規約に従う

完了したら、作成したPRのURLを報告してください。
```

### P-6. 完了待機と後片付け

全エージェントの完了を待ち、以下を行う:

1. 各エージェントの結果（PRのURL等）をまとめてユーザーに報告する
2. git worktreeを削除する:
   ```bash
   git worktree remove /tmp/wt-issue-<番号>
   git branch -d <ブランチ名>  # push -u でupstream設定済みのため -d で削除可能
   ```
3. チームを削除する（TeamDelete）

---

## 単一処理モード

### 2. Issue詳細の取得

`gh issue view <番号>` を実行し、Issueの内容を把握してください。

### 3. ブランチの作成

- mainブランチから新しいブランチを作成してください
- ブランチ名: `<prefix>/<issue番号>-<簡潔な英語の説明>`（例: `feat/42-add-card-effect`）
- Issueの内容に応じてプレフィックスを選択する:
  - `feat/` — 新機能の追加
  - `fix/` — バグ修正
  - `docs/` — ドキュメントのみの変更
  - `refactor/` — 機能変更を伴わないリファクタリング
  - `chore/` — ビルド設定・CI・依存関係などの雑務

### 4. 設計確認

Issueが複数ファイルにまたがる変更や、設計判断を伴う場合は、実装に入る前にプランモードで設計方針を提示し、ユーザーの承認を得てから進めること。単純な修正の場合はこのステップをスキップしてよい。

### 5. 実装（TDD）

Issue の内容に従い、TDD（テスト駆動開発）で実装を行ってください。CLAUDE.md の開発方針に従うこと。

1. **Red**: Issueの受け入れ条件に基づき、失敗するテストを先に書く
2. **Green**: テストが通る最小限の実装を行う
3. **Refactor**: 必要に応じてリファクタリングする

テストとプロダクションコードは必ずこの順序で作成すること。

### 6. コミット

- Conventional Commits形式、日本語、50文字以内
- 例: `feat: カード効果の実装`
- **粒度**: 意味のあるまとまりごとにコミットする。1つのIssueに対して複数コミットでよい（例: テスト追加、実装、リファクタリングを分けるなど）。ただし、Red（失敗するテストのみ）の状態ではコミットしない
- **コミット前チェック**: 各コミットの前に以下を**リポジトリルートから**実行し、問題があれば修正してからコミットする（`package.json` は `frontend/` にのみ存在する）
  1. `(cd frontend && pnpm format)` — フォーマット適用
  2. `(cd frontend && pnpm lint)` — リントチェック
  3. `(cd frontend && pnpm build)` — TypeScriptビルド確認
  4. `(cd frontend && pnpm test:run)` — ユニットテスト全通過を確認
  5. `(cd frontend && pnpm test:e2e)` — E2Eテスト全通過を確認

### 7. 仕様の曖昧さへの対応

実装中にIssueの受け入れ条件や仕様ドキュメント（`docs/spec/`）に曖昧な点を発見した場合:

1. 曖昧な点を明記した新しいIssueを起票する（CLAUDE.mdの「仕様の曖昧さを見つけたら」に従う）
2. 現在の実装は、曖昧な部分に依存しない範囲で進める。曖昧な部分に依存せざるを得ない場合は、最も保守的な解釈で実装し、PRの概要に判断理由を記載する

### 8. PR作成

以下の形式でPRを作成してください:

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
