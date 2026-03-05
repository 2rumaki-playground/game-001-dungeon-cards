# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

「タイル制ローグライク × デッキ構築」ゲーム開発。

## 仕様ドキュメント

すべての仕様は `docs/spec/` 配下で管理。一覧は [`docs/spec/readme.md`](docs/spec/readme.md) を参照。

特に重要なファイル：
- `rules.md` — ゲーム進行の本則（最重要）
- `constants.md` — 数値パラメータの**正典（Single Source of Truth）**

## 基本方針

### 後方互換性は不要
- 本プロジェクトはリリース前の開発段階であり、後方互換性を一切考慮しない
- deprecated マーク、互換shim、リネーム後の再エクスポート等は禁止
- インターフェース変更時は旧APIを残さず、使用箇所をすべて書き換える

### 最小差分
- 必要な範囲だけ変更。関係ない整形・言い回し変更はしない
- 無関係なリファクタリングは禁止

### 根本原因の修正
- 暫定対応・ハック修正は禁止。必ず根本原因を修正する
- 非自明な変更では「もっと単純に書けないか？」を自問する
- 単純な修正では過剰設計しない

### 単一の拠り所
- 同じ数値やルールを複数箇所に重複して書かない
- 数値は必ず `constants.md` を参照

### 仕様の穴は可視化
- 曖昧点は勝手に決めずにIssue化
- 提案はOKだが、断定して実装に入れない

### 仕様書の同期
- コード変更が仕様（`docs/spec/`）に影響する場合、仕様ドキュメントも同時に更新する
- ゲームルール・定数・タイル種別・敵パラメータなどの変更は特に注意

## 作業の進め方

### 計画ファースト
- 3ステップ以上の作業や設計判断を伴う変更は、必ず計画を立ててから実装する
- 途中で想定外の問題が出たら即停止して再計画する

### 完了条件
以下を満たさない限り、タスクを完了としない：
- `pnpm test:run` でユニットテストが全通過している
- `pnpm build` でビルドが成功している
- 変更前後の挙動差を説明できる

### バグ修正
- バグ報告を受けたら、追加の指示を求めず調査・修正を進める
- ログ・エラー・テスト失敗から原因を特定し、根本原因を修正する

## コミットメッセージ

[`.github/git-commit-instructions.md`](.github/git-commit-instructions.md) に従う。
要点：Conventional Commits形式、**日本語**、50文字以内。

## 仕様の曖昧さを見つけたら

Issueとして起票する：
- **タイトル**: 何が未定義/曖昧かを1行で
- **参照**: 該当ファイルと行または見出し
- **背景/問題**: 実装・テスト・UXで何が困るか
- **受け入れ条件**: 何が決まれば完了か

## 開発

開発環境の詳細は [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) を参照。

### よく使うコマンド

```bash
pnpm install     # 依存関係のインストール
pnpm dev         # 開発サーバー起動
pnpm build       # プロダクションビルド
pnpm lint        # Biomeによるリント
pnpm format      # Biomeによるフォーマット
pnpm test:run    # ユニットテスト実行
pnpm test:e2e    # E2Eテスト実行
```

### 技術スタック

TypeScript / Vite / PixiJS / pnpm / Biome / Vitest / Playwright

### ディレクトリ構造

```
src/
├── main.ts          # エントリーポイント
├── constants.ts     # 定数（constants.mdの値）
├── types/           # 型定義
├── game/            # ゲームロジック
├── ui/              # UI関連
└── utils/           # ユーティリティ（RNGなど）
```

### コーディング規約

`biome.json` に従う（タブインデント、ダブルクォート、import自動整理）。

## 言語

すべての出力は**日本語**で行う（PR概要、Issue、コミットメッセージ含む）。
