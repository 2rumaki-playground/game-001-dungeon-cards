import { describe, expect, it } from "vitest";
import { TRAP_DAMAGE } from "../constants";
import { TileTooltip } from "./tileTooltip";

describe("TileTooltip", () => {
	it("初期状態では非表示", () => {
		const tooltip = new TileTooltip();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("showで表示される", () => {
		const tooltip = new TileTooltip();
		tooltip.show("trap", 100, 100);
		expect(tooltip.isVisible()).toBe(true);
	});

	it("hideで非表示になる", () => {
		const tooltip = new TileTooltip();
		tooltip.show("trap", 100, 100);
		tooltip.hide();
		expect(tooltip.isVisible()).toBe(false);
	});

	it("floor では表示されない", () => {
		const tooltip = new TileTooltip();
		tooltip.show("floor", 100, 100);
		expect(tooltip.isVisible()).toBe(false);
	});

	it("wall では表示されない", () => {
		const tooltip = new TileTooltip();
		tooltip.show("wall", 100, 100);
		expect(tooltip.isVisible()).toBe(false);
	});

	it("コンテナに背景と2つのテキスト要素が含まれる", () => {
		const tooltip = new TileTooltip();
		const container = tooltip.getContainer();
		// bg(1) + nameText(1) + effectText(1) = 3
		expect(container.children.length).toBe(3);
	});

	describe("タイル種別ごとのテキスト", () => {
		it("trap のテキストが正しい", () => {
			const tooltip = new TileTooltip();
			tooltip.show("trap", 100, 100);
			const container = tooltip.getContainer();
			const nameText = container.children[1] as import("pixi.js").Text;
			const effectText = container.children[2] as import("pixi.js").Text;
			expect(nameText.text).toBe("罠タイル");
			expect(effectText.text).toBe(`${TRAP_DAMAGE}ダメージを受ける`);
		});

		it("chest_common のテキストが正しい", () => {
			const tooltip = new TileTooltip();
			tooltip.show("chest_common", 100, 100);
			const container = tooltip.getContainer();
			const nameText = container.children[1] as import("pixi.js").Text;
			const effectText = container.children[2] as import("pixi.js").Text;
			expect(nameText.text).toBe("宝箱（普通）");
			expect(effectText.text).toBe("回復またはスクロール");
		});

		it("chest_rare のテキストが正しい", () => {
			const tooltip = new TileTooltip();
			tooltip.show("chest_rare", 100, 100);
			const container = tooltip.getContainer();
			const nameText = container.children[1] as import("pixi.js").Text;
			const effectText = container.children[2] as import("pixi.js").Text;
			expect(nameText.text).toBe("宝箱（レア）");
			expect(effectText.text).toBe("回復またはスクロール");
		});

		it("chest_epic のテキストが正しい", () => {
			const tooltip = new TileTooltip();
			tooltip.show("chest_epic", 100, 100);
			const container = tooltip.getContainer();
			const nameText = container.children[1] as import("pixi.js").Text;
			const effectText = container.children[2] as import("pixi.js").Text;
			expect(nameText.text).toBe("宝箱（エピック）");
			expect(effectText.text).toBe("回復またはスクロール");
		});

		it("stairs のテキストが正しい", () => {
			const tooltip = new TileTooltip();
			tooltip.show("stairs", 100, 100);
			const container = tooltip.getContainer();
			const nameText = container.children[1] as import("pixi.js").Text;
			const effectText = container.children[2] as import("pixi.js").Text;
			expect(nameText.text).toBe("階段");
			expect(effectText.text).toBe("次の階層へ進む");
		});
	});

	it("セルの上にツールチップが配置される", () => {
		const tooltip = new TileTooltip();
		tooltip.show("trap", 100, 200);
		const container = tooltip.getContainer();
		expect(container.y).toBeLessThan(200);
	});

	it("画面上端付近ではタイルの下側に配置される", () => {
		const tooltip = new TileTooltip();
		tooltip.show("trap", 100, 10);
		const container = tooltip.getContainer();
		expect(container.y).toBeGreaterThan(10);
	});

	describe("updatePosition", () => {
		it("表示中は座標のみ更新される", () => {
			const tooltip = new TileTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show("trap", 100, 200, viewport, transform);
			const container = tooltip.getContainer();
			const initialX = container.x;

			tooltip.updatePosition(200, 200, viewport, transform);
			expect(container.x).not.toBe(initialX);
			expect(tooltip.isVisible()).toBe(true);
		});

		it("非表示時は何もしない", () => {
			const tooltip = new TileTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.updatePosition(200, 200, viewport, transform);
			expect(tooltip.isVisible()).toBe(false);
		});
	});

	describe("ビューポートクランプ", () => {
		// bgWidth = max(80, 0, 0) + 6*2 = 92（テスト環境ではText.widthは0）
		const bgWidth = 92;

		it("右端ではみ出さないようにクランプされる", () => {
			const tooltip = new TileTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 1 };
			tooltip.show("trap", 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			expect(container.x).toBe(400 - bgWidth);
		});

		it("左端でクランプされる", () => {
			const tooltip = new TileTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: -100, y: 0, scale: 1 };
			tooltip.show("trap", 50, 200, viewport, transform);
			const container = tooltip.getContainer();
			expect(container.x).toBe(100);
		});

		it("scale!=1でもクランプが正しく機能する", () => {
			const tooltip = new TileTooltip();
			const viewport = { width: 400, height: 400 };
			const transform = { x: 0, y: 0, scale: 2 };
			tooltip.show("trap", 350, 200, viewport, transform);
			const container = tooltip.getContainer();
			// screenX=350*2=700, screenBgWidth=92*2=184
			// maxScreenX=400-184=216, clamp 700→216
			// tooltipX=216/2=108
			expect(container.x).toBe(108);
		});
	});
});
