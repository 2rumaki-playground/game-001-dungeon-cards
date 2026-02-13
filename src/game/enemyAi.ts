/**
 * 敵AI
 * @see docs/spec/rules.md
 */

import { BOSS_SKILL, ENEMY_PARAMS, ENEMY_TYPE_LABEL } from "../constants";
import type { Direction, Enemy, GameState } from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	checkEnrage,
	decideBossSkill,
	decideMinibossSkill,
	executePendingSkill,
} from "./bossSkill";
import { applyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { getDebugCheats } from "./debugCheats";
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
): GameState {
	const showAi = import.meta.env.DEV && getDebugCheats().showEnemyAi;
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
				const msg = showAi
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
export function executeEnemyTurn(state: GameState): EnemyTurnResult {
	if (import.meta.env.DEV && getDebugCheats().skipEnemyTurn) {
		return { state, totalDamage: 0 };
	}

	// RNGをcloneして入力stateを変更しない
	let rng = state.rng.clone();
	const order = rng.shuffle(state.enemies.map((_e, i) => i));

	let next = { ...state, enemies: state.enemies.map((e) => ({ ...e })), rng };
	let totalDamage = 0;

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
			const skillResult = executePendingSkill(next, currentEnemy);
			next = skillResult.state;
			totalDamage += skillResult.damage;

			// ゲームオーバー判定
			next = checkGameOver(next);

			// スキルが実際に発動したターンのみ、通常行動をスキップする
			if (skillResult.executed) {
				continue;
			}
		}

		const enemyRoom = findRoomAt(currentEnemy.position, next.rooms);

		const showAi = import.meta.env.DEV && getDebugCheats().showEnemyAi;

		if (isAdjacent(currentEnemy.position, next.player.position)) {
			// 攻撃（激昂時はボーナスダメージ）— 部屋境界に関係なく発動
			const enrageBonus = currentEnemy.enraged
				? BOSS_SKILL.enrageBonusDamage
				: 0;
			const damage = params.attackDamage + enrageBonus;
			next = applyDamageToPlayer(next, damage);
			const attackMsg = showAi
				? `${ENEMY_TYPE_LABEL[currentEnemy.type]}が攻撃した（隣接, ATK:${damage}）`
				: "敵が攻撃した";
			next = addActionLog(next, attackMsg, "enemy");
			totalDamage += damage;
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
			next = moveEnemyByType(next, currentEnemy, params.moveDistance);
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

	return { state: next, totalDamage };
}
