# ゲーム仕様書（MVP）

本ディレクトリは  
**タイル制ローグライク × デッキ構築カードゲーム** の MVP (Minimum Viable Product ：実用最小限の製品仕様) を管理する。

## 仕様の読み方
- 全体像・思想：[vision.md](./vision.md)
- ルール本体：[rules.md](./rules.md)（最重要）
- カード仕様：[cards.md](./cards.md)
- 用語定義：[glossary.md](./glossary.md)
- 定数・前提：[constants.md](./constants.md)（**数値の正**）

## 数値定数の管理ルール
- **すべての数値定数は [constants.md](./constants.md) を正 (Single Source of Truth) とする**
- 他のドキュメントで数値を記載する場合も、`constants.md` の値を参照する
- 数値を変更する際は、まず `constants.md` を更新してから、他のドキュメントを確認・更新する
- 実装コードも `constants.md` の値を基準とする

## MVP の前提
- プレイ可能な最小構成を優先する
- バランス調整・演出・拡張要素は対象外
- 仕様は「実装に合わせて進化」する

## 実装状況（手動更新）
- [ ] ターン進行
- [ ] マップ生成
- [ ] カード使用
- [ ] 戦闘
- [ ] 階層遷移
