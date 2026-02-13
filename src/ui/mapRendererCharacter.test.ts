/**
 * マップレンダラーのテスト（キャラクター描画・撃破アニメーション）
 */

import { describe, expect, it } from "vitest";
import {
	createRendererTestMap,
	tickerMock,
} from "../test-utils/mapRendererTestSetup";
import { MapRenderer } from "./mapRenderer";

describe("MapRenderer タイプ別敵描画", () => {
	it("Normal敵が描画できる", async () => {
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Heavy敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const enemies = [
			{
				id: "e-heavy",
				position: { x: 2, y: 2 },
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
	});

	it("Scout敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 3, y: 3 },
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
	});

	it("Miniboss敵が描画できる", async () => {
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
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ（内部にSprite + HPバー）
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Boss敵が描画できる", async () => {
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
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ（内部にSprite + HPバー）
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("全タイプの敵が同時に描画できる", async () => {
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
			{
				id: "e-heavy",
				position: { x: 2, y: 2 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
			},
			{
				id: "e-scout",
				position: { x: 3, y: 3 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
			},
			{
				id: "e-miniboss",
				position: { x: 4, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
			},
			{
				id: "e-boss",
				position: { x: 4, y: 2 },
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
		// 5体 = 5つの敵コンテナ
		expect(enemiesContainer.children.length).toBe(5);
	});

	it("Heavy敵の撃破アニメーションが正常に完了する", async () => {
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

		await expect(
			renderer.animateEnemyDefeat("e-heavy"),
		).resolves.toBeUndefined();
	});

	it("Scout敵の攻撃ヒットアニメーションが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createRendererTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 1, y: 0 },
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

		const promise = renderer.animateAttackHit("e-scout", 1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
	});
});

describe("MapRenderer 敵撃破アニメーション", () => {
	it("animateEnemyDefeatが正常に完了する", async () => {
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

		await expect(renderer.animateEnemyDefeat("e1")).resolves.toBeUndefined();
	});

	it("撃破アニメーション完了後に敵コンテナが削除される", async () => {
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

		// enemiesContainerに敵コンテナが存在すること
		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);

		await renderer.animateEnemyDefeat("e1");

		// 撃破後、敵コンテナが削除されていること
		expect(enemiesContainer.children.length).toBe(0);
	});

	it("Miniboss敵の撃破アニメーション完了後にコンテナごと削除される", async () => {
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);

		await renderer.animateEnemyDefeat("e-miniboss");

		// 撃破後、敵コンテナが削除されていること
		expect(enemiesContainer.children.length).toBe(0);
	});

	it("存在しない敵IDでanimateEnemyDefeatを呼んでもエラーにならない", async () => {
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

		await expect(
			renderer.animateEnemyDefeat("nonexistent"),
		).resolves.toBeUndefined();
	});
});
