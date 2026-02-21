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
import { HP_GAUGE_BRIGHT_COLOR, PLAYER_PADDING } from "./mapAnimationConstants";

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
		onPlayerPointerOver: vi.fn(),
		onPlayerPointerOut: vi.fn(),
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

describe("CharacterRenderer 敵HPゲージ", () => {
	let renderer: CharacterRenderer;
	let enemiesContainer: Container;

	beforeEach(() => {
		tickerMock.reset();
		const playerContainer = new Container();
		enemiesContainer = new Container();
		renderer = new CharacterRenderer(
			playerContainer,
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

	it("撃破アニメーション開始時にHPゲージがクリアされる", async () => {
		const enemy = createEnemy({ id: "e1", hp: 3, maxHp: 5 });
		renderer.renderEnemies([enemy]);

		const gauge = renderer.getEnemyContainer("e1")?.children[0] as Graphics;
		const { clearSpy, rectSpy } = spyOnGraphics(gauge);

		await renderer.animateEnemyDefeat("e1");

		// ゲージの clear が呼ばれ、rect（再描画）は呼ばれない
		expect(clearSpy).toHaveBeenCalled();
		expect(rectSpy).not.toHaveBeenCalled();
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

describe("CharacterRenderer プレイヤーHPゲージ", () => {
	let renderer: CharacterRenderer;
	let playerContainer: Container;

	beforeEach(() => {
		tickerMock.reset();
		playerContainer = new Container();
		const enemiesContainer = new Container();
		renderer = new CharacterRenderer(
			playerContainer,
			enemiesContainer,
			createCallbacks(),
		);
	});

	it("renderPlayer後にコンテナにHPゲージ(index 0)とスプライト(index 1)が追加される", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		expect(playerContainer.children[0]).toBeInstanceOf(Graphics);
		expect(playerContainer.children[1]).toBeInstanceOf(Sprite);
	});

	it("プレイヤースプライトにパディングが適用されタイルが視認可能", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		const sprite = playerContainer.children[1] as Sprite;
		const expectedSize = CELL_SIZE - PLAYER_PADDING * 2;
		expect(sprite.width).toBe(expectedSize);
		expect(sprite.height).toBe(expectedSize);
		expect(sprite.x).toBe(PLAYER_PADDING);
		expect(sprite.y).toBe(PLAYER_PADDING);
	});

	it("HP満タン時: ゲージがタイル全面を覆う", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		const gauge = playerContainer.children[0] as Graphics;
		const { rectSpy, fillSpy } = spyOnGraphics(gauge);

		renderer.renderPlayer(player);

		expect(rectSpy).toHaveBeenCalledWith(0, 0, CELL_SIZE, CELL_SIZE);
		expect(fillSpy).toHaveBeenCalledWith(HP_GAUGE_BRIGHT_COLOR);
	});

	it("HP半分時: ゲージ高さ = CELL_SIZE * 0.5", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 5,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		const gauge = playerContainer.children[0] as Graphics;
		const { rectSpy, fillSpy } = spyOnGraphics(gauge);

		renderer.renderPlayer(player);

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
		const player = {
			position: { x: 3, y: 3 },
			hp: 0,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		const gauge = playerContainer.children[0] as Graphics;
		const { rectSpy, fillSpy, clearSpy } = spyOnGraphics(gauge);

		renderer.renderPlayer(player);

		expect(clearSpy).toHaveBeenCalled();
		expect(rectSpy).not.toHaveBeenCalled();
		expect(fillSpy).not.toHaveBeenCalled();
	});

	it("updatePlayerHpGaugeでゲージが更新される", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		const gauge = playerContainer.children[0] as Graphics;
		const { rectSpy, fillSpy } = spyOnGraphics(gauge);

		renderer.updatePlayerHpGauge(0.3);

		const expectedHeight = CELL_SIZE * 0.3;
		const expectedY = CELL_SIZE - expectedHeight;
		expect(rectSpy).toHaveBeenCalledWith(
			0,
			expectedY,
			CELL_SIZE,
			expectedHeight,
		);
		expect(fillSpy).toHaveBeenCalledWith(HP_GAUGE_BRIGHT_COLOR);
	});

	it("clear後にコンテナの子が全て除去される", () => {
		const player = {
			position: { x: 3, y: 3 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.renderPlayer(player);

		expect(playerContainer.children.length).toBe(2);

		renderer.clear();

		expect(playerContainer.children.length).toBe(0);
	});
});
