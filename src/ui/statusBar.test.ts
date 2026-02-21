import { describe, expect, it, type Mock, vi } from "vitest";
import {
	createTweenMock,
	createTweenValueMock,
	mockEasing,
} from "../test-utils/mockTween";
import { findTextByPrefix, getTexts } from "../test-utils/pixiTestHelper";
import { tweenValue } from "../utils/tween";
import { StatusBar } from "./statusBar";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
	tweenValue: createTweenValueMock(),
}));

const mockTweenValue = tweenValue as Mock;

describe("StatusBar", () => {
	it("getContainerでContainerを返す", () => {
		const statusBar = new StatusBar();
		const container = statusBar.getContainer();
		expect(container).toBeDefined();
		// 4テキスト + 3バーGraphics（APのbg + ghost + fill） = 7
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
		statusBar.render(player, 5, "player");

		const container = statusBar.getContainer();

		expect(findTextByPrefix(container, "HP:").text).toBe("HP: 7/10");
		expect(findTextByPrefix(container, "AP:").text).toBe("AP: 2/3");
		expect(findTextByPrefix(container, "階層:").text).toBe("階層: 5");
	});

	it("renderでisCleared=trueの場合に階層に★が付与される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 20, "player", true);

		const container = statusBar.getContainer();

		expect(findTextByPrefix(container, "階層:").text).toBe("階層: 20 ★");
	});

	it("renderでプレイヤーターン表示が正しい", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		statusBar.render(player, 1, "player");

		const container = statusBar.getContainer();
		const turnText = findTextByPrefix(container, "あなた");
		expect(turnText.text).toBe("あなたのターン");
	});

	it("renderで敵ターン表示が正しい", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		statusBar.render(player, 1, "enemy");

		const container = statusBar.getContainer();
		const turnText = findTextByPrefix(container, "敵");
		expect(turnText.text).toBe("敵のターン");
	});

	it("renderでHP比率が正しく設定される", () => {
		const statusBar = new StatusBar();
		const player = {
			position: { x: 0, y: 0 },
			hp: 7,
			maxHp: 10,
			ap: 2,
			maxAp: 3,
		};
		statusBar.render(player, 5, "player");

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
		statusBar.render(player, 5, "player");

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
		statusBar.render(player, 5, "player");
		statusBar.clear();

		const container = statusBar.getContainer();
		const texts = getTexts(container);

		for (const t of texts) {
			expect(t.text).toBe("");
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
				"player",
			);

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.7);
			vi.useRealTimers();
		});

		it("HP増加時もバーが変化する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 5, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const promise = statusBar.animateHpChange(5, 8, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.8);
			vi.useRealTimers();
		});

		it("アニメーション中にHPテキストも補間更新される", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			const container = statusBar.getContainer();

			expect(findTextByPrefix(container, "HP:").text).toBe("HP: 7/10");
			vi.useRealTimers();
		});

		it("値が変化しない場合は即座に完了する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			await statusBar.animateHpChange(10, 10, 10);

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(1.0);
		});

		it("onHpUpdateコールバックが呼ばれる", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const onHpUpdate = vi.fn();
			const promise = statusBar.animateHpChange(10, 7, 10, onHpUpdate);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			// 初期値 + tweenのonUpdateで複数回呼ばれる
			expect(onHpUpdate).toHaveBeenCalled();
			// 初期呼び出しは fromRatio = 1.0
			expect(onHpUpdate.mock.calls[0][0]).toBeCloseTo(1.0);
			vi.useRealTimers();
		});

		it("tweenValueが1回だけ呼ばれる（HP減少時もゴーストバーなし）", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			mockTweenValue.mockClear();

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			// HPバーは削除されたのでtweenValueは1回（テキスト更新用）のみ
			expect(mockTweenValue).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});

	describe("animateApChange", () => {
		it("アニメーション完了後にAP比率が最終値に一致する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const promise = statusBar.animateApChange(3, 1, 3);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1 / 3);
			vi.useRealTimers();
		});

		it("AP減少時にフラッシュが発生する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const drawApBarSpy = vi.spyOn(statusBar, "drawApBar");

			const promise = statusBar.animateApChange(3, 1, 3);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			// フラッシュ色(0x88ccff)で呼ばれたことを確認
			const flashCalls = drawApBarSpy.mock.calls.filter(
				(call) => call[1] === 0x88ccff,
			);
			expect(flashCalls.length).toBeGreaterThan(0);

			vi.useRealTimers();
		});

		it("AP増加時にはフラッシュが発生しない", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 1, maxAp: 3 },
				1,
				"player",
			);

			const drawApBarSpy = vi.spyOn(statusBar, "drawApBar");

			const promise = statusBar.animateApChange(1, 3, 3);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			// フラッシュ色で呼ばれていないことを確認
			const flashCalls = drawApBarSpy.mock.calls.filter(
				(call) => call[1] !== undefined,
			);
			expect(flashCalls.length).toBe(0);

			vi.useRealTimers();
		});

		it("AP増加時もバーが変化する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 1, maxAp: 3 },
				1,
				"player",
			);

			await statusBar.animateApChange(1, 3, 3);

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1.0);
		});

		it("アニメーション中にAPテキストも補間更新される", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			const promise = statusBar.animateApChange(3, 1, 3);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			const container = statusBar.getContainer();

			expect(findTextByPrefix(container, "AP:").text).toBe("AP: 1/3");
			vi.useRealTimers();
		});

		it("値が変化しない場合は即座に完了する", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			await statusBar.animateApChange(3, 3, 3);

			expect(statusBar.getCurrentApRatio()).toBeCloseTo(1.0);
		});

		it("AP減少時にゴーストバーのtweenが追加で呼ばれる", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 3, maxAp: 3 },
				1,
				"player",
			);

			mockTweenValue.mockClear();

			const promise = statusBar.animateApChange(3, 1, 3);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			// ゴーストバー + メインバー = 2回呼ばれる
			expect(mockTweenValue).toHaveBeenCalledTimes(2);
			vi.useRealTimers();
		});

		it("AP増加時にゴーストバーのtweenは呼ばれない", async () => {
			const statusBar = new StatusBar();
			statusBar.render(
				{ position: { x: 0, y: 0 }, hp: 10, maxHp: 10, ap: 1, maxAp: 3 },
				1,
				"player",
			);

			mockTweenValue.mockClear();

			await statusBar.animateApChange(1, 3, 3);

			// メインバーのみ = 1回
			expect(mockTweenValue).toHaveBeenCalledTimes(1);
		});
	});
});
