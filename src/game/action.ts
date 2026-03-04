/**
 * プレイヤー行動処理
 * @see docs/spec/mvp/rules.md
 */

import {
	BODY_SLAM_DAMAGE,
	BODY_SLAM_RECOIL,
	FIRE_EXTENDED_RANGE,
	JUMP_DISTANCE,
	PLAYER_FIRE_DAMAGE,
	PLAYER_THUNDER_DAMAGE,
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
import { incrementUseCount } from "./cardStats";
import {
	applyDamageToEnemy,
	applyDamageToPlayer,
	checkGameOver,
} from "./combat";
import { detectCombo, getComboBonus } from "./combo";
import { markCardUsed } from "./deck";
import { findEnemyAt, hasEnemyAt } from "./enemyUtils";
import { revealAtPosition } from "./fogOfWar";
import { isInBounds, isWallTile } from "./map";
import { recordCardUsage } from "./playStats";
import {
	applyKnockback,
	applyPierce,
	executeShockwave,
	findAttackTarget,
} from "./specialAttack";
import { addSpeechLog } from "./speech";
import {
	addActionLog,
	setDeck,
	setTile,
	setVisitedTiles,
	updateComboHistory,
	updatePlayer,
} from "./state";
import { applyTileEffect, type TileEffectResult } from "./tileEffect";

/**
 * カードを使用済みにする共通ヘルパー
 */
export function markCardAsPlayed(state: GameState, cardId: string): GameState {
	// 既に使用済みのカードであれば何もしない（冪等性の確保）
	if (state.deck.usedCardIds.includes(cardId)) {
		return state;
	}
	let next = setDeck(state, markCardUsed(state.deck, cardId));
	next = incrementUseCount(next, cardId);
	return next;
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

	// 壁タイル・ひび割れ壁タイル
	if (isWallTile(state.map[ny][nx])) {
		return false;
	}

	// 敵がいるマス
	if (hasEnemyAt(state.enemies, nx, ny)) {
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
	/** ゲームオーバー */
	gameOver: boolean;
	/** 体当たりが発生したか */
	bodySlam: boolean;
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

	// 移動判定
	if (!canMove(state, direction)) {
		// 移動失敗: 方向をnullで記録（突撃コンボの成立条件を満たさない）
		next = updateComboHistory(next, {
			lastCardType: "move",
			lastDirection: null,
		});

		// 体当たり判定: 移動先が範囲内・壁でない・敵がいる場合
		const delta = DIRECTION_DELTA[direction];
		const nx = state.player.position.x + delta.x;
		const ny = state.player.position.y + delta.y;
		if (isInBounds(state.map, nx, ny) && !isWallTile(state.map[ny][nx])) {
			const enemy = findEnemyAt(next.enemies, nx, ny);
			if (enemy) {
				// 敵ダメージ（attackCardIdなし: XP付与なし）
				next = applyDamageToEnemy(next, enemy.id, BODY_SLAM_DAMAGE).state;
				// 自傷ダメージ
				next = applyDamageToPlayer(next, BODY_SLAM_RECOIL);
				next = addActionLog(next, "体当たりした", "player");
				next = addSpeechLog(next, "body_slam");
				// ゲームオーバー判定
				next = checkGameOver(next);
				return {
					state: next,
					reachedStairs: false,
					tileEffect: null,
					gameOver: next.screen === "gameOver",
					bodySlam: true,
				};
			}
		}

		next = addActionLog(next, "移動できなかった", "player");
		next = addSpeechLog(next, "move_fail");
		return {
			state: next,
			reachedStairs: false,
			tileEffect: null,
			gameOver: false,
			bodySlam: false,
		};
	}

	// 移動成功: comboHistory更新（方向を記録）
	next = updateComboHistory(next, {
		lastCardType: "move",
		lastDirection: direction,
	});

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
	next = addSpeechLog(next, "move_success");

	// 階段判定（遷移はUI層で行う）
	if (state.map[ny][nx].type === "stairs") {
		return {
			state: next,
			reachedStairs: true,
			tileEffect: null,
			gameOver: false,
			bodySlam: false,
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
		bodySlam: false,
	};
}

/** 攻撃実行結果 */
export type AttackResult = {
	state: GameState;
	hit: boolean;
	enemyId?: string;
	/** 敵が撃破されたか（ミス・攻撃判定なし時はfalse） */
	defeated: boolean;
	/** 発動したコンボ種別（未発動時はundefined） */
	comboType?: ComboType;
	/** カードレベルによるダメージボーナス */
	levelBonus: number;
};

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
const COMBO_LOG_MESSAGE: Record<ComboType, string> = {
	chain: "連撃コンボ発動！",
	ambush: "奇襲コンボ発動！",
};

/**
 * 方向1マス先のひび割れ壁を破壊する共通処理
 */
function tryCrackedWallDestroy(
	state: GameState,
	direction: Direction,
): { state: GameState; destroyed: boolean } {
	const delta = DIRECTION_DELTA[direction];
	const wx = state.player.position.x + delta.x;
	const wy = state.player.position.y + delta.y;
	if (
		isInBounds(state.map, wx, wy) &&
		state.map[wy][wx].type === "cracked_wall"
	) {
		let next = setTile(state, wx, wy, { type: "floor" });
		next = addActionLog(next, "ひび割れ壁を破壊した", "player");
		return { state: next, destroyed: true };
	}
	return { state, destroyed: false };
}

/**
 * コンボ判定 + ボーナス算出 + ログ出力を一括化
 */
function detectAndApplyCombo(
	state: GameState,
	direction: Direction,
): { state: GameState; combo: ComboType | null; comboBonus: number } {
	const combo = detectCombo(state.comboHistory, "fire", direction);
	if (!combo) {
		return { state, combo: null, comboBonus: 0 };
	}
	const comboBonus = getComboBonus(combo);
	let next = addActionLog(state, COMBO_LOG_MESSAGE[combo], "system");
	next = addSpeechLog(next, "combo_activated");
	return { state: next, combo, comboBonus };
}

/**
 * ファイアボルト使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は敵にダメージを与え、HP0以下で敵を削除。
 * Lv3: 貫通（余剰ダメージが奥の敵に伝播）
 * Lv5: 射程延長（2マス先まで攻撃可能）+ 貫通
 * 戻り値の hit でヒット情報を返す。
 */
export function executeFire(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	recordCardUsage("fire");

	const card = state.deck.hand.find((c) => c.id === cardId);
	const levelBonus = getAttackDamageBonus(state, cardId);
	const pierce = card ? hasPierceEffect(card) : false;
	const range = card && hasRangeExtendEffect(card) ? FIRE_EXTENDED_RANGE : 1;

	// 1. カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);

	// 2. コンボ判定 + ログ
	const {
		state: comboState,
		combo,
		comboBonus,
	} = detectAndApplyCombo(next, direction);
	next = comboState;

	// 3. ターゲット探索
	const target = findAttackTarget(next, direction, range);

	if (!target) {
		next = addActionLog(next, "ファイアボルトが外れた", "player");
		next = addSpeechLog(next, "attack_miss");
		return {
			state: updateComboHistory(next, {
				lastCardType: "fire",
				lastDirection: direction,
			}),
			hit: false,
			defeated: false,
			comboType: combo ?? undefined,
			levelBonus,
		};
	}

	// 4. ダメージ適用
	const totalDamage = PLAYER_FIRE_DAMAGE + levelBonus + comboBonus;
	const damageResult = applyDamageToEnemy(
		next,
		target.enemyId,
		totalDamage,
		cardId,
	);
	next = damageResult.state;

	// 5. 貫通（Lv3+撃破時: 元の攻撃ダメージ全量を固定値として適用）
	if (pierce && damageResult.defeated) {
		next = applyPierce(next, direction, totalDamage, target.position, cardId);
	}

	// 6. comboHistory更新 + return
	return {
		state: updateComboHistory(next, {
			lastCardType: "fire",
			lastDirection: direction,
		}),
		hit: true,
		enemyId: target.enemyId,
		defeated: damageResult.defeated,
		comboType: combo ?? undefined,
		levelBonus,
	};
}

/**
 * サンダー使用時のプレイヤー攻撃処理
 *
 * 成功/失敗に関わらずカード使用を行う。
 * 成功時は敵に大ダメージを与え、HP0以下で敵を削除。
 * Lv3: ノックバック（生存した敵を攻撃方向に1マス吹き飛ばす）
 * Lv5: 衝撃波（正面+左右3マスにダメージ + ノックバック）
 * 戻り値の hit でヒット情報を返す。
 * thunderはコンボ対象外（トリガーにも判定対象にもならない）。
 */
export function executeThunder(
	state: GameState,
	cardId: string,
	direction: Direction,
): AttackResult {
	recordCardUsage("thunder");

	const card = state.deck.hand.find((c) => c.id === cardId);
	const levelBonus = getAttackDamageBonus(state, cardId);
	const shockwave = card ? hasShockwaveEffect(card) : false;
	const knockback = card ? hasKnockbackEffect(card) : false;
	const totalDamage = PLAYER_THUNDER_DAMAGE + levelBonus;

	// Lv5衝撃波
	if (shockwave) {
		let next = markCardAsPlayed(state, cardId);

		const shockResult = executeShockwave(next, direction, totalDamage, cardId);
		next = shockResult.state;

		if (!shockResult.hit) {
			if (shockResult.crackedWallDestroyed) {
				next = addActionLog(next, "ひび割れ壁を破壊した", "player");
			} else {
				next = addActionLog(next, "サンダーが外れた", "player");
				next = addSpeechLog(next, "attack_miss");
			}
		}

		return {
			state: updateComboHistory(next, {
				lastCardType: "thunder",
				lastDirection: direction,
			}),
			hit: shockResult.hit,
			defeated: shockResult.defeated,
			enemyId: shockResult.enemyId ?? undefined,
			levelBonus,
		};
	}

	// カードを使用済みへ
	let next = markCardAsPlayed(state, cardId);

	// ひび割れ壁破壊
	const cracked = tryCrackedWallDestroy(next, direction);
	if (cracked.destroyed) {
		return {
			state: updateComboHistory(cracked.state, {
				lastCardType: "thunder",
				lastDirection: direction,
			}),
			hit: false,
			defeated: false,
			levelBonus,
		};
	}

	// ターゲット探索
	const target = findAttackTarget(next, direction, 1);
	if (!target) {
		next = addActionLog(next, "サンダーが外れた", "player");
		next = addSpeechLog(next, "attack_miss");
		return {
			state: updateComboHistory(next, {
				lastCardType: "thunder",
				lastDirection: direction,
			}),
			hit: false,
			defeated: false,
			levelBonus,
		};
	}

	// ダメージ適用
	const damageResult = applyDamageToEnemy(
		next,
		target.enemyId,
		totalDamage,
		cardId,
	);
	next = damageResult.state;

	// Lv3ノックバック: ヒットして敵が生存していれば吹き飛ばす
	if (knockback && !damageResult.defeated) {
		next = applyKnockback(next, target.enemyId, direction);
	}

	// comboHistory更新（コンボ対象外だが履歴には記録）
	return {
		state: updateComboHistory(next, {
			lastCardType: "thunder",
			lastDirection: direction,
		}),
		hit: true,
		enemyId: target.enemyId,
		defeated: damageResult.defeated,
		levelBonus,
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

	// 着地先（2マス先）の座標を計算
	const landX = next.player.position.x + delta.x * JUMP_DISTANCE;
	const landY = next.player.position.y + delta.y * JUMP_DISTANCE;

	// 着地先がマップ外
	if (!isInBounds(next.map, landX, landY)) {
		next = updateComboHistory(next, {
			lastCardType: "jump",
			lastDirection: null,
		});
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地先が壁・ひび割れ壁
	if (isWallTile(next.map[landY][landX])) {
		next = updateComboHistory(next, {
			lastCardType: "jump",
			lastDirection: null,
		});
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地先に敵がいる
	if (hasEnemyAt(next.enemies, landX, landY)) {
		next = updateComboHistory(next, {
			lastCardType: "jump",
			lastDirection: null,
		});
		return {
			state: addActionLog(next, "ジャンプできなかった", "player"),
			jumped: false,
			reachedStairs: false,
			tileEffects: [],
			gameOver: false,
		};
	}

	// 着地成功: comboHistory更新（方向を記録）
	next = updateComboHistory(next, {
		lastCardType: "jump",
		lastDirection: direction,
	});

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

	next = addActionLog(next, "ジャンプした", "player");
	next = addSpeechLog(next, "jump_success");
	return {
		state: next,
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
