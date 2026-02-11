import { describe, expect, it } from "vitest";
import type { Room } from "../types";
import {
	createEmptyVisitedTiles,
	isVisited,
	revealAtPosition,
} from "./fogOfWar";

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
			const result = revealAtPosition(visited, { x: 5, y: 5 }, []);
			expect(result.has("5,5")).toBe(true);
		});

		it("元のSetを変更しない（イミュータブル）", () => {
			const visited = createEmptyVisitedTiles();
			const result = revealAtPosition(visited, { x: 5, y: 5 }, []);
			expect(visited.size).toBe(0);
			expect(result.size).toBe(1);
		});

		describe("部屋全体の公開", () => {
			const rooms: Room[] = [{ x: 2, y: 2, width: 3, height: 3 }];

			it("部屋内の位置を指定すると部屋全体が訪問済みになる", () => {
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, rooms);

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
				const result = revealAtPosition(visited, { x: 0, y: 0 }, rooms);
				expect(result.size).toBe(1);
				expect(result.has("0,0")).toBe(true);
			});

			it("複数回呼び出しても既存の訪問済みが維持される", () => {
				let visited = createEmptyVisitedTiles();
				visited = revealAtPosition(visited, { x: 0, y: 0 }, []);
				visited = revealAtPosition(visited, { x: 1, y: 1 }, []);
				expect(visited.has("0,0")).toBe(true);
				expect(visited.has("1,1")).toBe(true);
				expect(visited.size).toBe(2);
			});
		});

		describe("rooms=[]（固定レイアウト）", () => {
			it("部屋情報がない場合はタイル単位で訪問済みになる", () => {
				const visited = createEmptyVisitedTiles();
				const result = revealAtPosition(visited, { x: 3, y: 3 }, []);
				expect(result.size).toBe(1);
				expect(result.has("3,3")).toBe(true);
			});
		});
	});
});
