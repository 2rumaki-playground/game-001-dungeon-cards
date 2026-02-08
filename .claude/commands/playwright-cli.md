# Playwright CLI — 対話的ブラウザ操作

## 概要

`playwright-cli` を使ってブラウザを対話的に操作し、UIのフロー確認やテスト設計を行う。

## 前提

- `playwright-cli` がグローバルインストール済みであること
- 開発サーバー (`pnpm dev`) が起動済み、または起動可能であること

## 使い方

以下の `playwright-cli` コマンドを Bash ツールで実行してブラウザを操作する。

### 主要コマンド

| コマンド | 説明 |
|----------|------|
| `playwright-cli open <url>` | ページを開く |
| `playwright-cli snapshot` | アクセシビリティツリーを取得（要素のref番号が分かる） |
| `playwright-cli click <ref>` | 要素をクリック |
| `playwright-cli fill <ref> <text>` | テキストを入力 |
| `playwright-cli screenshot` | スクリーンショットを取得 |

### 典型的なフロー

1. `playwright-cli open http://localhost:3000` でページを開く
2. `playwright-cli snapshot` でページ構造を確認
3. `playwright-cli click <ref>` や `playwright-cli fill <ref> <text>` で操作
4. 操作ごとに `playwright-cli snapshot` で状態を確認
5. 確認した操作手順をもとに `@playwright/test` のE2Eテストコードを `e2e/` に実装

## テストコード実装

フロー確認後、`e2e/` ディレクトリに `@playwright/test` でテストを実装する:

```typescript
import { test, expect } from "@playwright/test";

test("テスト名", async ({ page }) => {
  await page.goto("/");
  // snapshot で確認した要素を使ってテストを書く
});
```

## テスト実行

```bash
pnpm test:e2e          # ヘッドレス実行
pnpm test:e2e:ui       # UI モードで実行
```
