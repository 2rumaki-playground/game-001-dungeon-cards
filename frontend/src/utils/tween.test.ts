import { describe, expect, it, vi } from "vitest";

// Ticker.sharedをモック化（vi.hoistedでvi.mock内から参照可能にする）
const { mockTickerAdd, mockTickerRemove } = vi.hoisted(() => ({
	mockTickerAdd: vi.fn(),
	mockTickerRemove: vi.fn(),
}));
vi.mock("pixi.js", () => ({
	Ticker: {
		shared: {
			add: mockTickerAdd,
			remove: mockTickerRemove,
		},
	},
}));

import { Easing, tween } from "./tween";

describe("tween", () => {
	it("onUpdateにeased progressが渡される", async () => {
		mockTickerAdd.mockClear();
		mockTickerRemove.mockClear();

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
		expect(mockTickerAdd).toHaveBeenCalledTimes(1);
		const updateFn = mockTickerAdd.mock.calls[0][0];

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

	it("デフォルトのイージングでもeased progressが渡される", async () => {
		mockTickerAdd.mockClear();
		mockTickerRemove.mockClear();

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

		const updateFn = mockTickerAdd.mock.calls[0][0];
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
