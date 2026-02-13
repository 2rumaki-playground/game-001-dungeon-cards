/**
 * マップレンダラーのテスト（タイル描画・Fog of War）
 */

import { Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createRendererTestMap } from "../test-utils/mapRendererTestSetup";
import { MapRenderer } from "./mapRenderer";

describe("MapRenderer タイルスプライト描画", () => {
	it("マップのタイル数と同じスプライトが生成される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap(); // 5x5
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(25);
	});

	it("特殊タイルを含むマップが正しく描画される", () => {
		const renderer = new MapRenderer();
		const map = [
			[{ type: "floor" as const }, { type: "trap" as const }],
			[{ type: "treasure" as const }, { type: "rest_area" as const }],
		];
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(4);
	});

	it("階段タイルがスプライトとして描画される", () => {
		const renderer = new MapRenderer();
		const map = [[{ type: "stairs" as const }]];
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(1);
	});

	it("同一map参照で再呼び出しするとSprite再生成がスキップされる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		const childrenBefore = [...tilesContainer.children];

		// 同一参照で再呼び出し
		renderer.renderMap(map);

		// children の参照が維持されていること（Spriteが差し替わっていない）
		expect(tilesContainer.children.length).toBe(childrenBefore.length);
		for (let i = 0; i < childrenBefore.length; i++) {
			expect(tilesContainer.children[i]).toBe(childrenBefore[i]);
		}
	});

	it("renderMapを再呼び出しすると前のスプライトがクリアされる", () => {
		const renderer = new MapRenderer();
		const map1 = [[{ type: "floor" as const }]]; // 1x1
		const map2 = createRendererTestMap(); // 5x5

		renderer.renderMap(map1);
		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(1);

		renderer.renderMap(map2);
		expect(tilesContainer.children.length).toBe(25);
	});
});

describe("MapRenderer Fog of War", () => {
	const player = {
		position: { x: 0, y: 0 },
		hp: 10,
		maxHp: 10,
		ap: 3,
		maxAp: 3,
	};

	describe("renderEnemies with visitedTiles", () => {
		it("訪問済みタイル上の敵は表示される", () => {
			const renderer = new MapRenderer();
			const map = createRendererTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			const visitedTiles = new Set(["1,1"]);
			renderer.render(map, player, enemies, false, false, {}, visitedTiles);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(1);
		});

		it("未訪問タイル上の敵は描画されない", () => {
			const renderer = new MapRenderer();
			const map = createRendererTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			// (1,1)は未訪問
			const visitedTiles = new Set(["0,0"]);
			renderer.render(map, player, enemies, false, false, {}, visitedTiles);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(0);
		});

		it("visitedTiles未指定時は全敵が表示される（後方互換）", () => {
			const renderer = new MapRenderer();
			const map = createRendererTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
				{
					id: "e2",
					position: { x: 2, y: 2 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			renderer.render(map, player, enemies);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(2);
		});
	});

	describe("renderFog", () => {
		it("未訪問タイルに黒い矩形が描画される", () => {
			const renderer = new MapRenderer();
			const map = [
				[{ type: "floor" as const }, { type: "floor" as const }],
				[{ type: "floor" as const }, { type: "floor" as const }],
			];
			// (0,0)のみ訪問済み → 残り3タイルがfog対象
			const visitedTiles = new Set(["0,0"]);

			const rectSpy = vi.spyOn(Graphics.prototype, "rect");
			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, [], false, false, {}, visitedTiles);

			// fogGraphicsのrect呼び出し: 3タイル分（remnants.clear後のfog描画）
			// rectは他の描画でも呼ばれるので、fill(0x000000)の呼び出し回数で判定
			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(3);

			rectSpy.mockRestore();
			fillSpy.mockRestore();
		});

		it("全タイル訪問済みの場合はfog矩形が描画されない", () => {
			const renderer = new MapRenderer();
			const map = [[{ type: "floor" as const }, { type: "floor" as const }]];
			const visitedTiles = new Set(["0,0", "1,0"]);

			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, [], false, false, {}, visitedTiles);

			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(0);

			fillSpy.mockRestore();
		});

		it("visitedTiles未指定時はfogGraphicsがクリアされる", () => {
			const renderer = new MapRenderer();
			const map = createRendererTestMap();

			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, []);

			// visitedTiles未指定時は0x000000のfillは呼ばれない
			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(0);

			fillSpy.mockRestore();
		});
	});
});
