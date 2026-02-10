import { describe, expect, it } from "vitest";
import { isAdjacent, manhattanDistance } from "./positionUtils";

describe("isAdjacent", () => {
	it("上方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 2 })).toBe(true);
	});

	it("下方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 4 })).toBe(true);
	});

	it("左方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 2, y: 3 })).toBe(true);
	});

	it("右方向に隣接している場合trueを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(true);
	});

	it("斜め方向は隣接していないのでfalseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(false);
	});

	it("同じ位置は隣接していないのでfalseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(false);
	});

	it("2マス以上離れている場合falseを返す", () => {
		expect(isAdjacent({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false);
	});
});

describe("manhattanDistance", () => {
	it("同じ位置の距離は0", () => {
		expect(manhattanDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
	});

	it("隣接する位置の距離は1", () => {
		expect(manhattanDistance({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(1);
	});

	it("離れた位置の距離を正しく計算する", () => {
		expect(manhattanDistance({ x: 1, y: 1 }, { x: 5, y: 4 })).toBe(7);
	});
});
