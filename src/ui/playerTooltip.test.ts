import { describe, expect, it } from "vitest";
import { PlayerTooltip } from "./playerTooltip";

describe("PlayerTooltip", () => {
	it("初期状態では非表示", () => {
		const tooltip = new PlayerTooltip();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("showで表示される", () => {
		const tooltip = new PlayerTooltip();
		const player = {
			position: { x: 1, y: 1 },
			hp: 7,
			maxHp: 10,
		};
		tooltip.show(player, 100, 100);
		expect(tooltip.isVisible()).toBe(true);
	});

	it("hideで非表示になる", () => {
		const tooltip = new PlayerTooltip();
		const player = {
			position: { x: 1, y: 1 },
			hp: 10,
			maxHp: 10,
		};
		tooltip.show(player, 100, 100);
		tooltip.hide();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("コンテナに背景とテキスト要素が含まれる", () => {
		const tooltip = new PlayerTooltip();
		const container = tooltip.getContainer();
		// bg(1) + hpText(1) = 2
		expect(container.children.length).toBe(2);
	});

	it("HP表示が正しい", () => {
		const tooltip = new PlayerTooltip();
		const player = {
			position: { x: 1, y: 1 },
			hp: 7,
			maxHp: 10,
		};
		tooltip.show(player, 100, 100);
		const container = tooltip.getContainer();
		const hpText = container.children[1] as import("pixi.js").Text;
		expect(hpText.text).toBe("HP: 7/10");
	});

	it("セルの上にツールチップが配置される", () => {
		const tooltip = new PlayerTooltip();
		const player = {
			position: { x: 1, y: 1 },
			hp: 10,
			maxHp: 10,
		};
		tooltip.show(player, 100, 200);
		const container = tooltip.getContainer();
		expect(container.y).toBeLessThan(200);
	});

	it("画面上端付近ではツールチップがプレイヤーの下側に配置される", () => {
		const tooltip = new PlayerTooltip();
		const player = {
			position: { x: 1, y: 0 },
			hp: 10,
			maxHp: 10,
		};
		tooltip.show(player, 100, 10);
		const container = tooltip.getContainer();
		expect(container.y).toBeGreaterThan(10);
	});

	describe("updatePosition", () => {
		const player = {
			position: { x: 1, y: 1 },
			hp: 10,
			maxHp: 10,
		};

		it("表示中は座標のみ更新される", () => {
			const tooltip = new PlayerTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show(player, 100, 200, viewport, transform);
			const container = tooltip.getContainer();
			const initialX = container.x;

			tooltip.updatePosition(200, 200, viewport, transform);
			expect(container.x).not.toBe(initialX);
			expect(tooltip.isVisible()).toBe(true);
		});

		it("非表示時は何もしない", () => {
			const tooltip = new PlayerTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.updatePosition(200, 200, viewport, transform);
			expect(tooltip.isVisible()).toBe(false);
		});
	});

	describe("ビューポートクランプ", () => {
		// bgWidth = max(80, 0...) + 6*2 = 92（テスト環境ではText.widthは0）
		const bgWidth = 92;

		const player = {
			position: { x: 1, y: 1 },
			hp: 10,
			maxHp: 10,
		};

		it("右端ではみ出さないようにクランプされる", () => {
			const tooltip = new PlayerTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show(player, 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			expect(container.x).toBe(400 - bgWidth);
		});

		it("左端でクランプされる", () => {
			const tooltip = new PlayerTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: -100, y: 0, scale: 1 };
			tooltip.show(player, 50, 200, viewport, transform);
			const container = tooltip.getContainer();
			expect(container.x).toBe(100);
		});

		it("下端でクランプされる", () => {
			const tooltip = new PlayerTooltip();
			// bgHeight = 16*1 + 6*2 = 28
			// 高さ50px: 上側に収まらず下側に出すが、下端も超える
			const viewport = { width: 400, height: 50 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show(player, 100, 10, viewport, transform);
			const container = tooltip.getContainer();
			// screenY=10, above=10-28-4=-22<0 → below=10+64+4=78
			// maxTooltipScreenY=50-28=22, 78>22 → clamp to 22
			expect(container.y).toBe(22);
		});

		it("scale!=1でもクランプが正しく機能する", () => {
			const tooltip = new PlayerTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 2 };
			tooltip.show(player, 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			// screenX=350*2=700, screenBgWidth=92*2=184
			// maxScreenX=400-184=216, clamp 700→216
			// tooltipX=216/2=108
			expect(container.x).toBe(108);
		});
	});
});
