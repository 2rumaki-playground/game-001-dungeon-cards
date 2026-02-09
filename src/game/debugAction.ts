/**
 * デバッグカード実行ロジック（DEV環境限定）
 * AP消費なし、手札消費なし
 */

import type { GameState, Position } from "../types";
import { applyDamageToEnemy } from "./combat";
import { isInBounds } from "./map";
import { addActionLog, updatePlayer } from "./state";
import { applyTileEffect } from "./tileEffect";

/**
 * 一撃カード: 指定した敵を即撃破
 *
 * - 敵のHP分のダメージを適用して即撃破
 * - AP消費なし、手札消費なし
 * - 存在しない敵IDの場合は無操作
 */
export function executeDebugOneshotKill(
	state: GameState,
	enemyId: string,
): GameState {
	const enemy = state.enemies.find((e) => e.id === enemyId);
	if (!enemy) {
		return state;
	}

	const next = applyDamageToEnemy(state, enemyId, enemy.hp);
	return addActionLog(next, "[DEBUG] 一撃で敵を倒した");
}

/**
 * テレポートカード: 指定位置に瞬間移動
 *
 * - プレイヤーの位置を直接更新
 * - 特殊タイル効果を適用
 * - AP消費なし、手札消費なし
 */
export function executeDebugTeleport(
	state: GameState,
	targetPos: Position,
): { state: GameState; reachedStairs: boolean; gameOver: boolean } {
	if (!isInBounds(state.map, targetPos.x, targetPos.y)) {
		return { state, reachedStairs: false, gameOver: false };
	}

	if (state.map[targetPos.y][targetPos.x].type === "wall") {
		return { state, reachedStairs: false, gameOver: false };
	}

	const hasEnemy = state.enemies.some(
		(e) => e.position.x === targetPos.x && e.position.y === targetPos.y,
	);
	if (hasEnemy) {
		return { state, reachedStairs: false, gameOver: false };
	}

	let next = updatePlayer(state, (p) => ({
		...p,
		position: { ...targetPos },
	}));

	next = addActionLog(next, "[DEBUG] テレポートした");

	// 階段判定
	if (next.map[targetPos.y][targetPos.x].type === "stairs") {
		return { state: next, reachedStairs: true, gameOver: false };
	}

	// 特殊タイル効果
	const effect = applyTileEffect(next);
	return {
		state: effect.state,
		reachedStairs: false,
		gameOver: effect.gameOver,
	};
}
