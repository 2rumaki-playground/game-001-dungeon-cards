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
 * 部屋付きテストマップ（7x7）
 *
 * 部屋: {x:2, y:2, width:3, height:3} → 床は(2,2)~(4,4)
 * 通路: (4,5)が床（部屋の下辺の外側1マス）
 *
 *   0 1 2 3 4 5 6
 * 0 W W W W W W W
 * 1 W W W W W W W
 * 2 W W F F F W W
 * 3 W W F F F W W
 * 4 W W F F F W W
 * 5 W W W W F W W  ← (4,5)が通路入口
 * 6 W W W W W W W
 */
function createMapWithOneEntrance(): GameMap {
	const map: GameMap = Array.from({ length: 7 }, () =>
		Array.from({ length: 7 }, () => ({ ...W })),
	);
	// 部屋の床
	for (let y = 2; y <= 4; y++) {
		for (let x = 2; x <= 4; x++) {
			map[y][x] = { ...F };
		}
	}
	// 通路入口（部屋の下辺の外側）
	map[5][4] = { ...F };
	return map;
}

/**
 * 複数通路入口付きマップ（7x7）
 *
 * 部屋: {x:2, y:2, width:3, height:3}
 * 通路入口: (4,5)=下辺, (5,3)=右辺
 *
 *   0 1 2 3 4 5 6
 * 0 W W W W W W W
 * 1 W W W W W W W
 * 2 W W F F F W W
 * 3 W W F F F F W  ← (5,3)が通路入口
 * 4 W W F F F W W
 * 5 W W W W F W W  ← (4,5)が通路入口
 * 6 W W W W W W W
 */
function createMapWithMultipleEntrances(): GameMap {
	const map = createMapWithOneEntrance();
	map[3][5] = { ...F };
	return map;
}

/**
 * 通路入口なしマップ（7x7）
 * 部屋: {x:2, y:2, width:3, height:3}
 * 外周すべて壁
 */
function createMapWithNoEntrance(): GameMap {
	const map: GameMap = Array.from({ length: 7 }, () =>
		Array.from({ length: 7 }, () => ({ ...W })),
	);
	for (let y = 2; y <= 4; y++) {
		for (let x = 2; x <= 4; x++) {
			map[y][x] = { ...F };
		}
	}
	return map;
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
				const map = createMapWithNoEntrance();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms, map);

				// 3x3の部屋全体が訪問済み
				for (let y = 2; y < 5; y++) {
					for (let x = 2; x < 5; x++) {
						expect(result.has(`${x},${y}`)).toBe(true);
					}
				}
				expect(result.size).toBe(9);
			});

			it("廊下の位置を指定するとその位置のみ訪問済みになる", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithNoEntrance();
				const result = revealAtPosition(visited, { x: 0, y: 0 }, rooms, map);
				expect(result.size).toBe(1);
				expect(result.has("0,0")).toBe(true);
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

		describe("通路入口の公開", () => {
			const rooms: Room[] = [{ x: 2, y: 2, width: 3, height: 3 }];

			it("部屋の辺に通路がある場合、入口タイルが公開される", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithOneEntrance();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms, map);

				// 部屋の9タイル + 通路入口1タイル = 10
				expect(result.has("4,5")).toBe(true);
				expect(result.size).toBe(10);
			});

			it("複数方向に通路がある場合、すべての入口が公開される", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithMultipleEntrances();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms, map);

				// 部屋の9タイル + 通路入口2タイル = 11
				expect(result.has("4,5")).toBe(true);
				expect(result.has("5,3")).toBe(true);
				expect(result.size).toBe(11);
			});

			it("外周がすべて壁なら追加公開なし", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithNoEntrance();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms, map);

				expect(result.size).toBe(9);
			});

			it("廊下にいる場合は通路入口公開なし", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithOneEntrance();
				const result = revealAtPosition(visited, { x: 0, y: 0 }, rooms, map);

				expect(result.size).toBe(1);
				expect(result.has("0,0")).toBe(true);
			});

			it("マップ端の部屋でも範囲外エラーにならない", () => {
				const edgeRooms: Room[] = [{ x: 1, y: 1, width: 3, height: 3 }];
				const map: GameMap = Array.from({ length: 5 }, () =>
					Array.from({ length: 5 }, () => ({ ...W })),
				);
				for (let y = 1; y <= 3; y++) {
					for (let x = 1; x <= 3; x++) {
						map[y][x] = { ...F };
					}
				}
				// 上辺・左辺はマップ端（y=0, x=0は境界外ではないが壁）
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(
					visited,
					{ x: 2, y: 2 },
					edgeRooms,
					map,
				);

				// 部屋の9タイルのみ（外周はすべて壁）
				expect(result.size).toBe(9);
			});

			it("通路入口公開後も元のSetが変更されない（イミュータブル）", () => {
				const visited = createEmptyVisitedTiles();
				const map = createMapWithOneEntrance();
				revealAtPosition(visited, { x: 3, y: 3 }, rooms, map);

				expect(visited.size).toBe(0);
			});
		});
	});
});
