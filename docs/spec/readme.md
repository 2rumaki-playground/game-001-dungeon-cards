# ゲーム仕様書

本ディレクトリは
**タイル制ローグライク × デッキ構築カードゲーム** の仕様を管理する。

## 仕様の読み方
- 全体像・思想：[vision.md](./vision.md)
- デザイン目標：[gdd.md](./gdd.md)（体験目標・判断軸）
- ルール本体：[rules.md](./rules.md)（最重要）
- カード仕様：[cards.md](./cards.md)
- 敵タイプ仕様：[enemies.md](./enemies.md)
- デッキ構築仕様：[deckbuilding.md](./deckbuilding.md)
- 用語定義：[glossary.md](./glossary.md)
- 定数・前提：[constants.md](./constants.md)（**数値の正典**）
- バランスシート：[balance-sheet.md](./balance-sheet.md)（パラメータ間の影響関係）

## 数値定数の管理ルール
- **すべての数値定数は [constants.md](./constants.md) を正典 (Single Source of Truth) とする**
- 他のドキュメントで数値を記載する場合も、`constants.md` の値を参照する
- 数値を変更する際は、まず `constants.md` を更新してから、他のドキュメントを確認・更新する
- 実装コードも `constants.md` の値を基準とする
- 仕様が先行して更新され実装が未追従の場合は、対応する Issue で管理する

## 前提
- MVP で構築したゲームの基盤の上に、カードバリエーションを追加する
- バランス調整は継続的に行う

## 技術スタック
- フロント：TypeScript + Vite
- 描画：PixiJS（2Dタイル描画）
- UI：HTML/CSS で必要最小限
- バック：ASP.NET Core (.NET 10) Minimal API（将来導入検討中／現スコープ外・未導入）
- テスト：Vitest

## 現在のスコープ
- 強攻撃カード・ジャンプカードの追加
- カード種別のビジュアル差別化
- セーブ：ローカルのみ（`localStorage`）
- プレイ：ソロ専用
- 認証：なし
- サーバ：不要

## MVPからの変更点
- カード種別を3種（移動・攻撃・待機）から5種（+強攻撃・ジャンプ）に拡張
- 初期デッキ構成を更新（合計18枚を維持しつつ、通常カードを減らして強行動カードを追加）
- MVP仕様の履歴は Git のコミット履歴を参照する
