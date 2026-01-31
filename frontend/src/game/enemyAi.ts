/**
 * 敵AI
 * @see docs/spec/mvp/rules.md
 */

import { ENEMY_ATTACK_DAMAGE, MAP_HEIGHT, MAP_WIDTH } from "../constants";
import type { Direction, Enemy, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { applyDamageToPlayer, checkGameOver } from "./combat";
import { addActionLog, setEnemies } from "./state";

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
	if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) {
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
 * 敵ターン全体の実行
 *
 * 1. 行動順序をRNGでシャッフル
 * 2. 各敵について:
 *    - プレイヤーに隣接 → 攻撃
 *    - それ以外 → プレイヤーに近づく移動
 */
export function executeEnemyTurn(state: GameState): GameState {
	// RNGをcloneして入力stateを変更しない
	const rng = state.rng.clone();
	const order = rng.shuffle(state.enemies.map((_e, i) => i));

	let next = { ...state, enemies: state.enemies.map((e) => ({ ...e })), rng };

	for (const idx of order) {
		const enemy = next.enemies[idx];

		if (isAdjacent(enemy.position, next.player.position)) {
			// 攻撃
			next = applyDamageToPlayer(next, ENEMY_ATTACK_DAMAGE);
			next = addActionLog(next, "敵が攻撃した");
		} else {
			// 移動
			const dir = pickMoveDirection(next, enemy);
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
				next = addActionLog(next, "敵が移動した");
			} else {
				next = addActionLog(next, "敵は動けなかった");
			}
		}
	}

	// プレイヤー死亡判定
	next = checkGameOver(next);

	return next;
}
