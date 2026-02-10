/**
 * BFS経路探索
 * @see docs/spec/rules.md - 移動方向の決定（BFS経路探索）
 */

import type { Direction, GameMap, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { isInBounds } from "./map";
import { positionToKey } from "./positionUtils";

/** 優先順序: 上→下→左→右 */
export const DIRECTION_PRIORITY: Direction[] = ["up", "down", "left", "right"];

/**
 * BFSでゴールへの最短経路の最初の一歩（方向）を返す
 *
 * - 静的障害物のみ考慮（壁・階段）
 * - 他の敵・プレイヤーは動的なのでBFSでは無視
 * - 同距離の場合はDIRECTION_PRIORITYの順序で安定
 * - 到達不可能ならnullを返す
 */
export function bfsFirstStep(
	map: GameMap,
	from: Position,
	to: Position,
): Direction | null {
	if (from.x === to.x && from.y === to.y) return null;

	const visited = new Set<string>();
	visited.add(positionToKey(from));

	const queue: { pos: Position; firstStep: Direction }[] = [];

	for (const dir of DIRECTION_PRIORITY) {
		const delta = DIRECTION_DELTA[dir];
		const nx = from.x + delta.x;
		const ny = from.y + delta.y;

		if (!isInBounds(map, nx, ny)) continue;

		if (nx === to.x && ny === to.y) return dir;

		const tile = map[ny][nx];
		if (tile.type === "wall" || tile.type === "stairs") continue;

		const key = positionToKey({ x: nx, y: ny });
		if (visited.has(key)) continue;

		visited.add(key);
		queue.push({ pos: { x: nx, y: ny }, firstStep: dir });
	}

	let head = 0;
	while (head < queue.length) {
		const { pos, firstStep } = queue[head++];

		for (const dir of DIRECTION_PRIORITY) {
			const delta = DIRECTION_DELTA[dir];
			const nx = pos.x + delta.x;
			const ny = pos.y + delta.y;

			if (!isInBounds(map, nx, ny)) continue;

			if (nx === to.x && ny === to.y) return firstStep;

			const tile = map[ny][nx];
			if (tile.type === "wall" || tile.type === "stairs") continue;

			const key = positionToKey({ x: nx, y: ny });
			if (visited.has(key)) continue;

			visited.add(key);
			queue.push({ pos: { x: nx, y: ny }, firstStep });
		}
	}

	return null;
}
