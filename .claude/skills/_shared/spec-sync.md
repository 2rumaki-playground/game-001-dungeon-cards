# 仕様書同期の確認

コミット前に、変更内容が `docs/spec/` 配下の仕様ドキュメントに影響するかを確認する:

1. 変更ファイル一覧を取得する（コミット済み・未ステージ・ステージ済みの和集合）:
   - `git diff main...HEAD --name-only`
   - `git diff --name-only`
   - `git diff --cached --name-only`
2. 変更ファイルに以下が含まれる場合、対応する仕様ドキュメントの更新が必要か確認:
   - `constants.ts` → `docs/spec/constants.md` の更新が必要か確認
   - `src/` 配下のファイル → 関連する `docs/spec/` のドキュメントに影響がないか確認
3. 仕様ドキュメントの更新が必要な場合は、対応するドキュメントも更新してコミットに含める
4. 新しい仕様ドキュメントを追加した場合は `docs/spec/readme.md` の一覧も更新する
