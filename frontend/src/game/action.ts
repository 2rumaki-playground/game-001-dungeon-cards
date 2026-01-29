/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import { CARD_COST, MAP_HEIGHT, MAP_WIDTH } from "../constants";
import type { Direction, GameState } from "../types";
import { DIRECTION_DELTA } from "../types";
import { playCard } from "./deck";
import { addActionLog, setDeck, updatePlayer } from "./state";

/**
 * 移動可否を判定
 */
function canMove(state: GameState, direction: Direction): boolean {
	const delta = DIRECTION_DELTA[direction];
	const nx = state.player.position.x + delta.x;
	const ny = state.player.position.y + delta.y;

	// マップ範囲外
	if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) {
		return false;
	}

	// 壁タイル
	if (state.map[ny][nx].type === "wall") {
		return false;
	}

	// 敵がいるマス
	if (state.enemies.some((e) => e.position.x === nx && e.position.y === ny)) {
		return false;
	}

	return true;
}

/**
 * 移動カード使用時のプレイヤー移動処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は位置更新、失敗時はログのみ。
 */
export function executeMove(
	state: GameState,
	cardId: string,
	direction: Direction,
): GameState {
	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.move,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 移動判定
	if (!canMove(state, direction)) {
		return addActionLog(next, "移動できなかった");
	}

	// 位置更新
	const delta = DIRECTION_DELTA[direction];
	const nx = state.player.position.x + delta.x;
	const ny = state.player.position.y + delta.y;

	next = updatePlayer(next, (p) => ({
		...p,
		position: { x: nx, y: ny },
	}));

	next = addActionLog(next, "移動した");

	// 階段判定
	if (state.map[ny][nx].type === "stairs") {
		// TODO: 階層遷移は #98 スコープ
		next = addActionLog(next, "階段に到達した");
	}

	return next;
}
