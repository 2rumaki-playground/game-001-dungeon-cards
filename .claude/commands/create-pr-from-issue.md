# Issue対応ブランチ・PR作成

## コンテキスト

### オープンIssue一覧

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

複数のIssue番号が指定された場合、Task toolの `isolation: "worktree"` を使って並列に作業を進める。

### P-1. 事前準備

1. 各Issueの詳細を `gh issue view <番号>` で取得し、内容を把握する
2. 対応方針の一覧をユーザーに提示し、承認を得る

### P-2. エージェントの並列起動

各Issueに対して、Taskツールで `general-purpose` エージェントを **`isolation: "worktree"`** で**並列に**起動する。

**重要**: 全エージェントを**1つのメッセージ内で同時に**起動すること（逐次起動しない）。

各エージェントへのプロンプトには以下を含める:

```
あなたはIssue #<番号> の実装担当です。

## リポジトリ情報
- owner/repo: <owner>/<repo>
- ベースブランチ: main

## Issue内容
<gh issue viewの出力>

## ブランチ名の規則
<prefix>/<issue番号>-<簡潔な英語の説明>（例: feat/42-add-card-effect）
プレフィックス: feat/ fix/ docs/ refactor/ chore/（Issueの内容に応じて選択）

## 実装手順

1. **ブランチ作成**: mainから上記規則でブランチを作成し、チェックアウトする
2. **依存関係インストール**: `pnpm install`
3. **設計**: Issueが複数ファイルにまたがる変更や設計判断を伴う場合はプランモードで方針を決定
4. **実装（TDD）**:
   - Red: 失敗するテストを先に書く
   - Green: テストが通る最小限の実装
   - Refactor: 必要に応じてリファクタリング
5. **コミット前チェック**（各コミットの前に必ず実行）:
   - `pnpm format`
   - `pnpm lint`
   - `pnpm build`（ビルドエラー時は vite skill を参照）
   - `pnpm test:run`（テスト失敗時は vitest skill を参照）
   - `pnpm test:e2e`
6. **コミット**: Conventional Commits形式、日本語、50文字以内
   - `git add <files>`（対象ファイルを個別指定、`git add .` は使わない）
   - `git commit -m "<message>"`
7. **push**: `git push -u origin <ブランチ名>`
8. **PR作成**:
   ```
   gh pr create --base main --head <ブランチ名> --title "<type>: <日本語の説明>" --body "$(cat <<'EOF'
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

### P-3. 完了待機・結果報告

全エージェントの完了を待ち、各エージェントの結果（PRのURL等）をまとめてユーザーに報告する。

**注意**: worktreeは `isolation: "worktree"` により自動管理される（変更なしなら自動削除、変更ありなら保持）。手動での削除は不要。

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

**スキル参照**: テストの書き方・API・モック・カバレッジ等で迷った場合は vitest skill のreferencesを参照すること。

### 6. コミット

- Conventional Commits形式、日本語、50文字以内
- 例: `feat: カード効果の実装`
- **粒度**: 意味のあるまとまりごとにコミットする。1つのIssueに対して複数コミットでよい（例: テスト追加、実装、リファクタリングを分けるなど）。ただし、Red（失敗するテストのみ）の状態ではコミットしない
- **コミット前チェック**: 各コミットの前に以下を実行し、問題があれば修正してからコミットする
  1. `pnpm format` — フォーマット適用
  2. `pnpm lint` — リントチェック
  3. `pnpm build` — TypeScriptビルド確認（ビルドエラー時は vite skill を参照）
  4. `pnpm test:run` — ユニットテスト全通過を確認（テスト失敗時は vitest skill を参照）
  5. `pnpm test:e2e` — E2Eテスト全通過を確認

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
