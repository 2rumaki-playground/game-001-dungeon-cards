import { describe, expect, it } from "vitest";
import type { GameMap, Tile } from "../types";
import { bfsFirstStep } from "./pathfinding";

/** ヘルパー: 文字列配列からマップを生成（W=壁, F=床, S=階段, T=罠, R=休憩, X=宝箱） */
function mapFromStrings(rows: string[]): GameMap {
	const tileMap: Record<string, Tile> = {
		W: { type: "wall" },
		F: { type: "floor" },
		S: { type: "stairs" },
		T: { type: "trap" },
		R: { type: "rest_area" },
		X: { type: "treasure" },
	};
	return rows.map((row) =>
		row.split("").map((ch) => {
			const tile = tileMap[ch];
			if (!tile) throw new Error(`Unknown tile char: ${ch}`);
			return { ...tile };
		}),
	);
}

describe("bfsFirstStep", () => {
	it("直線経路でプレイヤーに近づく方向を返す", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WFFFW", "WFFFW", "WWWWW"]);
		// 敵(2,3) → プレイヤー(2,1): 上に直進
		expect(bfsFirstStep(map, { x: 2, y: 3 }, { x: 2, y: 1 })).toBe("up");
	});

	it("同じ位置の場合nullを返す", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WFFFW", "WWWWW"]);
		expect(bfsFirstStep(map, { x: 2, y: 2 }, { x: 2, y: 2 })).toBeNull();
	});

	it("壁を迂回して最短経路の最初の一歩を返す", () => {
		// L字壁: 敵(1,3)→プレイヤー(1,1)、(1,2)が壁
		const map = mapFromStrings(["WWWWW", "WFFFW", "WWFFW", "WFFFW", "WWWWW"]);
		// 上(1,2)は壁。右(2,3)→(2,2)→(2,1)→(1,1)で到達可能 → right
		expect(bfsFirstStep(map, { x: 1, y: 3 }, { x: 1, y: 1 })).toBe("right");
	});

	it("階段を迂回して移動する", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WFSFW", "WFFFW", "WWWWW"]);
		// 敵(2,3)→プレイヤー(2,1)、(2,2)は階段
		// 左(1,3)→(1,2)→(1,1)→(2,1) or 右(3,3)→(3,2)→(3,1)→(2,1) → 同距離、左が優先
		expect(bfsFirstStep(map, { x: 2, y: 3 }, { x: 2, y: 1 })).toBe("left");
	});

	it("trap/treasure/rest_areaタイルを通過可能として扱う", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WTXRW", "WFFFW", "WWWWW"]);
		// 敵(2,3)→プレイヤー(2,1)、(2,2)はtreasure → 通過可能
		expect(bfsFirstStep(map, { x: 2, y: 3 }, { x: 2, y: 1 })).toBe("up");
	});

	it("完全に囲まれている場合nullを返す", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WWWWW", "WFFFW", "WWWWW"]);
		// 敵(1,3) は壁で完全に分断されている
		expect(bfsFirstStep(map, { x: 1, y: 3 }, { x: 1, y: 1 })).toBeNull();
	});

	it("ゴールが壁で囲まれている場合nullを返す", () => {
		const map = mapFromStrings(["WWWWW", "WWFWW", "WFFFW", "WFFFW", "WWWWW"]);
		// プレイヤー(2,1)の左右が壁、上も壁、下(2,2)は床
		// 敵(2,3) → BFSは(2,2)→(2,1)と到達可能（(2,1)自体は床）
		expect(bfsFirstStep(map, { x: 2, y: 3 }, { x: 2, y: 1 })).toBe("up");
	});

	it("同距離の複数経路がある場合DIRECTION_PRIORITYの順序で安定する", () => {
		const map = mapFromStrings(["WWWWW", "WFFFW", "WFWFW", "WFFFW", "WWWWW"]);
		// 敵(2,3)→プレイヤー(2,1)、(2,2)は壁
		// 左回り: left(1,3)→(1,2)→(1,1)→(2,1) = 4歩
		// 右回り: right(3,3)→(3,2)→(3,1)→(2,1) = 4歩
		// 上→下→左→右の優先で左(left)が先
		expect(bfsFirstStep(map, { x: 2, y: 3 }, { x: 2, y: 1 })).toBe("left");
	});

	it("マップ端の位置から正しく経路を見つける", () => {
		const map = mapFromStrings(["WWWWW", "FFFFW", "WFFFW", "WWWWW"]);
		// 敵(0,1)→プレイヤー(3,1): 右に直進
		expect(bfsFirstStep(map, { x: 0, y: 1 }, { x: 3, y: 1 })).toBe("right");
	});
});
