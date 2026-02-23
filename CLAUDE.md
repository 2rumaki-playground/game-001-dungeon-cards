# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

「タイル制ローグライク × デッキ構築」ゲーム開発。

## 仕様ドキュメント

すべての仕様は `docs/spec/` 配下で管理。一覧は [`docs/spec/readme.md`](docs/spec/readme.md) を参照。

特に重要なファイル：
- `rules.md` — ゲーム進行の本則（最重要）
- `constants.md` — 数値パラメータの**正典（Single Source of Truth）**

## 開発方針

### 最小差分
- 必要な範囲だけ変更
- 関係ない整形・言い回し変更はしない

### 単一の拠り所
- 同じ数値やルールを複数箇所に重複して書かない
- 数値は必ず `constants.md` を参照

### 仕様の穴は可視化
- 曖昧点は勝手に決めずにIssue化
- 提案はOKだが、断定して実装に入れない

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
