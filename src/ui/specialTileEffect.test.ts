import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameMap } from "../types/map";

let tickerCallbacks: Array<(tick: { deltaMS: number }) => void> = [];
vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");

	const MockTicker = {
		shared: {
			add: (fn: (tick: { deltaMS: number }) => void) => {
				tickerCallbacks.push(fn);
			},
			remove: (fn: (tick: { deltaMS: number }) => void) => {
				tickerCallbacks = tickerCallbacks.filter((cb) => cb !== fn);
			},
		},
	};

	return {
		...actual,
		Ticker: MockTicker,
	};
});

import { SpecialTileEffectManager } from "./specialTileEffect";
import { getStairsEffectConfig } from "./specialTileEffectLogic";

function createSimpleMap(tiles: string[][]): GameMap {
	return tiles.map((row) =>
		row.map((type) => ({ type: type as GameMap[0][0]["type"] })),
	);
}

describe("SpecialTileEffectManager", () => {
	beforeEach(() => {
		tickerCallbacks = [];
	});

	it("getContainer()がContainerを返す", () => {
		const manager = new SpecialTileEffectManager();
		const container = manager.getContainer();
		expect(container).toBeDefined();
	});

	it("update()で特殊タイルを含むマップを渡すとTickerに登録される", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([
			["floor", "trap"],
			["treasure", "rest_area"],
		]);
		manager.update(map);
		expect(tickerCallbacks).toHaveLength(1);
	});

	it("update()を複数回呼んでもTickerコールバックは1つだけ", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["floor", "trap"]]);
		manager.update(map);
		manager.update(map);
		expect(tickerCallbacks).toHaveLength(1);
	});

	it("update()で通常タイル（floor/wall）のみのマップではTickerに登録されない", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([
			["floor", "wall"],
			["floor", "floor"],
		]);
		manager.update(map);
		expect(tickerCallbacks).toHaveLength(0);
	});

	it("update()で階段タイルを含むマップでTickerに登録される", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["floor", "stairs"]]);
		manager.update(map);
		expect(tickerCallbacks).toHaveLength(1);
	});

	it("update()でvisitedTilesが指定された場合、未訪問の特殊タイルはスキップ", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([
			["trap", "treasure"],
			["floor", "rest_area"],
		]);
		const visited = new Set(["0,0"]); // trapのみ訪問済み
		manager.update(map, visited);

		// Tickerが登録されている（trapのエフェクトがある）
		expect(tickerCallbacks).toHaveLength(1);

		// 1フレーム進める → グローが描画される
		for (const cb of [...tickerCallbacks]) {
			cb({ deltaMS: 16 });
		}

		// エフェクト数を確認（visitedの1つだけ）
		expect(manager.getEffectCount()).toBe(1);
	});

	it("update()で全タイルが訪問済みの場合、全特殊タイルにエフェクトが作成される", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([
			["trap", "treasure"],
			["floor", "rest_area"],
		]);
		const visited = new Set(["0,0", "1,0", "0,1", "1,1"]);
		manager.update(map, visited);
		expect(manager.getEffectCount()).toBe(3); // trap, treasure, rest_area
	});

	it("visitedTilesが未指定の場合、全特殊タイルにエフェクトが作成される", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([
			["trap", "treasure"],
			["floor", "rest_area"],
		]);
		manager.update(map);
		expect(manager.getEffectCount()).toBe(3);
	});

	it("clear()でTickerコールバックが解除される", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["trap"]]);
		manager.update(map);
		expect(tickerCallbacks).toHaveLength(1);

		manager.clear();
		expect(tickerCallbacks).toHaveLength(0);
	});

	it("clear()後にgetEffectCount()が0を返す", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["trap", "treasure"]]);
		manager.update(map);
		expect(manager.getEffectCount()).toBe(2);

		manager.clear();
		expect(manager.getEffectCount()).toBe(0);
	});

	it("Tickerコールバック内でGraphicsコンテナの子要素が存在する", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["trap"]]);
		manager.update(map);

		// 1フレーム進める
		for (const cb of [...tickerCallbacks]) {
			cb({ deltaMS: 16 });
		}

		// コンテナに描画用Graphicsがある
		expect(manager.getContainer().children.length).toBeGreaterThanOrEqual(1);
	});

	it("update()で階段タイルのエフェクト数がカウントされる", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["trap", "stairs"]]);
		manager.update(map);
		expect(manager.getEffectCount()).toBe(2); // trap + stairs
	});

	it("setFloorCleared(true)で階段エフェクトの設定が変化する", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["stairs"]]);
		manager.update(map);
		expect(manager.getEffectCount()).toBe(1);

		const normalConfig = getStairsEffectConfig(false);
		const stairsEffect = manager.getStairsEffect("0,0");
		expect(stairsEffect?.config.pulsePeriod).toBe(normalConfig.pulsePeriod);
		expect(stairsEffect?.config.pulseAlphaMax).toBe(normalConfig.pulseAlphaMax);

		manager.setFloorCleared(true);
		// setFloorCleared後もエフェクト数は維持
		expect(manager.getEffectCount()).toBe(1);

		const clearedConfig = getStairsEffectConfig(true);
		const updatedEffect = manager.getStairsEffect("0,0");
		expect(updatedEffect?.config.pulsePeriod).toBe(clearedConfig.pulsePeriod);
		expect(updatedEffect?.config.pulseAlphaMax).toBe(
			clearedConfig.pulseAlphaMax,
		);
		expect(updatedEffect?.config.glowRadius).toBe(clearedConfig.glowRadius);
	});

	it("clear()後に階段エフェクトもクリアされる", () => {
		const manager = new SpecialTileEffectManager();
		const map = createSimpleMap([["stairs", "trap"]]);
		manager.update(map);
		expect(manager.getEffectCount()).toBe(2);

		manager.clear();
		expect(manager.getEffectCount()).toBe(0);
	});

	it("update()でタイルが消えた場合エフェクトが減る", () => {
		const manager = new SpecialTileEffectManager();
		const map1 = createSimpleMap([["trap", "treasure"]]);
		manager.update(map1);
		expect(manager.getEffectCount()).toBe(2);

		const map2 = createSimpleMap([["floor", "treasure"]]);
		manager.update(map2);
		expect(manager.getEffectCount()).toBe(1);
	});
});
