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
		// 1テキスト（階層のみ）
		expect(container.children.length).toBe(1);
	});

	it("renderで階層が正しく表示される", () => {
		const statusBar = new StatusBar();
		statusBar.render(5);

		const container = statusBar.getContainer();

		expect(findTextByPrefix(container, "階層:").text).toBe("階層: 5");
	});

	it("renderでisCleared=trueの場合に階層に★が付与される", () => {
		const statusBar = new StatusBar();
		statusBar.render(20, true);

		const container = statusBar.getContainer();

		expect(findTextByPrefix(container, "階層:").text).toBe("階層: 20 ★");
	});

	it("clearでテキストがクリアされる", () => {
		const statusBar = new StatusBar();
		statusBar.render(5);
		statusBar.clear();

		const container = statusBar.getContainer();
		const texts = getTexts(container);

		for (const t of texts) {
			expect(t.text).toBe("");
		}

		expect(statusBar.getCurrentHpRatio()).toBe(0);
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

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.7);
			vi.useRealTimers();
		});

		it("HP増加時もHP比率が変化する", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();

			const promise = statusBar.animateHpChange(5, 8, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0.8);
			vi.useRealTimers();
		});

		it("値が変化しない場合は即座に完了する", async () => {
			const statusBar = new StatusBar();

			await statusBar.animateHpChange(10, 10, 10);

			expect(statusBar.getCurrentHpRatio()).toBeCloseTo(0);
		});

		it("onHpUpdateコールバックが呼ばれる", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();

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

		it("tweenValueが1回だけ呼ばれる", async () => {
			vi.useFakeTimers();
			const statusBar = new StatusBar();

			mockTweenValue.mockClear();

			const promise = statusBar.animateHpChange(10, 7, 10);
			await vi.advanceTimersByTimeAsync(1000);
			await promise;

			expect(mockTweenValue).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});
});
