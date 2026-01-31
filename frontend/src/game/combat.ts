/**
 * 戦闘システム（ダメージ・死亡処理）
 * @see docs/spec/mvp/rules.md
 */

import type { GameState } from "../types";
import {
	addActionLog,
	changeScreen,
	removeEnemy,
	updateEnemy,
	updatePlayer,
} from "./state";

/**
 * HP0以下で撃破判定
 */
export function isDefeated(hp: number): boolean {
	return hp <= 0;
}

/**
 * 敵にダメージを適用
 *
 * - 敵HPからダメージを減算
 * - HP0以下なら敵をマップから除去
 * - 行動ログを記録
 */
export function applyDamageToEnemy(
	state: GameState,
	enemyId: string,
	damage: number,
): GameState {
	let next = updateEnemy(state, enemyId, (e) => ({
		...e,
		hp: e.hp - damage,
	}));

	const target = next.enemies.find((e) => e.id === enemyId);
	if (target && isDefeated(target.hp)) {
		next = removeEnemy(next, enemyId);
		return addActionLog(next, "敵を倒した");
	}

	return addActionLog(next, "敵にダメージを与えた");
}

/**
 * プレイヤーにダメージを適用
 *
 * - プレイヤーHPからダメージを減算
 * - 行動ログを記録
 * - ゲームオーバー判定は別関数（checkGameOver）で行う
 */
export function applyDamageToPlayer(
	state: GameState,
	damage: number,
): GameState {
	let next = updatePlayer(state, (p) => ({
		...p,
		hp: p.hp - damage,
	}));

	next = addActionLog(next, "プレイヤーがダメージを受けた");

	return next;
}

/**
 * プレイヤー死亡判定とゲームオーバー遷移
 *
 * - HP0以下ならゲームオーバー画面に遷移
 * - HP1以上なら状態を変更せずそのまま返す
 */
export function checkGameOver(state: GameState): GameState {
	if (!isDefeated(state.player.hp)) {
		return state;
	}

	let next = changeScreen(state, "gameOver");
	next = addActionLog(next, "ゲームオーバー");

	return next;
}
