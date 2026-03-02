/**
 * マップレンダラーのテスト（HPゲージ・ツールチップ）
 */

import "../test-utils/mapRendererTestSetup";
import { type FederatedPointerEvent, Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { CELL_SIZE } from "../constants";
import { createRendererTestMap } from "../test-utils/mapRendererTestSetup";
import { MapRenderer } from "./mapRenderer";

describe("MapRenderer HPゲージ", () => {
	it("miniboss敵のコンテナにHPゲージが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		// 敵コンテナ1つ
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPゲージ(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("boss敵のコンテナにHPゲージが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPゲージ(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("normal敵のコンテナにもHPゲージが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPゲージ(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("heavy敵のコンテナにもHPゲージが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPゲージ(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("scout敵のコンテナにもHPゲージが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPゲージ(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("HP減少が通常敵のHPゲージに反映される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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

		// HPゲージ描画: タイル全面のrect（幅=CELL_SIZE, 高さ=CELL_SIZE）
		// プレイヤー + 敵 = 2つの満タンゲージ
		const fullHpCalls = rectSpy.mock.calls.filter(
			(args) => args[2] === CELL_SIZE && args[3] === CELL_SIZE,
		);
		expect(fullHpCalls).toHaveLength(2);
		const fullGaugeHeight = CELL_SIZE;

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

		// ゲージの高さが HP比率 に応じて縮小（プレイヤーの満タンゲージを除外）
		const damagedCalls = rectSpy.mock.calls.filter(
			(args) => args[2] === CELL_SIZE && (args[3] as number) < CELL_SIZE,
		);
		expect(damagedCalls).toHaveLength(1);
		const damagedGaugeHeight = damagedCalls[0][3] as number;

		expect(damagedGaugeHeight).toBeLessThan(fullGaugeHeight);
		expect(damagedGaugeHeight).toBeCloseTo(CELL_SIZE * (1 / 3), 5);

		rectSpy.mockRestore();
	});

	it("clear後にコンテナがクリアされる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
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
		const enemiesContainer = container.children[3];
		expect(enemiesContainer.children.length).toBe(0);
	});
});

describe("MapRenderer プレイヤーHPゲージ", () => {
	it("render後にプレイヤーコンテナにHPゲージとスプライトが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		const playerContainer = renderer.getPlayerContainer();
		// HPゲージ(Graphics) + スプライト(Sprite) = 2
		expect(playerContainer.children.length).toBe(2);
		expect(playerContainer.children[0]).toBeInstanceOf(Graphics);
	});

	it("updatePlayerHpGaugeでプレイヤーゲージが更新される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		const playerContainer = renderer.getPlayerContainer();
		const gauge = playerContainer.children[0] as Graphics;

		const rectSpy = vi.spyOn(gauge, "rect");
		const fillSpy = vi.spyOn(gauge, "fill");

		renderer.updatePlayerHpGauge(0.5);

		const expectedHeight = CELL_SIZE * 0.5;
		const expectedY = CELL_SIZE - expectedHeight;
		expect(rectSpy).toHaveBeenCalledWith(
			0,
			expectedY,
			CELL_SIZE,
			expectedHeight,
		);
		expect(fillSpy).toHaveBeenCalled();
	});

	it("clear後にプレイヤーコンテナの子が全て除去される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);
		renderer.clear();

		const playerContainer = renderer.getPlayerContainer();
		expect(playerContainer.children.length).toBe(0);
	});
});

describe("MapRenderer 敵ホバーツールチップ", () => {
	it("敵コンテナのeventModeがstaticに設定される", () => {
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
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[3];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.eventMode).toBe("static");
	});

	it("敵コンテナにpointerover/pointeroutリスナーが登録される", () => {
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
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[3];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.listenerCount("pointerover")).toBe(1);
		expect(enemyContainer.listenerCount("pointerout")).toBe(1);
	});

	it("pointeroverでツールチップが表示されpointeroutで非表示になる", () => {
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
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const enemiesContainer = container.children[3];
		const enemyContainer = enemiesContainer.children[0];
		// 敵ツールチップは最上位から3番目（プレイヤー・タイルツールチップが上位）
		const tooltipContainer = container.children.at(-3);

		expect(tooltipContainer?.visible).toBe(false);
		enemyContainer.emit("pointerover", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(true);
		enemyContainer.emit("pointerout", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(false);
	});

	it("ツールチップコンテナがルートコンテナの上位に追加される", () => {
		const renderer = new MapRenderer();
		const container = renderer.getContainer();
		// 敵ツールチップ
		const enemyTooltip = container.children.at(-3);
		expect(enemyTooltip?.visible).toBe(false);
		expect(enemyTooltip?.eventMode).toBe("none");
		// プレイヤーツールチップ
		const playerTooltip = container.children.at(-2);
		expect(playerTooltip?.visible).toBe(false);
		expect(playerTooltip?.eventMode).toBe("none");
		// タイルツールチップ
		const tileTooltip = container.children.at(-1);
		expect(tileTooltip?.visible).toBe(false);
		expect(tileTooltip?.eventMode).toBe("none");
	});
});

describe("MapRenderer プレイヤーホバーツールチップ", () => {
	it("render後にプレイヤーコンテナのeventModeがstaticに設定される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
		};
		renderer.render(map, player, []);

		const playerContainer = renderer.getPlayerContainer();
		expect(playerContainer.eventMode).toBe("static");
	});

	it("プレイヤーコンテナにpointerover/pointeroutリスナーが登録される", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
		};
		renderer.render(map, player, []);

		const playerContainer = renderer.getPlayerContainer();
		expect(playerContainer.listenerCount("pointerover")).toBe(1);
		expect(playerContainer.listenerCount("pointerout")).toBe(1);
	});

	it("pointeroverでプレイヤーツールチップが表示されpointeroutで非表示になる", () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
		};
		renderer.render(map, player, []);

		const container = renderer.getContainer();
		const playerContainer = renderer.getPlayerContainer();
		const tooltipContainer = container.children.at(-2);

		expect(tooltipContainer?.visible).toBe(false);
		playerContainer.emit("pointerover", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(true);
		playerContainer.emit("pointerout", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(false);
	});
});
