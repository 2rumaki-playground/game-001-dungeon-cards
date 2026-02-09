# game-001-dungeon-cards

「タイル制ローグライク × デッキ構築」のゲーム開発

## 技術スタック

| カテゴリ | ツール |
|----------|--------|
| 言語 | [TypeScript](https://www.typescriptlang.org/) |
| ビルド | [Vite](https://vite.dev/) |
| 描画 | [PixiJS](https://pixijs.com/) |
| パッケージマネージャー | [pnpm](https://pnpm.io/) |
| リンター / フォーマッター | [Biome](https://biomejs.dev/) |
| テスト | [Vitest](https://vitest.dev/) / [Playwright](https://playwright.dev/) |

## セットアップ

### 前提条件

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)

### インストール

```bash
pnpm install
```

## 開発コマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm preview` | ビルド結果のプレビュー |
| `pnpm lint` | リントチェック |
| `pnpm format` | フォーマット適用 |
| `pnpm test` | ユニットテスト（watchモード） |
| `pnpm test:run` | ユニットテスト（1回のみ） |
| `pnpm test:e2e` | E2Eテスト |

## ディレクトリ構造

```
src/
├── main.ts          # エントリーポイント
├── constants.ts     # 定数
├── types/           # 型定義
├── game/            # ゲームロジック
├── ui/              # UI関連
└── utils/           # ユーティリティ
```

ゲームの仕様は `docs/spec/` 配下で管理しています。
