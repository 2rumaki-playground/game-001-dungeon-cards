import { Container, Graphics, Sprite } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CELL_SIZE } from "../constants";
import { createTickerMock } from "../test-utils/mockPixi";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import type { Enemy } from "../types";
import {
	CharacterRenderer,
	type CharacterRendererCallbacks,
} from "./characterRenderer";
import { HP_GAUGE_BRIGHT_COLOR } from "./mapAnimationConstants";

// --- mocks ---

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

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

vi.mock("./assetLoader", async () => {
	const pixi = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	const dummyTexture = pixi.Texture.WHITE;
	return {
		getTileTexture: () => dummyTexture,
		getPlayerTexture: () => dummyTexture,
		getEnemyTexture: () => dummyTexture,
	};
});

// --- helpers ---

function createCallbacks(): CharacterRendererCallbacks {
	return {
		onEnemyPointerOver: vi.fn(),
		onEnemyPointerOut: vi.fn(),
		onBeforeEnemyDestroy: vi.fn(),
	};
}

function createEnemy(
	overrides: Partial<Enemy> & { id: string; hp: number; maxHp: number },
): Enemy {
	return {
		type: "normal",
		position: { x: 1, y: 1 },
		...overrides,
	};
}

/** Graphics の描画呼び出しを記録するスパイ */
function spyOnGraphics(g: Graphics) {
	const rectSpy = vi.spyOn(g, "rect");
	const fillSpy = vi.spyOn(g, "fill");
	const clearSpy = vi.spyOn(g, "clear");
	return { rectSpy, fillSpy, clearSpy };
}

// --- tests ---

describe("CharacterRenderer HPゲージ", () => {
	let renderer: CharacterRenderer;
	let enemiesContainer: Container;

	beforeEach(() => {
		tickerMock.reset();
		const playerSprite = new Sprite();
		enemiesContainer = new Container();
		renderer = new CharacterRenderer(
			playerSprite,
			enemiesContainer,
			createCallbacks(),
		);
	});

	it("ゲージが敵コンテナのindex 0に挿入される", () => {
		const enemy = createEnemy({ id: "e1", hp: 3, maxHp: 3 });
		renderer.renderEnemies([enemy]);

		const enemyContainer = renderer.getEnemyContainer("e1");
		expect(enemyContainer).toBeDefined();
		// index 0 はゲージ（Graphics）、index 1 はスプライト
		expect(enemyContainer?.children[0]).toBeInstanceOf(Graphics);
		expect(enemyContainer?.children[1]).toBeInstanceOf(Sprite);
	});

	it("HP満タン時: 明るい矩形がタイル全面を覆う", () => {
		const enemy = createEnemy({ id: "e1", hp: 5, maxHp: 5 });
		renderer.renderEnemies([enemy]);

		const gauge = renderer.getEnemyContainer("e1")?.children[0] as Graphics;
		const { rectSpy, fillSpy } = spyOnGraphics(gauge);

		// 再描画して spy で検証
		renderer.renderEnemies([enemy]);

		expect(rectSpy).toHaveBeenCalledWith(0, 0, CELL_SIZE, CELL_SIZE);
		expect(fillSpy).toHaveBeenCalledWith(HP_GAUGE_BRIGHT_COLOR);
	});

	it("HP半分時: 明るい矩形の高さ = CELL_SIZE * 0.5、y位置 = CELL_SIZE * 0.5", () => {
		const enemy = createEnemy({ id: "e1", hp: 5, maxHp: 10 });
		renderer.renderEnemies([enemy]);

		const gauge = renderer.getEnemyContainer("e1")?.children[0] as Graphics;
		const { rectSpy, fillSpy } = spyOnGraphics(gauge);

		renderer.renderEnemies([enemy]);

		const expectedHeight = CELL_SIZE * 0.5;
		const expectedY = CELL_SIZE - expectedHeight;
		expect(rectSpy).toHaveBeenCalledWith(
			0,
			expectedY,
			CELL_SIZE,
			expectedHeight,
		);
		expect(fillSpy).toHaveBeenCalledWith(HP_GAUGE_BRIGHT_COLOR);
	});

	it("HP 0時: clearのみで矩形描画なし", () => {
		const enemy = createEnemy({ id: "e1", hp: 0, maxHp: 5 });
		renderer.renderEnemies([enemy]);

		const gauge = renderer.getEnemyContainer("e1")?.children[0] as Graphics;
		const { rectSpy, fillSpy, clearSpy } = spyOnGraphics(gauge);

		renderer.renderEnemies([enemy]);

		expect(clearSpy).toHaveBeenCalled();
		expect(rectSpy).not.toHaveBeenCalled();
		expect(fillSpy).not.toHaveBeenCalled();
	});

	it("敵破棄時にゲージMapからも削除される", () => {
		const enemy = createEnemy({ id: "e1", hp: 3, maxHp: 3 });
		renderer.renderEnemies([enemy]);

		// 敵が存在する
		expect(renderer.getEnemyContainer("e1")).toBeDefined();

		// 敵を除外して描画 → 破棄される
		renderer.renderEnemies([]);

		expect(renderer.getEnemyContainer("e1")).toBeUndefined();
	});
});
