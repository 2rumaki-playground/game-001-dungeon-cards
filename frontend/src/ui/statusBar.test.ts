import { describe, expect, it, vi } from "vitest";
import { StatusBar } from "./statusBar";

// tween をモック化（即座にresolve、onUpdateをprogress=1で呼び出し）
vi.mock("../utils/tween", () => ({
	Easing: {
		easeOut: (t: number) => t,
	},
	tween: vi.fn(
		(
			_target: unknown,
			_to: unknown,
			options?: { onUpdate?: (p: number) => void },
		) => {
			options?.onUpdate?.(1);
			return Promise.resolve();
		},
	),
}));

describe("StatusBar", () => {
	it("getContainerでContainerを返す", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();
		expect(container).toBeDefined();
		// 3テキスト + 4バーGraphics = 7
		expect(container.children.length).toBe(7);
	});

	it("renderでHP・AP・階層が正しく表示される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		const container = statusBar.getContainer();
		const texts = container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		);

		const hpText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("HP:"),
		) as unknown as { text: string };
		const apText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("AP:"),
		) as unknown as { text: string };
		const floorText = texts.find((t) =>
			((t as unknown as { text: string }).text as string).startsWith("階層:"),
		) as unknown as { text: string };

		expect(hpText.text).toBe("HP: 7/10");
		expect(apText.text).toBe("AP: 2/3");
		expect(floorText.text).toBe("階層: 5");
	});

	it("renderでHPバーが正しい比率で描画される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.7);
	});

	it("renderでAPバーが正しい比率で描画される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);

		expect(statusBar.getCurrentApRatio()).toBeCloseTo(2 / 3);
	});

	it("clearでテキストとバーがクリアされる", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5);
		statusBar.clear();

		const container = statusBar.getContainer();
		const texts = container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		);

		for (const t of texts) {
			expect((t as unknown as { text: string }).text).toBe("");
		}

		expect(statusBar.getCurrentHpRatio()).toBe(0);
		expect(statusBar.getCurrentApRatio()).toBe(0);
	});

	it("show/hideで表示・非表示を切り替え", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();

		statusBar.hide();
		expect(container.visible).toBe(false);

		statusBar.show();
		expect(container.visible).toBe(true);
	});

	describe("animateHpChange", () => {
		it("アニメーション完了後にHP比率が最終値に一致する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
			);

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.7);
			vi.useRealTimers();
		});

		it("HP増加時はフラッシュなしでバーが変化する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 5, maxHp: 10, ap: 3, maxAp: 3 },
				1,
			);

			const promise = statusBar.animateHpChange(5, 8, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.8);
			vi.useRealTimers();
		});

		it("値が変化しない場合は即座に完了する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
			);

			await statusBar.animateHpChange(10, 10, 10);

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(1.0);
		});
	});

	describe("animateApChange", () => {
		it("アニメーション完了後にAP比率が最終値に一致する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
			);

			await statusBar.animateApChange(3, 1, 3);

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1 / 3);
		});

		it("AP増加時もバーが変化する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 1, maxAp: 3 },
				1,
			);

			await statusBar.animateApChange(1, 3, 3);

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1.0);
		});

		it("値が変化しない場合は即座に完了する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
			);

			await statusBar.animateApChange(3, 3, 3);

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1.0);
		});
	});
});
