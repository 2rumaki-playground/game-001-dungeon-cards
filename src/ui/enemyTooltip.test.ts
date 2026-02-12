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

	it("激昂状態の敵は攻撃力にボーナスが加算される", () => {
		const tooltip = new EnemyTooltip();
		const enemy = {
			id: "e-boss",
			type: "boss" as const,
			position: { x: 2, y: 2 },
			hp: 10,
			maxHp: 15,
			enraged: true,
		};
		tooltip.show(enemy, 200, 200);
		// boss attackDamage(3) + enrageBonusDamage(2) = 5
		const container = tooltip.getContainer();
		const atkText = container.children[3] as import("pixi.js").Text;
		expect(atkText.text).toBe("ATK: 5");
	});

	describe("ビューポートクランプ", () => {
		// bgWidth = max(80, 0...) + 6*2 = 92（テスト環境ではText.widthは0）
		// bgHeight = 16*3 + 6*2 = 60
		const bgWidth = 92;

		const enemy = {
			id: "e1",
			type: "normal" as const,
			position: { x: 1, y: 1 },
			hp: 3,
			maxHp: 3,
		};

		it("右端ではみ出さないようにクランプされる", () => {
			const tooltip = new EnemyTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show(enemy, 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			// maxScreenX = 400 - 92 = 308
			expect(container.x).toBe(400 - bgWidth);
		});

		it("左端でクランプされる", () => {
			const tooltip = new EnemyTooltip();
			const viewport = { width: 400, height: 400 };
			// カメラが-100オフセット → screenX = 50 + (-100) = -50 → clamp to 0
			const transform = { x: -100, y: 0, scale: 1 };
			tooltip.show(enemy, 50, 200, viewport, transform);
			const container = tooltip.getContainer();
			// clampedScreenX = 0, tooltipX = (0 - (-100)) / 1 = 100
			expect(container.x).toBe(100);
		});

		it("下端でクランプされる", () => {
			const tooltip = new EnemyTooltip();
			// 高さ120px: 上側に収まらず下側に出すが、下端も超える
			const viewport = { width: 400, height: 120 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show(enemy, 100, 10, viewport, transform);
			const container = tooltip.getContainer();
			// screenY=10, above=10-60-4=-54<0 → below=10+64+4=78
			// maxTooltipScreenY=120-60=60, 78>60 → clamp to 60
			expect(container.y).toBe(60);
		});

		it("scale!=1でもクランプが正しく機能する", () => {
			const tooltip = new EnemyTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 2 };
			tooltip.show(enemy, 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			// screenX=350*2=700, screenBgWidth=92*2=184
			// maxScreenX=400-184=216, clamp 700→216
			// tooltipX=216/2=108
			expect(container.x).toBe(108);
		});
	});
});
