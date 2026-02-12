import { describe, expect, it } from "vitest";
import { EnemyTooltip } from "./enemyTooltip";

describe("EnemyTooltip", () => {
	it("初期状態では非表示", () => {
		const tooltip = new EnemyTooltip();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("showで表示される", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e1",
			type: "normal" as const,
			position: { x: 1, y: 1 },
			hp: 2,
			maxHp: 3,
		};
		tooltip.show(enemy, 100, 100);
		expect(tooltip.isVisible()).toBe(true);
	});

	it("hideで非表示になる", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e1",
			type: "normal" as const,
			position: { x: 1, y: 1 },
			hp: 3,
			maxHp: 3,
		};
		tooltip.show(enemy, 100, 100);
		tooltip.hide();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("コンテナに背景とテキスト要素が含まれる", () => {
		const tooltip = new EnemyTooltip();
		const container = tooltip.getContainer();
		// bg(1) + typeText(1) + hpText(1) + atkText(1) = 4
		expect(container.children.length).toBe(4);
	});

	it("セルの上にツールチップが配置される", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e1",
			type: "normal" as const,
			position: { x: 1, y: 1 },
			hp: 3,
			maxHp: 3,
		};
		tooltip.show(enemy, 100, 200);
		const container = tooltip.getContainer();
		expect(container.y).toBeLessThan(200);
	});

	it("画面上端付近ではツールチップが敵の下側に配置される", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e1",
			type: "normal" as const,
			position: { x: 1, y: 0 },
			hp: 3,
			maxHp: 3,
		};
		tooltip.show(enemy, 100, 10);
		const container = tooltip.getContainer();
		expect(container.y).toBeGreaterThan(10);
	});

	it("boss敵でツールチップが表示される", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e-boss",
			type: "boss" as const,
			position: { x: 2, y: 2 },
			hp: 10,
			maxHp: 15,
		};
		tooltip.show(enemy, 200, 200);
		expect(tooltip.isVisible()).toBe(true);
	});
});
