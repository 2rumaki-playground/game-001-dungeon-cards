/**
 * 方向
 * @see docs/spec/mvp/glossary.md - 座標系
 */
export type Direction = "up" | "down" | "left" | "right";

/**
 * 座標
 * スクリーン座標系（左上が原点、右下に向かって増加）
 */
export type Position = {
	x: number;
	y: number;
};

/**
 * 方向に対応する座標変化
 */
export const DIRECTION_DELTA: Record<Direction, Position> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};
