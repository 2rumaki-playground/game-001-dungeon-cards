/**
 * 階層遷移処理
 * @see docs/spec/mvp/rules.md
 */

import type { GameState } from "../types";
import { saveGame } from "../utils/storage";
import { reshuffleDeck } from "./deck";
import { generateMapPlacement } from "./map";
import {
	addActionLog,
	createEnemiesFromPositions,
	setDeck,
	setEnemies,
	setFloor,
	setMap,
	updatePlayer,
} from "./state";
import { startPlayerTurn } from "./turn";

/**
 * 階層遷移処理
 *
 * プレイヤーが階段に到達した時に次の階層へ遷移する。
 * 1. 階層番号を +1
 * 2. 新マップを生成
 * 3. プレイヤー位置を新マップの配置位置に更新（HPはそのまま維持）
 * 4. 敵を新マップの配置で初期化
 * 5. デッキをリセット・シャッフル
 * 6. プレイヤーターン開始処理（AP リセット + 手札補充）
 * 7. 行動ログに記録
 */
export function transitionFloor(state: GameState): GameState {
	// 1. 階層番号を +1
	let next = setFloor(state, state.floor + 1);

	// 2. 新マップを生成
	const { map, player, enemies } = generateMapPlacement(next.rng);

	next = setMap(next, map);

	// 3. プレイヤー位置を新マップの配置位置に更新（HPはそのまま維持）
	next = updatePlayer(next, (p) => ({
		...p,
		position: player,
	}));

	// 4. 敵を新マップの配置で初期化
	next = setEnemies(next, createEnemiesFromPositions(enemies));

	// 5. デッキをリセット・シャッフル
	next = setDeck(next, reshuffleDeck(next.deck, next.rng));

	// 6. プレイヤーターン開始処理（AP リセット + 手札補充）
	next = startPlayerTurn(next);

	// 7. 行動ログに記録
	next = addActionLog(next, `${next.floor}階に到達した`);

	// 8. セーブ処理 (#104)
	saveGame(next);

	return next;
}
