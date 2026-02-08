/**
 * 敵AI
 * @see docs/spec/rules.md
 */

import { BOSS_SKILL, ENEMY_PARAMS } from "../constants";
import type { Direction, Enemy, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	checkEnrage,
	decideBossSkill,
	decideMinibossSkill,
	executePendingSkill,
} from "./bossSkill";
import { applyDamageToPlayer, checkGameOver, isDefeated } from "./combat";
import { isInBounds } from "./map";
import { addActionLog, setEnemies, updateEnemy } from "./state";

/**
 * 2点が4近傍で隣接しているか判定
 */
export function isAdjacent(a: Position, b: Position): boolean {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * マンハッタン距離を計算
 */
export function manhattanDistance(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** 優先順序: 上→下→左→右 */
const DIRECTION_PRIORITY: Direction[] = ["up", "down", "left", "right"];

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
function canEnemyMoveTo(
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
 *
 * 1. マンハッタン距離が最小になる方向を選択（障害物を考慮しない）
 * 2. 同距離の場合は固定順序（上→下→左→右）で優先
 * 3. 選択した方向が移動不可ならnullを返す（壁回避の経路探索は行わない）
 */
export function pickMoveDirection(
	state: GameState,
	enemy: Enemy,
): Direction | null {
	let bestDirection: Direction | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	// 障害物を無視して最善方向を決定
	for (const dir of DIRECTION_PRIORITY) {
		const delta = DIRECTION_DELTA[dir];
		const nx = enemy.position.x + delta.x;
		const ny = enemy.position.y + delta.y;

		const dist = manhattanDistance({ x: nx, y: ny }, state.player.position);
		if (dist < bestDistance) {
			bestDistance = dist;
			bestDirection = dir;
		}
	}

	if (!bestDirection) return null;

	// 移動可否を判定（移動不可なら留まる）
	const delta = DIRECTION_DELTA[bestDirection];
	const nx = enemy.position.x + delta.x;
	const ny = enemy.position.y + delta.y;
	if (!canEnemyMoveTo(state, enemy, nx, ny)) {
		return null;
	}

	return bestDirection;
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
	if (moveDistance === 0) {
		return addActionLog(state, "敵は動けなかった");
	}

	let next = state;
	for (let step = 0; step < moveDistance; step++) {
		const currentEnemy = next.enemies.find((e) => e.id === enemy.id);
		if (!currentEnemy) break;

		// 移動後に隣接している場合、残りの移動をスキップ
		if (step > 0 && isAdjacent(currentEnemy.position, next.player.position)) {
			break;
		}

		const dir = pickMoveDirection(next, currentEnemy);
		if (dir) {
			const delta = DIRECTION_DELTA[dir];
			const newEnemies = next.enemies.map((e) =>
				e.id === enemy.id
					? {
							...e,
							position: {
								x: e.position.x + delta.x,
								y: e.position.y + delta.y,
							},
						}
					: e,
			);
			next = setEnemies(next, newEnemies);
			if (step === 0) {
				next = addActionLog(next, "敵が移動した");
			}
		} else {
			if (step === 0) {
				next = addActionLog(next, "敵は動けなかった");
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
 *    - それ以外 → プレイヤーに近づく移動
 */
export function executeEnemyTurn(state: GameState): EnemyTurnResult {
	// RNGをcloneして入力stateを変更しない
	let rng = state.rng.clone();
	const order = rng.shuffle(state.enemies.map((_e, i) => i));

	let next = { ...state, enemies: state.enemies.map((e) => ({ ...e })), rng };
	let totalDamage = 0;

	for (const idx of order) {
		// 状態更新で差し替わったRNGを再束縛して系列を維持
		rng = next.rng;

		// プレイヤーが死亡していたら残りの敵は行動しない
		if (isDefeated(next.player.hp)) break;

		const enemy = next.enemies[idx];
		const params = ENEMY_PARAMS[enemy.type];

		// ボス激昂チェック
		if (enemy.type === "boss") {
			const enragedEnemy = checkEnrage(enemy);
			if (enragedEnemy.enraged && !enemy.enraged) {
				next = updateEnemy(next, enemy.id, () => enragedEnemy);
				next = addActionLog(next, "ボスが激昂した");
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
			continue;
		}

		if (isAdjacent(currentEnemy.position, next.player.position)) {
			// 攻撃（激昂時はボーナスダメージ）
			const enrageBonus = currentEnemy.enraged
				? BOSS_SKILL.enrageBonusDamage
				: 0;
			const damage = params.attackDamage + enrageBonus;
			next = applyDamageToPlayer(next, damage);
			next = addActionLog(next, "敵が攻撃した");
			totalDamage += damage;
		} else {
			// 移動
			next = moveEnemyByType(next, currentEnemy, params.moveDistance);
			rng = next.rng;

			// ボス/ミニボス: スキル予告判定（移動後の敵をインデックスで取得）
			const movedEnemy = next.enemies[idx];
			if (movedEnemy.type === "miniboss") {
				const updated = decideMinibossSkill(movedEnemy, rng);
				if (updated.pendingSkill) {
					next = updateEnemy(next, movedEnemy.id, () => updated);
					next = addActionLog(next, "ミニボスが力を溜めている…");
				}
			} else if (movedEnemy.type === "boss") {
				const updated = decideBossSkill(movedEnemy, rng);
				if (updated.pendingSkill) {
					next = updateEnemy(next, movedEnemy.id, () => updated);
					next = addActionLog(next, "ボスが大技を構えている…");
				}
			}
		}
	}

	// プレイヤー死亡判定
	next = checkGameOver(next);

	return { state: next, totalDamage };
}
