# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

「タイル制ローグライク × デッキ構築」ゲームのMVP（Minimum Viable Product）開発。現在は仕様策定フェーズで、実装コードはまだ存在しない。

## 仕様ドキュメント構成

すべての仕様は `docs/spec/mvp/` 配下で管理：

| ファイル | 役割 |
|----------|------|
| `rules.md` | ゲーム進行の本則（最重要） |
| `cards.md` | カードの効果・コスト・成立条件 |
| `constants.md` | 数値・上限などのパラメータ（**正典：Single Source of Truth**） |
| `glossary.md` | 用語の定義 |
| `vision.md` | ゲームのビジョン・コンセプト |

## 開発方針

### MVP優先
- プレイ可能な最小構成を最短で作る
- 演出・拡張・バランス調整はスコープ外

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

Conventional Commits形式、**日本語**、50文字以内。

```
<type>: <説明>
```

**Type**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`

例: `docs: 階段の配置ルールを明確化`

## 仕様の曖昧さを見つけたら

Issueとして起票する：
- **タイトル**: 何が未定義/曖昧かを1行で
- **参照**: 該当ファイルと行または見出し
- **背景/問題**: 実装・テスト・UXで何が困るか
- **受け入れ条件**: 何が決まれば完了か

## 技術スタック（予定）

- フロント: TypeScript + Vite + PixiJS
- バック: ASP.NET Core (.NET 10) Minimal API
- テスト: xUnit
- DB: MVPでは使用しない

## 言語

すべての出力は**日本語**で行う（PR概要、Issue、コミットメッセージ含む）。
