/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import {
	JUMP_DISTANCE,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import type {
	ComboType,
	Direction,
	GameState,
	Position,
	SpecialTileType,
} from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	getLevelDamageBonus,
	hasKnockbackEffect,
	hasPierceEffect,
	hasRangeExtendEffect,
	hasShockwaveEffect,
} from "./cardLevel";
import { applyDamageToEnemy } from "./combat";
import { detectCombo, getComboBonus } from "./combo";
import { markCardUsed } from "./deck";
import { revealAtPosition } from "./fogOfWar";
import { isInBounds } from "./map";
import { recordCardUsage } from "./playStats";
import {
	applyKnockback,
	applyPierce,
	executeShockwave,
	findExtendedRangeTarget,
} from "./specialAttack";
import {
	addActionLog,
	setDeck,
	setVisitedTiles,
	updateComboHistory,
	updatePlayer,
} from "./state";
import { applyTileEffect, type TileEffectResult } from "./tileEffect";

/**
 * カードを使用済みにする共通ヘルパー
 */
export function markCardAsPlayed(state: GameState, cardId: string): GameState {
	return setDeck(state, markCardUsed(state.deck, cardId));
}

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
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は位置更新、失敗時はログのみ。
 * 階段到達時は階層遷移を行わず、フラグで通知する。
 */
export function executeMove(
	state: GameState,
	cardId: string,
	direction: Direction,
	options?: {
		applyTileEffectFn?: (state: GameState) => TileEffectResult;
	},
): MoveResult {
	// カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);
	recordCardUsage("move");

	// comboHistory更新
	next = updateComboHistory(next, {
		lastCardType: "move",
		lastDirection: direction,
	});

	// 移動判定
	if (!canMove(state, direction)) {
		return {
			state: addActionLog(next, "移動できなかった", "player"),
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

	// 訪問済みタイル更新
	next = setVisitedTiles(
		next,
		revealAtPosition(next.visitedTiles, { x: nx, y: ny }, next.rooms, next.map),
	);

	next = addActionLog(next, "移動した", "player");

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
	const tileEffectFn = options?.applyTileEffectFn ?? applyTileEffect;
	const effect = tileEffectFn(next);
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
	/** 超過ダメージ量（ミス時は0） */
	overkill: number;
	/** 発動したコンボ種別（未発動時はundefined） */
	comboType?: ComboType;
};

/**
 * 攻撃処理の共通実装
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は敵にダメージ、HP0以下で敵を削除。
 * コンボ判定は呼び出し元（executeAttack等）で行い、comboBonus引数で渡す。
 */
function executeAttackBase(
	state: GameState,
	cardId: string,
	direction: Direction,
	damage: number,
	missLog: string,
	comboBonus: number,
	comboLog: string | null,
): AttackResult {
	// カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);

	// コンボ発動ログ
	if (comboLog) {
		next = addActionLog(next, comboLog, "system");
	}

	// 攻撃判定（カード使用後の状態で判定）
	const result = canAttack(next, direction);
	if (!result.hit) {
		return {
			state: addActionLog(next, missLog, "player"),
			hit: false,
			overkill: 0,
		};
	}

	// 敵にダメージ（HP0以下で自動除去）
	const totalDamage = damage + comboBonus;
	const damageResult = applyDamageToEnemy(
		next,
		result.enemyId,
		totalDamage,
		cardId,
	);

	return {
		state: damageResult.state,
		hit: true,
		enemyId: result.enemyId,
		overkill: damageResult.overkill,
	};
}

/**
 * 手札からカードのレベルボーナスを算出する共通ヘルパー
 */
function getAttackDamageBonus(state: GameState, cardId: string): number {
	const card = state.deck.hand.find((c) => c.id === cardId);
	return card ? getLevelDamageBonus(card) : 0;
}

/**
 * コンボ種別に対応するログメッセージ
 */
const COMBO_LOG_MESSAGE: Record<string, string> = {
	charge: "突撃コンボ発動！",
	chain: "連撃コンボ発動！",
};

/**
 * 攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は敵にダメージを与え、HP0以下で敵を削除。
 * Lv3: 貫通（余剰ダメージが奥の敵に伝播）
 * Lv5: 射程延長（2マス先まで攻撃可能）+ 貫通
 * 戻り値の hit でヒット情報を返す。
 */
export function executeAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	recordCardUsage("attack");

	const card = state.deck.hand.find((c) => c.id === cardId);
	const levelBonus = getAttackDamageBonus(state, cardId);
	const pierce = card ? hasPierceEffect(card) : false;
	const rangeExtend = card ? hasRangeExtendEffect(card) : false;

	// コンボ判定（comboHistory更新前に判定）
	const combo = detectCombo(state.comboHistory, "attack", direction);
	const comboBonus = combo ? getComboBonus(combo) : 0;
	const comboLog = combo ? (COMBO_LOG_MESSAGE[combo] ?? null) : null;

	// Lv5射程延長: findAttackTargetで2マス先まで探索
	if (rangeExtend) {
		let next = markCardAsPlayed(state, cardId);

		if (comboLog) {
			next = addActionLog(next, comboLog, "system");
		}

		const target = findExtendedRangeTarget(next, direction);
		if (!target) {
			return {
				state: updateComboHistory(
					addActionLog(next, "攻撃できなかった", "player"),
					{ lastCardType: "attack", lastDirection: direction },
				),
				hit: false,
				overkill: 0,
				comboType: combo ?? undefined,
			};
		}

		const totalDamage = PLAYER_ATTACK_DAMAGE + levelBonus + comboBonus;
		const damageResult = applyDamageToEnemy(
			next,
			target.enemyId,
			totalDamage,
			cardId,
		);
		next = damageResult.state;

		// 貫通（Lv5はLv3効果も保持）
		if (damageResult.defeated && damageResult.overkill > 0) {
			next = applyPierce(
				next,
				direction,
				damageResult.overkill,
				target.position,
				cardId,
			);
		}

		return {
			state: updateComboHistory(next, {
				lastCardType: "attack",
				lastDirection: direction,
			}),
			hit: true,
			enemyId: target.enemyId,
			overkill: damageResult.overkill,
			comboType: combo ?? undefined,
		};
	}

	// 通常攻撃（Lv1-4）
	const result = executeAttackBase(
		state,
		cardId,
		direction,
		PLAYER_ATTACK_DAMAGE + levelBonus,
		"攻撃できなかった",
		comboBonus,
		comboLog,
	);

	let nextState = result.state;

	// Lv3貫通: 撃破時に余剰ダメージを奥の敵に伝播
	if (pierce && result.hit && result.overkill > 0) {
		const delta = DIRECTION_DELTA[direction];
		const hitPos = {
			x: state.player.position.x + delta.x,
			y: state.player.position.y + delta.y,
		};
		nextState = applyPierce(
			nextState,
			direction,
			result.overkill,
			hitPos,
			cardId,
		);
	}

	// comboHistory更新
	return {
		...result,
		comboType: combo ?? undefined,
		state: updateComboHistory(nextState, {
			lastCardType: "attack",
			lastDirection: direction,
		}),
	};
}

/**
 * 強攻撃カード使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は敵に大ダメージを与え、HP0以下で敵を削除。
 * Lv3: ノックバック（生存した敵を攻撃方向に1マス吹き飛ばす）
 * Lv5: 衝撃波（正面+左右3マスにダメージ + ノックバック）
 * 戻り値の hit でヒット情報を返す。
 * strong_attackはコンボ対象外（トリガーにも判定対象にもならない）。
 */
export function executeStrongAttack(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	recordCardUsage("strong_attack");

	const card = state.deck.hand.find((c) => c.id === cardId);
	const levelBonus = getAttackDamageBonus(state, cardId);
	const shockwave = card ? hasShockwaveEffect(card) : false;
	const knockback = card ? hasKnockbackEffect(card) : false;
	const totalDamage = PLAYER_STRONG_ATTACK_DAMAGE + levelBonus;

	// Lv5衝撃波
	if (shockwave) {
		let next = markCardAsPlayed(state, cardId);

		const shockResult = executeShockwave(next, direction, totalDamage, cardId);
		next = shockResult.state;

		if (!shockResult.hit) {
			next = addActionLog(next, "強攻撃できなかった", "player");
		}

		return {
			state: updateComboHistory(next, {
				lastCardType: "strong_attack",
				lastDirection: direction,
			}),
			hit: shockResult.hit,
			overkill: shockResult.overkill,
			enemyId: shockResult.enemyId ?? undefined,
		};
	}

	// 通常強攻撃（Lv1-4）
	const result = executeAttackBase(
		state,
		cardId,
		direction,
		totalDamage,
		"強攻撃できなかった",
		0,
		null,
	);

	let nextState = result.state;

	// Lv3ノックバック: ヒットして敵が生存していれば吹き飛ばす
	if (knockback && result.hit && result.enemyId && result.overkill === 0) {
		nextState = applyKnockback(nextState, result.enemyId, direction);
	}

	// comboHistory更新（コンボ対象外だが履歴には記録）
	return {
		...result,
		state: updateComboHistory(nextState, {
			lastCardType: "strong_attack",
			lastDirection: direction,
		}),
	};
}

/** ジャンプ実行結果 */
export type JumpResult = {
	state: GameState;
	/** ジャンプが成功したか */
	jumped: boolean;
	/** 階段に到達したか */
	reachedStairs: boolean;
	/** 発動した特殊タイル効果の一覧（発動位置・HP変化付き） */
	tileEffects: {
		tile: SpecialTileType;
		position: Position;
		hpBefore: number;
		hpAfter: number;
	}[];
	/** 特殊タイル効果によるゲームオーバー */
	gameOver: boolean;
};

/**
 * ジャンプカード使用時のプレイヤー移動処理
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 1マス先を飛び越えて2マス先に直接着地する。
 * - 着地先（2マス先）が壁/マップ外: 移動なし（カード使用して失敗）
 * - 着地先に敵がいる: 移動なし（カード使用して失敗）
 * - 着地先が階段: 着地して階段到達フラグを返す
 * - 着地先が特殊タイル: 着地先の効果のみ発動（飛び越えたマスは無視）
 */
export function executeJump(
	state: GameState,
	cardId: string,
	direction: Direction,
	options?: {
		applyTileEffectFn?: (state: GameState) => TileEffectResult;
	},
): JumpResult {
	const delta = DIRECTION_DELTA[direction];

	// カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);
	recordCardUsage("jump");

	// comboHistory更新
	next = updateComboHistory(next, {
		lastCardType: "jump",
		lastDirection: direction,
	});

	// 着地先（2マス先）の座標を計算
	const landX = next.player.position.x + delta.x * JUMP_DISTANCE;
	const landY = next.player.position.y + delta.y * JUMP_DISTANCE;

	// 着地先がマップ外
	if (!isInBounds(next.map, landX, landY)) {
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地先が壁
	if (next.map[landY][landX].type === "wall") {
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地先に敵がいる
	if (
		next.enemies.some((e) => e.position.x === landX && e.position.y === landY)
	) {
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地成功: プレイヤーを2マス先に移動
	next = updatePlayer(next, (p) => ({
		...p,
		position: { x: landX, y: landY },
	}));

	// 訪問済みタイル更新
	next = setVisitedTiles(
		next,
		revealAtPosition(
			next.visitedTiles,
			{ x: landX, y: landY },
			next.rooms,
			next.map,
		),
	);

	// 階段判定（遷移はUI層で行う）
	if (next.map[landY][landX].type === "stairs") {
		return {
			state: next,
			jumped: true,
			reachedStairs: true,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地先の特殊タイル効果
	const tileEffects: {
		tile: SpecialTileType;
		position: Position;
		hpBefore: number;
		hpAfter: number;
	}[] = [];
	const tileEffectFn = options?.applyTileEffectFn ?? applyTileEffect;
	const effect = tileEffectFn(next);
	next = effect.state;
	if (effect.triggeredTile) {
		tileEffects.push({
			tile: effect.triggeredTile,
			position: { x: landX, y: landY },
			hpBefore: effect.hpBefore,
			hpAfter: effect.hpAfter,
		});
	}
	if (effect.gameOver) {
		return {
			state: next,
			jumped: true,
			reachedStairs: false,
			tileEffects,
			gameOver: true,
		};
	}

	return {
		state: addActionLog(next, "ジャンプした", "player"),
		jumped: true,
		reachedStairs: false,
		tileEffects,
		gameOver: false,
	};
}

/**
 * 待機カード使用時の処理
 *
 * カードを使用済みへ移動し、行動ログを記録する。
 */
export function executeWait(state: GameState, cardId: string): GameState {
	// カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);
	recordCardUsage("wait");

	// comboHistory更新
	next = updateComboHistory(next, {
		lastCardType: "wait",
		lastDirection: null,
	});

	return addActionLog(next, "待機した", "player");
}
