import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTickerMock } from "../test-utils/mockPixi";
import type { Enemy } from "../types";

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

import { SkillForecastEffectManager } from "./skillForecastEffect";

function createEnemy(
	overrides: Partial<Enemy> & { id: string; position: Enemy["position"] },
): Enemy {
	return {
		type: "boss",
		hp: 10,
		maxHp: 10,
		...overrides,
	};
}

describe("SkillForecastEffectManager", () => {
	beforeEach(() => {
		tickerMock.reset();
	});

	it("getRangeContainer()がContainerを返す", () => {
		const manager = new SkillForecastEffectManager();
		expect(manager.getRangeContainer()).toBeDefined();
	});

	it("getIconContainer()がContainerを返す", () => {
		const manager = new SkillForecastEffectManager();
		expect(manager.getIconContainer()).toBeDefined();
	});

	it("update()でpendingSkill付き敵を渡すとTickerに登録される", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		expect(tickerMock.callbacks).toHaveLength(1);
	});

	it("update()で空配列を渡すとTickerが解除される", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		expect(tickerMock.callbacks).toHaveLength(1);

		manager.update([], 11, 11);
		expect(tickerMock.callbacks).toHaveLength(0);
	});

	it("update()を複数回呼んでもTickerコールバックは1つだけ", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		manager.update(enemies, 11, 11);
		expect(tickerMock.callbacks).toHaveLength(1);
	});

	it("update()でvisitedTilesが指定された場合、未訪問タイルの範囲はスキップされる", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		// 敵位置のみ訪問済み
		const visited = new Set(["5,5"]);
		manager.update(enemies, 11, 11, visited);

		// Tickerが登録されている（敵が見えているので）
		expect(tickerMock.callbacks).toHaveLength(1);
		expect(manager.getEffectCount()).toBe(1);
	});

	it("update()でvisitedTilesに敵位置が含まれない場合エフェクトなし", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		const visited = new Set(["0,0"]);
		manager.update(enemies, 11, 11, visited);
		expect(tickerMock.callbacks).toHaveLength(0);
		expect(manager.getEffectCount()).toBe(0);
	});

	it("pendingSkillなしの敵はエフェクト対象外", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [createEnemy({ id: "boss1", position: { x: 5, y: 5 } })];
		manager.update(enemies, 11, 11);
		expect(tickerMock.callbacks).toHaveLength(0);
		expect(manager.getEffectCount()).toBe(0);
	});

	it("複数のpendingSkill付き敵がある場合、全てのエフェクトが作成される", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "miniboss1",
				type: "miniboss",
				position: { x: 3, y: 3 },
				pendingSkill: { type: "power_strike" },
			}),
			createEnemy({
				id: "boss1",
				position: { x: 7, y: 7 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		expect(manager.getEffectCount()).toBe(2);
	});

	it("clear()でTickerコールバックが解除される", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		expect(tickerMock.callbacks).toHaveLength(1);

		manager.clear();
		expect(tickerMock.callbacks).toHaveLength(0);
	});

	it("clear()後にgetEffectCount()が0を返す", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);
		expect(manager.getEffectCount()).toBeGreaterThan(0);

		manager.clear();
		expect(manager.getEffectCount()).toBe(0);
	});

	it("Tickerコールバック実行後もコンテナに子要素が存在する", () => {
		const manager = new SkillForecastEffectManager();
		const enemies = [
			createEnemy({
				id: "boss1",
				position: { x: 5, y: 5 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies, 11, 11);

		// 1フレーム進める
		tickerMock.tick(16);

		expect(manager.getRangeContainer().children.length).toBeGreaterThanOrEqual(
			1,
		);
		expect(manager.getIconContainer().children.length).toBeGreaterThanOrEqual(
			1,
		);
	});

	it("敵が消えた場合エフェクトが減る", () => {
		const manager = new SkillForecastEffectManager();
		const enemies2 = [
			createEnemy({
				id: "miniboss1",
				type: "miniboss",
				position: { x: 3, y: 3 },
				pendingSkill: { type: "power_strike" },
			}),
			createEnemy({
				id: "boss1",
				position: { x: 7, y: 7 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies2, 11, 11);
		expect(manager.getEffectCount()).toBe(2);

		const enemies1 = [
			createEnemy({
				id: "boss1",
				position: { x: 7, y: 7 },
				pendingSkill: { type: "area_attack" },
			}),
		];
		manager.update(enemies1, 11, 11);
		expect(manager.getEffectCount()).toBe(1);
	});
});
