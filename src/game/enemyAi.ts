/**
 * 敵AI
 * @see docs/spec/rules.md
 */

import {
	BOSS_SKILL,
	ENEMY_PARAMS,
	ENEMY_TYPE_LABEL,
	RANGED_SHOOT_RANGE,
	SUMMONER_COOLDOWN,
} from "../constants";
import type { Direction, Enemy, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	checkEnrage,
	decideBossSkill,
	decideMinibossSkill,
	executePendingSkill,
} from "./bossSkill";
import { applyEnemyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { DIRECTION_LABEL } from "./enemyAiAnalysis";
import { isInBounds } from "./map";
import { bfsFirstStep } from "./pathfinding";
import { isAdjacent, manhattanDistance } from "./positionUtils";
import { findRoomAt, isInRoom } from "./roomUtils";
import { addActionLog, setEnemies, updateEnemy } from "./state";

/**
 * 敵の移動可否を判定
 *
 * 移動不可条件:
 * - マップ外
 * - 壁タイル
 * - 他の敵がいるマス
 * - プレイヤーがいるマス
 * - 階段タイル
 */
export function canEnemyMoveTo(
	state: GameState,
	enemy: Enemy,
	nx: number,
	ny: number,
): boolean {
	if (!isInBounds(state.map, nx, ny)) {
		return false;
	}

	const tile = state.map[ny][nx];
	if (tile.type === "wall" || tile.type === "stairs") {
		return false;
	}

	if (state.player.position.x === nx && state.player.position.y === ny) {
		return false;
	}

	if (
		state.enemies.some(
			(e) => e.id !== enemy.id && e.position.x === nx && e.position.y === ny,
		)
	) {
		return false;
	}

	return true;
}

/**
 * 敵の移動方向を決定
 * @see docs/spec/rules.md - 敵の移動（近づく）
 *
 * 1. BFSで最短経路の最初の一歩を取得（壁・階段を迂回）
 * 2. 同距離の場合は固定順序（上→下→左→右）で優先
 * 3. 動的障害物（他の敵・プレイヤー）で移動不可ならnullを返す
 */
export function pickMoveDirection(
	state: GameState,
	enemy: Enemy,
): Direction | null {
	const dir = bfsFirstStep(state.map, enemy.position, state.player.position);
	if (dir === null) return null;

	// 動的障害物チェック（他の敵・プレイヤー位置）
	const delta = DIRECTION_DELTA[dir];
	const nx = enemy.position.x + delta.x;
	const ny = enemy.position.y + delta.y;
	if (!canEnemyMoveTo(state, enemy, nx, ny)) {
		return null;
	}

	return dir;
}

/**
 * タイプ別の敵移動処理
 *
 * moveDistance=0: 移動しない（heavy）
 * moveDistance=1: 1マス移動（normal）
 * moveDistance=2: 2段階移動（scout）
 *   - 1マス目移動失敗 → 即終了
 *   - 1マス目移動後に隣接 → 2マス目スキップ
 *   - 2マス目移動失敗 → 1マス目の位置で停止
 */
function moveEnemyByType(
	state: GameState,
	enemy: Enemy,
	moveDistance: number,
	verbose = false,
): GameState {
	const label = ENEMY_TYPE_LABEL[enemy.type];

	if (moveDistance === 0) {
		return addActionLog(state, "敵は動けなかった", "enemy");
	}

	let next = state;
	for (let step = 0; step < moveDistance; step++) {
		const currentEnemy = next.enemies.find((e) => e.id === enemy.id);
		if (!currentEnemy) break;

		// 移動後に隣接している場合、残りの移動をスキップ
		if (step > 0 && isAdjacent(currentEnemy.position, next.player.position)) {
			break;
		}

		const distBefore = manhattanDistance(
			currentEnemy.position,
			next.player.position,
		);
		const dir = pickMoveDirection(next, currentEnemy);
		if (dir) {
			const delta = DIRECTION_DELTA[dir];
			const newPos = {
				x: currentEnemy.position.x + delta.x,
				y: currentEnemy.position.y + delta.y,
			};
			const distAfter = manhattanDistance(newPos, next.player.position);
			const newEnemies = next.enemies.map((e) =>
				e.id === enemy.id ? { ...e, position: newPos } : e,
			);
			next = setEnemies(next, newEnemies);
			if (step === 0) {
				const msg = verbose
					? `${label}が移動した（距離${distBefore}→${distAfter}, BFS:${DIRECTION_LABEL[dir]}）`
					: "敵が移動した";
				next = addActionLog(next, msg, "enemy");
			}
		} else {
			if (step === 0) {
				next = addActionLog(next, "敵は動けなかった", "enemy");
			}
			break;
		}
	}

	return next;
}

/**
 * 直線上の射線が通っているか判定
 *
 * 条件:
 * - 同じx座標（縦方向）または同じy座標（横方向）にいること
 * - 間に壁タイルがないこと
 */
export function hasLineOfSight(
	state: GameState,
	from: Position,
	to: Position,
): boolean {
	if (from.x === to.x) {
		const minY = Math.min(from.y, to.y);
		const maxY = Math.max(from.y, to.y);
		for (let y = minY + 1; y < maxY; y++) {
			if (state.map[y][from.x].type === "wall") {
				return false;
			}
		}
		return true;
	}
	if (from.y === to.y) {
		const minX = Math.min(from.x, to.x);
		const maxX = Math.max(from.x, to.x);
		for (let x = minX + 1; x < maxX; x++) {
			if (state.map[from.y][x].type === "wall") {
				return false;
			}
		}
		return true;
	}
	return false;
}

/**
 * プレイヤーとの位置関係から後退先を計算
 *
 * プレイヤーと反対方向に1マス移動する。
 * 移動先が壁・敵・マップ外・階段の場合はnullを返す。
 */
export function getRetreatPosition(
	state: GameState,
	enemy: Enemy,
): Position | null {
	const dx = enemy.position.x - state.player.position.x;
	const dy = enemy.position.y - state.player.position.y;

	// 反対方向を計算（符号で方向判定）
	let retreatX = enemy.position.x;
	let retreatY = enemy.position.y;

	if (Math.abs(dx) >= Math.abs(dy)) {
		retreatX += dx > 0 ? 1 : -1;
	} else {
		retreatY += dy > 0 ? 1 : -1;
	}

	if (!canEnemyMoveTo(state, enemy, retreatX, retreatY)) {
		return null;
	}

	return { x: retreatX, y: retreatY };
}

/** 8近傍の相対座標 */
const EIGHT_NEIGHBORS = [
	{ x: -1, y: -1 },
	{ x: 0, y: -1 },
	{ x: 1, y: -1 },
	{ x: -1, y: 0 },
	{ x: 1, y: 0 },
	{ x: -1, y: 1 },
	{ x: 0, y: 1 },
	{ x: 1, y: 1 },
];

/**
 * 8近傍の召喚可能マスを取得
 */
function getSummonablePositions(state: GameState, enemy: Enemy): Position[] {
	return EIGHT_NEIGHBORS.flatMap((delta) => {
		const nx = enemy.position.x + delta.x;
		const ny = enemy.position.y + delta.y;
		if (canEnemyMoveTo(state, enemy, nx, ny)) {
			return [{ x: nx, y: ny }];
		}
		return [];
	});
}

/**
 * 次の敵IDを生成（既存IDの最大番号+1）
 */
function getNextEnemyId(enemies: Enemy[]): string {
	let maxNum = 0;
	for (const e of enemies) {
		const match = e.id.match(/^enemy-(\d+)$/);
		if (match) {
			maxNum = Math.max(maxNum, Number(match[1]));
		}
	}
	return `enemy-${maxNum + 1}`;
}

/**
 * 召喚敵の行動を実行
 */
function executeSummonerEnemyAction(
	state: GameState,
	enemy: Enemy,
	rng: import("../utils/rng").RNG,
): GameState {
	const params = ENEMY_PARAMS[enemy.type];
	const distance = manhattanDistance(enemy.position, state.player.position);

	// 部屋内 & プレイヤー不在 → 待機
	const enemyRoom = findRoomAt(enemy.position, state.rooms);
	if (enemyRoom !== null && !isInRoom(state.player.position, enemyRoom)) {
		return state;
	}

	// 索敵範囲外 → 待機
	if (distance > params.senseRange) {
		return state;
	}

	// 隣接 → 後退（攻撃しない）
	if (isAdjacent(enemy.position, state.player.position)) {
		const retreatPos = getRetreatPosition(state, enemy);
		if (retreatPos) {
			const newEnemies = state.enemies.map((e) =>
				e.id === enemy.id ? { ...e, position: retreatPos } : e,
			);
			let next = setEnemies(state, newEnemies);
			next = addActionLog(next, "召喚敵が後退した", "enemy");
			return next;
		}
		// 後退不可 → 待機
		return state;
	}

	// 非隣接 + 召喚ターン（cooldown <= 0）
	if ((enemy.summonCooldown ?? SUMMONER_COOLDOWN) <= 0) {
		const positions = getSummonablePositions(state, enemy);
		if (positions.length > 0) {
			// ランダムに1マス選択
			const pos = positions[rng.randomInt(0, positions.length)];
			const normalParams = ENEMY_PARAMS.normal;
			const newEnemy: Enemy = {
				id: getNextEnemyId(state.enemies),
				type: "normal",
				position: pos,
				hp: normalParams.hp,
				maxHp: normalParams.hp,
			};
			const updatedEnemies = [
				...state.enemies.map((e) =>
					e.id === enemy.id ? { ...e, summonCooldown: SUMMONER_COOLDOWN } : e,
				),
				newEnemy,
			];
			let next = setEnemies(state, updatedEnemies);
			next = addActionLog(next, "召喚敵が通常敵を召喚した", "enemy");
			return next;
		}
		// 空きマスなし → 待機（cooldown消費しない）
		return state;
	}

	// 非召喚ターン → cooldown減算して待機
	const newEnemies = state.enemies.map((e) =>
		e.id === enemy.id
			? { ...e, summonCooldown: (e.summonCooldown ?? 0) - 1 }
			: e,
	);
	return setEnemies(state, newEnemies);
}

/**
 * 射撃敵の行動を実行
 *
 * | 状況 | 行動 |
 * |------|------|
 * | 非隣接 + 直線上射程内（壁遮蔽なし） | 射撃 |
 * | 非隣接 + 射程外 or 直線外 or 壁遮蔽 | 待機 |
 * | 隣接 + 後退可能 | 後退のみ（射撃しない） |
 * | 隣接 + 後退不可 | その場で射撃 |
 */
function executeRangedEnemyAction(
	state: GameState,
	enemy: Enemy,
	applyDmg: typeof applyEnemyDamageToPlayer,
	verbose: boolean,
): GameState {
	const params = ENEMY_PARAMS[enemy.type];
	const label = ENEMY_TYPE_LABEL[enemy.type];
	let next = state;

	if (isAdjacent(enemy.position, next.player.position)) {
		// 隣接: 後退を試みる
		const retreatPos = getRetreatPosition(next, enemy);
		if (retreatPos) {
			// 後退のみ（射撃しない）
			const newEnemies = next.enemies.map((e) =>
				e.id === enemy.id ? { ...e, position: retreatPos } : e,
			);
			next = setEnemies(next, newEnemies);
			const msg = verbose ? `${label}が後退した` : "敵が後退した";
			next = addActionLog(next, msg, "enemy");
		} else {
			// 後退不可 → その場で射撃
			next = applyDmg(next, params.attackDamage, enemy.type);
			const msg = verbose
				? `${label}が射撃した（隣接, 後退不可, ATK:${params.attackDamage}）`
				: "敵が射撃した";
			next = addActionLog(next, msg, "enemy");
		}
	} else {
		// 非隣接: 射線チェック
		const distance = manhattanDistance(enemy.position, next.player.position);
		if (
			distance <= RANGED_SHOOT_RANGE &&
			hasLineOfSight(next, enemy.position, next.player.position)
		) {
			// 射撃
			next = applyDmg(next, params.attackDamage, enemy.type);
			const msg = verbose
				? `${label}が射撃した（距離${distance}, ATK:${params.attackDamage}）`
				: "敵が射撃した";
			next = addActionLog(next, msg, "enemy");
		}
		// 射程外 or 射線なし → 待機（何もしない）
	}

	return next;
}

/** 敵ターン実行結果 */
export type EnemyTurnResult = {
	state: GameState;
	totalDamage: number;
};

/**
 * 敵ターン全体の実行
 *
 * 1. 行動順序をRNGでシャッフル
 * 2. 各敵について:
 *    - プレイヤーに隣接 → 攻撃
 *    - 索敵範囲内 → プレイヤーに近づく移動
 *    - 索敵範囲外 → 待機（何もしない）
 */
export function executeEnemyTurn(
	state: GameState,
	options?: {
		verbose?: boolean;
		applyPlayerDamage?: typeof applyEnemyDamageToPlayer;
	},
): EnemyTurnResult {
	const verbose = options?.verbose ?? false;
	const applyDmg = options?.applyPlayerDamage ?? applyEnemyDamageToPlayer;

	// RNGをcloneして入力stateを変更しない
	let rng = state.rng.clone();
	const order = rng.shuffle(state.enemies.map((_e, i) => i));

	// 盾持ち敵の盾をリセット（毎敵ターン開始時）
	const resetEnemies = state.enemies.map((e) =>
		e.type === "shielded" ? { ...e, shieldActive: true } : { ...e },
	);

	let next = { ...state, enemies: resetEnemies, rng };

	for (const idx of order) {
		// プレイヤーが死亡していたら残りの敵は行動しない
		if (isDefeated(next.player.hp)) break;

		const enemy = next.enemies[idx];
		const params = ENEMY_PARAMS[enemy.type];

		// ボス激昂チェック
		if (enemy.type === "boss") {
			const enragedEnemy = checkEnrage(enemy);
			if (enragedEnemy.enraged && !enemy.enraged) {
				next = updateEnemy(next, enemy.id, () => enragedEnemy);
				next = addActionLog(next, "ボスが激昂した", "enemy");
			}
		}

		// 激昂後の敵状態を再取得（enrageBonus等に反映するため）
		const currentEnemy = next.enemies[idx];

		// 予告済みスキルの発動
		if (currentEnemy.pendingSkill) {
			const skillResult = executePendingSkill(next, currentEnemy, applyDmg);
			next = skillResult.state;

			// ゲームオーバー判定
			next = checkGameOver(next);

			// スキルが実際に発動したターンのみ、通常行動をスキップする
			if (skillResult.executed) {
				continue;
			}
		}

		// 召喚敵の行動
		if (currentEnemy.type === "summoner") {
			next = executeSummonerEnemyAction(next, currentEnemy, next.rng);
			rng = next.rng;
			continue;
		}

		// 射撃敵は専用ロジックで処理
		if (currentEnemy.type === "ranged") {
			// 隣接時は部屋境界に関係なく行動（後退/射撃）
			if (isAdjacent(currentEnemy.position, next.player.position)) {
				next = executeRangedEnemyAction(next, currentEnemy, applyDmg, verbose);
			} else {
				const enemyRoom = findRoomAt(currentEnemy.position, next.rooms);
				if (enemyRoom !== null && !isInRoom(next.player.position, enemyRoom)) {
					// 部屋内の敵 && プレイヤーが同じ部屋にいない → 待機
				} else if (
					manhattanDistance(currentEnemy.position, next.player.position) <=
					params.senseRange
				) {
					next = executeRangedEnemyAction(
						next,
						currentEnemy,
						applyDmg,
						verbose,
					);
				}
			}
			continue;
		}

		const enemyRoom = findRoomAt(currentEnemy.position, next.rooms);

		if (isAdjacent(currentEnemy.position, next.player.position)) {
			// 攻撃（激昂時はボーナスダメージ）— 部屋境界に関係なく発動
			const enrageBonus = currentEnemy.enraged
				? BOSS_SKILL.enrageBonusDamage
				: 0;
			const damage = params.attackDamage + enrageBonus;
			next = applyDmg(next, damage, currentEnemy.type);
			const attackMsg = verbose
				? `${ENEMY_TYPE_LABEL[currentEnemy.type]}が攻撃した（隣接, ATK:${damage}）`
				: "敵が攻撃した";
			next = addActionLog(next, attackMsg, "enemy");
		} else if (
			enemyRoom !== null &&
			!isInRoom(next.player.position, enemyRoom)
		) {
			// 部屋内の敵 && プレイヤーが同じ部屋にいない → 待機
		} else if (
			manhattanDistance(currentEnemy.position, next.player.position) <=
			params.senseRange
		) {
			// 索敵範囲内 → 追従
			next = moveEnemyByType(next, currentEnemy, params.moveDistance, verbose);
			rng = next.rng;

			// ボス/ミニボス: スキル予告判定（移動後の敵をインデックスで取得）
			const movedEnemy = next.enemies[idx];
			if (movedEnemy.type === "miniboss") {
				const updated = decideMinibossSkill(movedEnemy, rng);
				if (updated.pendingSkill) {
					next = updateEnemy(next, movedEnemy.id, () => updated);
					next = addActionLog(next, "ミニボスが力を溜めている…", "enemy");
				}
			} else if (movedEnemy.type === "boss") {
				const updated = decideBossSkill(movedEnemy, rng);
				if (updated.pendingSkill) {
					next = updateEnemy(next, movedEnemy.id, () => updated);
					next = addActionLog(next, "ボスが大技を構えている…", "enemy");
				}
			}
		}
	}

	// プレイヤー死亡判定
	next = checkGameOver(next);

	return {
		state: next,
		totalDamage: Math.max(0, state.player.hp - next.player.hp),
	};
}
