import { describe, expect, it } from "vitest";
import type { Enemy } from "../types";
import { detectEnemyMoves } from "./enemyMoveDetector";

function makeEnemy(id: string, x: number, y: number, hp = 3, maxHp = 3): Enemy {
	return { id, position: { x, y }, hp, maxHp };
}

describe("detectEnemyMoves", () => {
	it("移動した敵のみ検出される", () => {
		const before = [makeEnemy("e1", 2, 3), makeEnemy("e2", 4, 4)];
		const after = [makeEnemy("e1", 3, 3), makeEnemy("e2", 4, 4)];

		const moves = detectEnemyMoves(before, after);

		expect(moves).toEqual([
			{ id: "e1", from: { x: 2, y: 3 }, to: { x: 3, y: 3 } },
		]);
	});

	it("位置が変わらない敵は含まれない", () => {
		const before = [makeEnemy("e1", 2, 3)];
		const after = [makeEnemy("e1", 2, 3)];

		const moves = detectEnemyMoves(before, after);

		expect(moves).toEqual([]);
	});

	it("afterに存在しない敵（撃破済み）は無視される", () => {
		const before = [makeEnemy("e1", 2, 3), makeEnemy("e2", 4, 4)];
		const after = [makeEnemy("e2", 4, 5)];

		const moves = detectEnemyMoves(before, after);

		expect(moves).toEqual([
			{ id: "e2", from: { x: 4, y: 4 }, to: { x: 4, y: 5 } },
		]);
	});

	it("空配列の場合は空配列を返す", () => {
		expect(detectEnemyMoves([], [])).toEqual([]);
	});

	it("複数の敵が同時に移動した場合すべて検出される", () => {
		const before = [
			makeEnemy("e1", 1, 1),
			makeEnemy("e2", 3, 3),
			makeEnemy("e3", 5, 5),
		];
		const after = [
			makeEnemy("e1", 2, 1),
			makeEnemy("e2", 3, 4),
			makeEnemy("e3", 5, 4),
		];

		const moves = detectEnemyMoves(before, after);

		expect(moves).toEqual([
			{ id: "e1", from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
			{ id: "e2", from: { x: 3, y: 3 }, to: { x: 3, y: 4 } },
			{ id: "e3", from: { x: 5, y: 5 }, to: { x: 5, y: 4 } },
		]);
	});
});
