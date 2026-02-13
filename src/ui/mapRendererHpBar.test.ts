/**
 * マップレンダラーのテスト（HPバー・ツールチップ）
 */

import { type FederatedPointerEvent, Graphics } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTickerMock } from "../test-utils/mockPixi";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { MapRenderer } from "./mapRenderer";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

const tickerMock = createTickerMock();
vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	return {
		...actual,
		Ticker: {
			shared: {
				add: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.add(fn),
				remove: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.remove(fn),
			},
		},
	};
});

// assetLoader をモック化（ダミーテクスチャを返す）
vi.mock("./assetLoader", async () => {
	const pixi = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	const dummyTexture = pixi.Texture.WHITE;
	return {
		getTileTexture: () => dummyTexture,
		getPlayerTexture: () => dummyTexture,
		getEnemyTexture: () => dummyTexture,
	};
});

beforeEach(() => {
	tickerMock.reset();
});

/**
 * テスト用のマップ状態を作成
 */
function createTestMap() {
	const map = [];
	for (let y = 0; y < 5; y++) {
		const row = [];
		for (let x = 0; x < 5; x++) {
			row.push({ type: "floor" as const });
		}
		map.push(row);
	}
	return map;
}

describe("MapRenderer HPバー", () => {
	it("miniboss敵のコンテナにHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-miniboss",
				position: { x: 1, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("boss敵のコンテナにHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-boss",
				position: { x: 2, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("normal敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("heavy敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-heavy",
				position: { x: 1, y: 1 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("scout敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 1, y: 1 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("HP減少が通常敵のHPバーに反映される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};

		// HP満タンで描画
		const fullHpEnemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const rectSpy = vi.spyOn(Graphics.prototype, "rect");
		renderer.render(map, player, fullHpEnemies);

		// HPバー描画: 背景rect + HP部分rect
		const fullHpCalls = rectSpy.mock.calls.filter(
			(args) => args[2] !== undefined && args[3] === 6,
		);
		// 背景(幅40) + HP部分(幅40)
		expect(fullHpCalls).toHaveLength(2);
		const fullBarWidth = fullHpCalls[1][2] as number;

		// HP減少して再描画
		rectSpy.mockClear();
		const damagedEnemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 1,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		renderer.render(map, player, damagedEnemies);

		const damagedHpCalls = rectSpy.mock.calls.filter(
			(args) => args[2] !== undefined && args[3] === 6,
		);
		expect(damagedHpCalls).toHaveLength(2);
		const damagedBarWidth = damagedHpCalls[1][2] as number;

		// HP比率に応じてバー幅が縮小していること
		expect(damagedBarWidth).toBeLessThan(fullBarWidth);
		expect(damagedBarWidth).toBeCloseTo(fullBarWidth * (1 / 3), 5);

		rectSpy.mockRestore();
	});

	it("clear後にコンテナがクリアされる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-boss",
				position: { x: 2, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);
		renderer.clear();

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(0);
	});
});

describe("MapRenderer 敵ホバーツールチップ", () => {
	it("敵コンテナのeventModeがstaticに設定される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.eventMode).toBe("static");
	});

	it("敵コンテナにpointerover/pointeroutリスナーが登録される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.listenerCount("pointerover")).toBe(1);
		expect(enemyContainer.listenerCount("pointerout")).toBe(1);
	});

	it("pointeroverでツールチップが表示されpointeroutで非表示になる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		// ルートコンテナの最上位に追加されたツールチップ
		const tooltipContainer = container.children.at(-1);

		expect(tooltipContainer?.visible).toBe(false);
		enemyContainer.emit("pointerover", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(true);
		enemyContainer.emit("pointerout", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(false);
	});

	it("ツールチップコンテナがルートコンテナの最上位に追加される", () => {
		const renderer = new MapRenderer();
		const container = renderer.getContainer();
		const lastChild = container.children.at(-1);
		// ツールチップは初期状態で非表示
		expect(lastChild?.visible).toBe(false);
		// ツールチップコンテナはイベントを受け取らない
		expect(lastChild?.eventMode).toBe("none");
	});
});
