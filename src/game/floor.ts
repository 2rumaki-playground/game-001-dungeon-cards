/**
 * 階層遷移処理
 * @see docs/spec/mvp/rules.md
 */

import type { GameState } from "../types";
import { saveGame } from "../utils/storage";
import { resetUsedCards } from "./deck";
import { createEmptyVisitedTiles, revealAtPosition } from "./fogOfWar";
import { generateMapPlacement } from "./map";
import { recordFloorReached } from "./playStats";
import {
	addActionLog,
	createEnemiesForFloor,
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
 * 7. 撃破カウント・報酬状態・残骸をリセット
 * 8. 行動ログに記録
 * 9. セーブ処理
 */
export function transitionFloor(state: GameState): GameState {
	// 1. 階層番号を +1
	let next = setFloor(state, state.floor + 1);
	recordFloorReached(next.floor);

	// 2. 新マップを生成
	const { map, rooms, player, enemies } = generateMapPlacement(
		next.rng,
		next.floor,
	);

	next = setMap(next, map);
	next = { ...next, rooms };

	// 3. プレイヤー位置を新マップの配置位置に更新（HPはそのまま維持）
	next = updatePlayer(next, (p) => ({
		...p,
		position: player,
	}));

	// 4. 敵を新マップの配置で初期化（階層に応じたタイプ構成）
	next = setEnemies(next, createEnemiesForFloor(enemies, next.floor));

	// 5. 使用済みカードIDリストをリセット
	next = setDeck(next, resetUsedCards(next.deck));

	// 6. プレイヤーターン開始処理（AP リセット + 使用済みリセット）
	next = startPlayerTurn(next);

	// 7. 撃破カウント・残骸・訪問済みタイル・交換状態をリセット
	next = {
		...next,
		rng: next.rng.clone(),
		defeatedEnemyCount: 0,
		cardExchangeState: null,
		remnants: {},
		visitedTiles: revealAtPosition(
			createEmptyVisitedTiles(),
			player,
			rooms,
			map,
		),
	};

	// 8. 行動ログに記録
	next = addActionLog(next, `${next.floor}階に到達した`, "system");

	// 9. セーブ処理 (#104)
	saveGame(next);

	return next;
}
