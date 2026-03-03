/**
 * 敵位置検索ユーティリティ
 */

import type { Enemy } from "../types";

/**
 * 指定座標にいる敵を返す
 */
export function findEnemyAt(
	enemies: readonly Enemy[],
	x: number,
	y: number,
): Enemy | undefined {
	return enemies.find((e) => e.position.x === x && e.position.y === y);
}

/**
 * 指定座標に敵がいるか判定する
 * @param excludeId 除外する敵ID（自分自身を除く判定に使用）
 */
export function hasEnemyAt(
	enemies: readonly Enemy[],
	x: number,
	y: number,
	excludeId?: string,
): boolean {
	return enemies.some(
		(e) =>
			e.position.x === x &&
			e.position.y === y &&
			(excludeId === undefined || e.id !== excludeId),
	);
}
