/**
 * 敵移動差分検出ユーティリティ
 * executeEnemyTurn の前後の enemies 配列を比較して移動した敵を検出
 */

import type { Enemy, Position } from "../types";

/** 敵の移動情報 */
export type EnemyMove = {
	id: string;
	from: Position;
	to: Position;
};

/**
 * 敵ターン前後の敵配列を比較し、位置が変わった敵の移動情報を返す
 * @param before 敵ターン実行前の敵配列
 * @param after 敵ターン実行後の敵配列
 * @returns 移動した敵の一覧（位置が変わらない敵、撃破された敵は含まない）
 */
export function detectEnemyMoves(before: Enemy[], after: Enemy[]): EnemyMove[] {
	const afterMap = new Map<string, Enemy>();
	for (const enemy of after) {
		afterMap.set(enemy.id, enemy);
	}

	const moves: EnemyMove[] = [];
	for (const enemy of before) {
		const afterEnemy = afterMap.get(enemy.id);
		if (!afterEnemy) continue; // 撃破された敵は無視

		if (
			enemy.position.x !== afterEnemy.position.x ||
			enemy.position.y !== afterEnemy.position.y
		) {
			moves.push({
				id: enemy.id,
				from: enemy.position,
				to: afterEnemy.position,
			});
		}
	}

	return moves;
}
