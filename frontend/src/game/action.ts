/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import {
	CARD_COST,
	MAP_HEIGHT,
	MAP_WIDTH,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
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

/** 攻撃実行結果 */
export type AttackResult = {
	state: GameState;
	hit: boolean;
	enemyId?: string;
};

/**
 * 攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵にダメージ、HP0以下で敵を削除。
 * 攻撃のヒット情報を含む結果を返す。
 */
export function executeAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
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
		return { state: addActionLog(next, "攻撃できなかった"), hit: false };
	}

	// 敵にダメージ（HP0以下で自動除去）
	next = applyDamageToEnemy(next, result.enemyId, PLAYER_ATTACK_DAMAGE);

	return { state: next, hit: true, enemyId: result.enemyId };
}

/**
 * 強攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵に大ダメージ、HP0以下で敵を削除。
 * 攻撃のヒット情報を含む結果を返す。
 */
export function executeStrongAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.strong_attack,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 攻撃判定
	const result = canAttack(state, direction);
	if (!result.hit) {
		return { state: addActionLog(next, "強攻撃できなかった"), hit: false };
	}

	// 敵にダメージ（HP0以下で自動除去）
	next = applyDamageToEnemy(next, result.enemyId, PLAYER_STRONG_ATTACK_DAMAGE);

	return { state: next, hit: true, enemyId: result.enemyId };
}

/** 突進実行結果 */
export type RushResult = {
	state: GameState;
	/** 移動したマス数（0, 1, 2） */
	movedDistance: number;
	/** 階段による階層遷移が発生したか */
	floorTransitioned: boolean;
	/** 階層遷移前に移動した位置（アニメーション用） */
	intermediatePosition?: { x: number; y: number };
};

/**
 * 突進カード使用時のプレイヤー移動処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 最大2マスまで指定方向に移動を試みる。
 * - 1マス目で壁/マップ外/敵がある場合: 移動なし
 * - 1マス目で階段: 階層遷移
 * - 2マス目で壁/敵がある場合: 1マス停止
 * - 2マス目で階段: 1マス移動後に階層遷移
 */
export function executeRush(
	state: GameState,
	cardId: string,
	direction: Direction,
): RushResult {
	const delta = DIRECTION_DELTA[direction];

	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.rush,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 1マス目移動判定
	if (!canMove(state, direction)) {
		return {
			state: addActionLog(next, "突進できなかった"),
			movedDistance: 0,
			floorTransitioned: false,
		};
	}

	// 1マス目位置更新
	const pos1x = state.player.position.x + delta.x;
	const pos1y = state.player.position.y + delta.y;
	next = updatePlayer(next, (p) => ({
		...p,
		position: { x: pos1x, y: pos1y },
	}));

	// 1マス目階段判定
	if (state.map[pos1y][pos1x].type === "stairs") {
		return {
			state: transitionFloor(next),
			movedDistance: 1,
			floorTransitioned: true,
		};
	}

	// 2マス目移動判定（位置更新済みのnextを使う）
	if (!canMove(next, direction)) {
		return {
			state: addActionLog(next, "突進した"),
			movedDistance: 1,
			floorTransitioned: false,
		};
	}

	// 2マス目位置更新
	const pos2x = pos1x + delta.x;
	const pos2y = pos1y + delta.y;
	next = updatePlayer(next, (p) => ({
		...p,
		position: { x: pos2x, y: pos2y },
	}));

	// 2マス目階段判定
	if (next.map[pos2y][pos2x].type === "stairs") {
		return {
			state: transitionFloor(next),
			movedDistance: 2,
			floorTransitioned: true,
			intermediatePosition: { x: pos1x, y: pos1y },
		};
	}

	return {
		state: addActionLog(next, "突進した"),
		movedDistance: 2,
		floorTransitioned: false,
	};
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
