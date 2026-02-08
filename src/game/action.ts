/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import {
	CARD_COST,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
	RUSH_MAX_DISTANCE,
} from "../constants";
import type { Direction, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { applyDamageToEnemy } from "./combat";
import { playCard } from "./deck";
import { isInBounds } from "./map";
import { addActionLog, setDeck, updatePlayer } from "./state";
import { applyTileEffect, type SpecialTileType } from "./tileEffect";

/**
 * 移動可否を判定
 */
function canMove(state: GameState, direction: Direction): boolean {
	const delta = DIRECTION_DELTA[direction];
	const nx = state.player.position.x + delta.x;
	const ny = state.player.position.y + delta.y;

	// マップ範囲外
	if (!isInBounds(state.map, nx, ny)) {
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

/** 移動実行結果 */
export type MoveResult = {
	state: GameState;
	/** 階段に到達したか */
	reachedStairs: boolean;
	/** 発動した特殊タイル効果 */
	tileEffect: SpecialTileType | null;
	/** 特殊タイル効果によるゲームオーバー */
	gameOver: boolean;
};

/**
 * 移動カード使用時のプレイヤー移動処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は位置更新、失敗時はログのみ。
 * 階段到達時は階層遷移を行わず、フラグで通知する。
 */
export function executeMove(
	state: GameState,
	cardId: string,
	direction: Direction,
): MoveResult {
	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - CARD_COST.move,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 移動判定
	if (!canMove(state, direction)) {
		return {
			state: addActionLog(next, "移動できなかった"),
			reachedStairs: false,
			tileEffect: null,
			gameOver: false,
		};
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

	// 階段判定（遷移はUI層で行う）
	if (state.map[ny][nx].type === "stairs") {
		return {
			state: next,
			reachedStairs: true,
			tileEffect: null,
			gameOver: false,
		};
	}

	// 特殊タイル効果
	const effect = applyTileEffect(next);
	return {
		state: effect.state,
		reachedStairs: false,
		tileEffect: effect.triggeredTile,
		gameOver: effect.gameOver,
	};
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
	if (!isInBounds(state.map, nx, ny)) {
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
 * 攻撃処理の共通実装
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵にダメージ、HP0以下で敵を削除。
 */
function executeAttackBase(
	state: GameState,
	cardId: string,
	direction: Direction,
	apCost: number,
	damage: number,
	missLog: string,
): AttackResult {
	// AP消費
	let next = updatePlayer(state, (p) => ({
		...p,
		ap: p.ap - apCost,
	}));

	// カードを捨て札へ
	next = setDeck(next, playCard(next.deck, cardId));

	// 攻撃判定（AP消費・カード使用後の状態で判定）
	const result = canAttack(next, direction);
	if (!result.hit) {
		return { state: addActionLog(next, missLog), hit: false };
	}

	// 敵にダメージ（HP0以下で自動除去）
	next = applyDamageToEnemy(next, result.enemyId, damage);

	return { state: next, hit: true, enemyId: result.enemyId };
}

/**
 * 攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵にダメージを与え、HP0以下で敵を削除。
 * 戻り値の hit でヒット情報を返す。
 */
export function executeAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	return executeAttackBase(
		state,
		cardId,
		direction,
		CARD_COST.attack,
		PLAYER_ATTACK_DAMAGE,
		"攻撃できなかった",
	);
}

/**
 * 強攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 成功時は敵に大ダメージを与え、HP0以下で敵を削除。
 * 戻り値の hit でヒット情報を返す。
 */
export function executeStrongAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	return executeAttackBase(
		state,
		cardId,
		direction,
		CARD_COST.strong_attack,
		PLAYER_STRONG_ATTACK_DAMAGE,
		"強攻撃できなかった",
	);
}

/** 突進実行結果 */
export type RushResult = {
	state: GameState;
	/** 移動したマス数（0, 1, 2） */
	movedDistance: number;
	/** 階段に到達したか */
	reachedStairs: boolean;
	/** 階段到達前に移動した位置（アニメーション用） */
	intermediatePosition?: { x: number; y: number };
	/** 発動した特殊タイル効果の一覧（発動位置付き） */
	tileEffects: { tile: SpecialTileType; position: Position }[];
	/** 特殊タイル効果によるゲームオーバー */
	gameOver: boolean;
};

/**
 * 突進カード使用時のプレイヤー移動処理
 *
 * 成功/失敗に関わらずAP消費・カード使用を行う。
 * 最大2マスまで指定方向に移動を試みる。
 * - 1マス目で壁/マップ外/敵がある場合: 移動なし
 * - 1マス目で階段: 階段到達フラグを返す（階層遷移はUI層で実行）
 * - 2マス目で壁/敵がある場合: 1マス停止
 * - 2マス目で階段: 1マス移動後に階段到達フラグを返す
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

	let movedDistance = 0;
	let intermediatePosition: { x: number; y: number } | undefined;
	const tileEffects: { tile: SpecialTileType; position: Position }[] = [];

	for (let step = 0; step < RUSH_MAX_DISTANCE; step++) {
		if (!canMove(next, direction)) {
			break;
		}

		// 2マス目以降の移動前に中間位置を記録（アニメーション用）
		if (movedDistance > 0) {
			intermediatePosition = { ...next.player.position };
		}

		// 位置更新
		const nx = next.player.position.x + delta.x;
		const ny = next.player.position.y + delta.y;
		next = updatePlayer(next, (p) => ({
			...p,
			position: { x: nx, y: ny },
		}));
		movedDistance++;

		// 階段判定（遷移はUI層で行う）
		if (next.map[ny][nx].type === "stairs") {
			return {
				state: next,
				movedDistance,
				reachedStairs: true,
				intermediatePosition,
				tileEffects,
				gameOver: false,
			};
		}

		// 特殊タイル効果
		const effect = applyTileEffect(next);
		next = effect.state;
		if (effect.triggeredTile) {
			tileEffects.push({
				tile: effect.triggeredTile,
				position: { ...next.player.position },
			});
		}
		if (effect.gameOver) {
			return {
				state: next,
				movedDistance,
				reachedStairs: false,
				intermediatePosition,
				tileEffects,
				gameOver: true,
			};
		}
	}

	if (movedDistance === 0) {
		return {
			state: addActionLog(next, "突進できなかった"),
			movedDistance: 0,
			reachedStairs: false,
			tileEffects,
			gameOver: false,
		};
	}

	return {
		state: addActionLog(next, "突進した"),
		movedDistance,
		reachedStairs: false,
		tileEffects,
		gameOver: false,
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
