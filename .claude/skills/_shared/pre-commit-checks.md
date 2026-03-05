# コミット前チェック

各コミットの前に以下を**リポジトリルートから順に**実行し、問題があれば修正する:

1. `pnpm format` — フォーマット適用
2. `pnpm lint` — リントチェック
3. `pnpm build` — TypeScriptビルド確認（ビルドエラー時は vite skill を参照）
4. `pnpm test:run` — ユニットテスト全通過を確認（テスト失敗時は vitest skill を参照）
