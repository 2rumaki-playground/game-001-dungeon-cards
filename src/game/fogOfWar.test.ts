import { describe, expect, it } from "vitest";
import type { GameMap, Room, Tile } from "../types";
import {
	createEmptyVisitedTiles,
	isVisited,
	revealAtPosition,
} from "./fogOfWar";

/** テスト用タイルヘルパー */
const W: Tile = { type: "wall" };
const F: Tile = { type: "floor" };

/**
 * 通路付きテストマップ（9x9）
 *
 * 部屋A: {x:1, y:1, width:3, height:3}
 * 部屋B: {x:5, y:5, width:3, height:3}
 * 通路: (4,2)→(4,3)→(4,4)→(4,5) で部屋Aと部屋Bを接続
 *
 *   0 1 2 3 4 5 6 7 8
 * 0 W W W W W W W W W
 * 1 W F F F W W W W W
 * 2 W F F F F W W W W  ← (4,2)通路
 * 3 W F F F F W W W W  ← (4,3)通路
 * 4 W W W W F W W W W  ← (4,4)通路
 * 5 W W W W F F F F W  ← (4,5)通路入口→部屋B
 * 6 W W W W W F F F W
 * 7 W W W W W F F F W
 * 8 W W W W W W W W W
 */
function createCorridorMap(): { map: GameMap; rooms: Room[] } {
	const map: GameMap = Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => ({ ...W })),
	);
	// 部屋A
	for (let y = 1; y <= 3; y++) {
		for (let x = 1; x <= 3; x++) {
			map[y][x] = { ...F };
		}
	}
	// 部屋B
	for (let y = 5; y <= 7; y++) {
		for (let x = 5; x <= 7; x++) {
			map[y][x] = { ...F };
		}
	}
	// 通路
	map[2][4] = { ...F };
	map[3][4] = { ...F };
	map[4][4] = { ...F };
	map[5][4] = { ...F };
	const rooms: Room[] = [
		{ x: 1, y: 1, width: 3, height: 3 },
		{ x: 5, y: 5, width: 3, height: 3 },
	];
	return { map, rooms };
}

/**
 * L字通路付きテストマップ（9x9）
 *
 * 部屋: {x:1, y:1, width:3, height:3}
 * 通路: (4,2)→(5,2)→(5,3) L字型
 *
 *   0 1 2 3 4 5 6 7 8
 * 0 W W W W W W W W W
 * 1 W F F F W W W W W
 * 2 W F F F F F W W W  ← (4,2)→(5,2)通路
 * 3 W F F F W F W W W  ← (5,3)通路
 * 4 W W W W W W W W W
 * ...
 */
function createLShapedCorridorMap(): { map: GameMap; rooms: Room[] } {
	const map: GameMap = Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => ({ ...W })),
	);
	// 部屋
	for (let y = 1; y <= 3; y++) {
		for (let x = 1; x <= 3; x++) {
			map[y][x] = { ...F };
		}
	}
	// L字通路
	map[2][4] = { ...F };
	map[2][5] = { ...F };
	map[3][5] = { ...F };
	const rooms: Room[] = [{ x: 1, y: 1, width: 3, height: 3 }];
	return { map, rooms };
}

describe("fogOfWar", () => {
	describe("createEmptyVisitedTiles", () => {
		it("空のSetを返す", () => {
			const visited = createEmptyVisitedTiles();
			expect(visited.size).toBe(0);
		});
	});

	describe("isVisited", () => {
		it("訪問済みの座標でtrueを返す", () => {
			const visited = new Set(["3,3"]);
			expect(isVisited(visited, { x: 3, y: 3 })).toBe(true);
		});

		it("未訪問の座標でfalseを返す", () => {
			const visited = new Set(["3,3"]);
			expect(isVisited(visited, { x: 1, y: 1 })).toBe(false);
		});
	});

	describe("revealAtPosition", () => {
		it("指定位置を訪問済みに追加する", () => {
			const visited = createEmptyVisitedTiles();
			const result = revealAtPosition(visited, { x: 5, y: 5 }, [], []);
			expect(result.has("5,5")).toBe(true);
		});

		it("元のSetを変更しない（イミュータブル）", () => {
			const visited = createEmptyVisitedTiles();
			const result = revealAtPosition(visited, { x: 5, y: 5 }, [], []);
			expect(visited.size).toBe(0);
			expect(result.size).toBe(1);
		});

		describe("部屋全体の公開", () => {
			const rooms: Room[] = [{ x: 2, y: 2, width: 3, height: 3 }];

			it("部屋内の位置を指定すると部屋全体が訪問済みになる", () => {
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms, []);

				// 3x3の部屋全体が訪問済み
				for (let y = 2; y < 5; y++) {
					for (let x = 2; x < 5; x++) {
						expect(result.has(`${x},${y}`)).toBe(true);
					}
				}
				expect(result.size).toBe(9);
			});

			it("複数回呼び出しても既存の訪問済みが維持される", () => {
				let visited = createEmptyVisitedTiles();
				visited = revealAtPosition(visited, { x: 0, y: 0 }, [], []);
				visited = revealAtPosition(visited, { x: 1, y: 1 }, [], []);
				expect(visited.has("0,0")).toBe(true);
				expect(visited.has("1,1")).toBe(true);
				expect(visited.size).toBe(2);
			});
		});

		describe("rooms=[]（固定レイアウト）", () => {
			it("部屋情報がない場合はタイル単位で訪問済みになる", () => {
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, [], []);
				expect(result.size).toBe(1);
				expect(result.has("3,3")).toBe(true);
			});
		});

		describe("通路全体の公開", () => {
			it("通路に入ると繋がった通路全体が公開される", () => {
				const { map, rooms } = createCorridorMap();
				const visited = createEmptyVisitedTiles();
				// 通路タイル(4,3)に移動
				const result = revealAtPosition(visited, { x: 4, y: 3 }, rooms, map);

				// 通路4タイル全て公開
				expect(result.has("4,2")).toBe(true);
				expect(result.has("4,3")).toBe(true);
				expect(result.has("4,4")).toBe(true);
				expect(result.has("4,5")).toBe(true);
				// 部屋タイルは含まない
				expect(result.has("1,1")).toBe(false);
				expect(result.has("5,5")).toBe(false);
				expect(result.size).toBe(4);
			});

			it("L字通路でも繋がった全タイルが公開される", () => {
				const { map, rooms } = createLShapedCorridorMap();
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 4, y: 2 }, rooms, map);

				expect(result.has("4,2")).toBe(true);
				expect(result.has("5,2")).toBe(true);
				expect(result.has("5,3")).toBe(true);
				expect(result.size).toBe(3);
			});

			it("通路から部屋タイルには侵入しない", () => {
				const { map, rooms } = createCorridorMap();
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 4, y: 2 }, rooms, map);

				// 部屋Aのタイルは含まない
				expect(result.has("3,2")).toBe(false);
				// 部屋Bのタイルは含まない
				expect(result.has("5,5")).toBe(false);
			});

			it("通路公開後も元のSetが変更されない（イミュータブル）", () => {
				const { map, rooms } = createCorridorMap();
				const visited = createEmptyVisitedTiles();
				revealAtPosition(visited, { x: 4, y: 3 }, rooms, map);
				expect(visited.size).toBe(0);
			});

			it("rooms=[]の場合は通路探索しない", () => {
				const { map } = createCorridorMap();
				const visited = createEmptyVisitedTiles();
				// roomsが空なら固定レイアウト扱い→タイル単位
				const result = revealAtPosition(visited, { x: 4, y: 3 }, [], map);
				expect(result.size).toBe(1);
				expect(result.has("4,3")).toBe(true);
			});
		});
	});
});
