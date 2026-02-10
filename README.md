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
| 開発ツール管理 | [mise](https://mise.jdx.dev/) |

## セットアップ

### 前提条件

- [mise](https://mise.jdx.dev/)
- [Node.js](https://nodejs.org/) (v24)
- [pnpm](https://pnpm.io/) (v10、`mise.toml` で管理)

### インストール

```bash
mise install
pnpm install
pnpm exec playwright install --with-deps chromium  # E2Eテスト用
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

## CI/CD

| ワークフロー | トリガー | 内容 |
|-------------|---------|------|
| CI | PRのopen / ready_for_review | lint・ユニットテスト・E2Eテスト・ビルドを並列実行 |
| Release | mainへのpush | Conventional Commitsに基づくバージョンタグの自動付与とGitHub Releaseの作成 |

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

## 画像アセット

ゲーム内の描画はPNGスプライトで行っています。すべてのアセットは `public/assets/` 配下に配置します。

### ディレクトリ構成

```
public/assets/
├── tiles/
│   ├── floor.png
│   ├── wall.png
│   ├── stairs.png
│   ├── trap.png
│   ├── treasure.png
│   └── rest_area.png
├── enemies/
│   ├── normal.png
│   ├── heavy.png
│   ├── scout.png
│   ├── miniboss.png
│   └── boss.png
└── player.png
```

### 画像仕様

| 項目 | 値 |
|------|-----|
| サイズ | 64×64 px（`CELL_SIZE` と一致） |
| フォーマット | PNG |
| scaleMode | `nearest`（ピクセルアート向け、拡大時にぼやけない） |

### 既存画像の差し替え

同じファイル名・同じサイズのPNGで上書きするだけで反映されます。

### 新しいタイル / 敵タイプの追加

新しい種類のタイルや敵を追加する場合、以下のファイルを変更します。

1. **型定義** — `src/types/map.ts`（`TileType`）または `src/types/character.ts`（`EnemyType`）に値を追加
2. **アセットパス** — `src/ui/assetLoader.ts` の `TILE_ASSET_PATHS` / `ENEMY_ASSET_PATHS` にエントリを追加
3. **画像ファイル** — `public/assets/tiles/` または `public/assets/enemies/` にPNGを配置
4. **プレースホルダー生成** — `scripts/generate-placeholders.mjs` の `assets` 配列にエントリを追加
5. **敵タイプの場合** — `src/ui/mapRenderer.ts` の `ENEMY_PADDING` にパディング値を追加

### プレースホルダー画像の生成

開発用に単色のプレースホルダーPNG（64×64px）を一括生成できます。

```bash
node scripts/generate-placeholders.mjs
```

`public/assets/` 配下の全アセットが上書き生成されます。本番用の画像を配置済みの場合は実行に注意してください。
