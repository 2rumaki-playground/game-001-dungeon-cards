/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import {
	CARD_COST,
	MAP_HEIGHT,
	MAP_WIDTH,
	PLAYER_ATTACK_DAMAGE,
} from "../constants";
import type { Direction, GameState } from "../types";
import { DIRECTION_DELTA } from "../types";
import { applyDamageToEnemy } from "./combat";
import { playCard } from "./deck";
import { transitionFloor } from "./floor";
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
		return transitionFloor(next);
	}

	return next;
}

/**
 * 攻撃成立を判定
 *
 * 成立条件:
 * - 指定方向1マス先がマップ内
 * - 指定方向1マス先が壁タイルではない
 * - 指定方向1マス先に敵が存在する
 */
function canAttack(
	state: GameState,
	direction: Direction,
): { hit: false } | { hit: true; enemyId: string } {
	const delta = DIRECTION_DELTA[direction];
	const nx = state.player.position.x + delta.x;
	const ny = state.player.position.y + delta.y;

	// マップ範囲外
	if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) {
		return { hit: false };
	}

	// 壁タイル
	if (state.map[ny][nx].type === "wall") {
		return { hit: false };
	}

	// 敵が存在するか
	const enemy = state.enemies.find(
		(e) => e.position.x === nx && e.position.y === ny,
	);
	if (!enemy) {
		return { hit: false };
	}

	return { hit: true, enemyId: enemy.id };
}

/**
 * 攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵にダメージ、HP0以下で敵を削除。
 */
export function executeAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): GameState {
	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.attack,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 攻撃判定
	const result = canAttack(state, direction);
	if (!result.hit) {
		return addActionLog(next, "攻撃できなかった");
	}

	// 敵にダメージ（HP0以下で自動除去）
	next = applyDamageToEnemy(next, result.enemyId, PLAYER_ATTACK_DAMAGE);

	return next;
}

/**
 * 待機カード使用時の処理
 *
 * APコスト0。カードを捨て札へ移動し、行動ログを記録する。
 */
export function executeWait(state: GameState, cardId: string): GameState {
	// AP消費（コスト0）
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.wait,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	return addActionLog(next, "待機した");
}
