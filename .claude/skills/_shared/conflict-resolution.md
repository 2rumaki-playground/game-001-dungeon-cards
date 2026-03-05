# コンフリクト確認・解消

## コンフリクトの確認

```
gh pr view <番号> --json mergeable,baseRefName -q '{mergeable, baseRefName}'
```

- `CONFLICTING`: コンフリクトあり
- `MERGEABLE`: コンフリクトなし
- `UNKNOWN`: GitHub側で計算未完了。数秒待って再実行。複数回 `UNKNOWN` のままならブラウザで確認

`baseRefName` はコンフリクト解消時のマージ対象ブランチとして使用する。

## コンフリクトの解消

PRブランチをチェックアウト済みの状態で:

```bash
git fetch origin <baseRefName>
git merge origin/<baseRefName>
```

コンフリクトファイルを確認・解決後:

```bash
git add <解決したファイル>
git commit -m "chore: <baseRefName>ブランチをマージしコンフリクト解決"
git push -u origin <ブランチ名>
```

**注意**:
- コンフリクト解消はレビューコメント対応の**前に**行う
- 解消後に `pnpm install` → `pnpm build` → `pnpm test:run` で動作確認すること
