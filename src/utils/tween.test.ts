import { describe, expect, it, vi } from "vitest";
import { createTickerMock } from "../test-utils/mockPixi";

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

import { Easing, tween } from "./tween";

describe("tween", () => {
	it("onUpdateにeased progressが渡される", async () => {
		tickerMock.reset();

		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		const receivedValues: number[] = [];
		// quadratic ease-in: t^2
		const easing = (t: number) => t * t;

		const promise = tween(
			target,
			{ x: 100 },
			{
				duration: 100,
				easing,
				onUpdate: (p) => {
					receivedValues.push(p);
				},
			},
		);

		// Tickerに登録されたupdate関数を取得
		expect(tickerMock.shared.add).toHaveBeenCalledTimes(1);
		const updateFn = tickerMock.callbacks[0];

		// 50ms経過をシミュレート（progress=0.5, eased=0.25）
		updateFn({ deltaMS: 50 });
		// 50ms追加経過（合計100ms, progress=1.0, eased=1.0）
		updateFn({ deltaMS: 50 });

		await promise;

		// eased progressが渡されていること
		expect(receivedValues).toHaveLength(2);
		// progress=0.5 → eased=0.5^2=0.25
		expect(receivedValues[0]).toBeCloseTo(0.25);
		// progress=1.0 → eased=1.0^2=1.0
		expect(receivedValues[1]).toBe(1);
	});

	it("duration=0の場合onUpdateに1が渡される", async () => {
		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		let receivedProgress = -1;
		await tween(
			target,
			{ x: 100 },
			{
				duration: 0,
				onUpdate: (p) => {
					receivedProgress = p;
				},
			},
		);

		expect(receivedProgress).toBe(1);
	});

	it("signal abort済みの場合、Tickerに登録されずresolveする", async () => {
		tickerMock.reset();

		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		const controller = new AbortController();
		controller.abort();

		const onComplete = vi.fn();
		await tween(
			target,
			{ x: 100 },
			{ duration: 100, signal: controller.signal, onComplete },
		);

		expect(tickerMock.shared.add).not.toHaveBeenCalled();
		expect(onComplete).not.toHaveBeenCalled();
		expect(target.x).toBe(0);
	});

	it("実行中にsignal abortでTickerからremoveされonCompleteが呼ばれない", async () => {
		tickerMock.reset();

		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		const controller = new AbortController();
		const onComplete = vi.fn();

		const promise = tween(
			target,
			{ x: 100 },
			{ duration: 100, signal: controller.signal, onComplete },
		);

		expect(tickerMock.shared.add).toHaveBeenCalledTimes(1);
		const updateFn = tickerMock.callbacks[0];

		// 50ms経過（途中）
		updateFn({ deltaMS: 50 });

		// abort
		controller.abort();

		// abort後のupdate呼び出しは無視される
		updateFn({ deltaMS: 50 });

		await promise;

		expect(tickerMock.shared.remove).toHaveBeenCalledWith(updateFn);
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("onUpdate内でabortした場合、同フレームでonCompleteが呼ばれない", async () => {
		tickerMock.reset();

		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		const controller = new AbortController();
		const onComplete = vi.fn();

		const promise = tween(
			target,
			{ x: 100 },
			{
				duration: 100,
				signal: controller.signal,
				onComplete,
				onUpdate: (progress) => {
					// progress>=1のフレームでabort
					if (progress >= 1) {
						controller.abort();
					}
				},
			},
		);

		const updateFn = tickerMock.callbacks[0];

		// 100ms一気に経過（progress=1.0到達フレーム）
		updateFn({ deltaMS: 100 });

		await promise;

		// onUpdate内でabortしたため、onCompleteは呼ばれない
		expect(onComplete).not.toHaveBeenCalled();
		expect(tickerMock.shared.remove).toHaveBeenCalled();
	});

	it("デフォルトのイージングでもeased progressが渡される", async () => {
		tickerMock.reset();

		const target = {
			x: 0,
			y: 0,
			alpha: 1,
			scale: { x: 1, y: 1 },
			rotation: 0,
		};

		const receivedValues: number[] = [];

		const promise = tween(
			target,
			{ x: 100 },
			{
				duration: 100,
				easing: Easing.easeOut,
				onUpdate: (p) => {
					receivedValues.push(p);
				},
			},
		);

		const updateFn = tickerMock.callbacks[0];
		// 50ms経過（progress=0.5, easeOut(0.5)=0.75）
		updateFn({ deltaMS: 50 });
		// 残り50ms
		updateFn({ deltaMS: 50 });

		await promise;

		// easeOut(0.5) = 1 - (1 - 0.5)^2 = 1 - 0.25 = 0.75
		expect(receivedValues[0]).toBeCloseTo(0.75);
		expect(receivedValues[1]).toBe(1);
	});
});
