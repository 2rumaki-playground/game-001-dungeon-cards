/**
 * 位置関連ユーティリティ
 */

import type { Position } from "../types";

/**
 * 2点が4近傍で隣接しているか判定
 */
export function isAdjacent(a: Position, b: Position): boolean {
	return manhattanDistance(a, b) === 1;
}

/**
 * マンハッタン距離を計算
 */
export function manhattanDistance(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 座標をキー文字列に変換
 */
export function positionToKey(pos: Position): string {
	return `${pos.x},${pos.y}`;
}
