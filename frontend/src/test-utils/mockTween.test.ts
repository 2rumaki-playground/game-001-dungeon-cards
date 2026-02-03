import { describe, expect, it } from "vitest";
import { createTweenMock, createTweenValueMock, mockEasing } from "./mockTween";

describe("mockEasing", () => {
	it("全イージング関数が線形（入力値をそのまま返す）", () => {
		for (const fn of Object.values(mockEasing)) {
			expect(fn(0)).toBe(0);
			expect(fn(0.5)).toBe(0.5);
			expect(fn(1)).toBe(1);
		}
	});
});

describe("createTweenMock", () => {
	it("alphaプロパティが即座に適用される", async () => {
		const tweenMock = createTweenMock();
		const target = { alpha: 0 };
		await tweenMock(target, { alpha: 1 });
		expect(target.alpha).toBe(1);
	});

	it("x, yプロパティが即座に適用される", async () => {
		const tweenMock = createTweenMock();
		const target = { x: 0, y: 0 };
		await tweenMock(target, { x: 100, y: 200 });
		expect(target.x).toBe(100);
		expect(target.y).toBe(200);
	});

	it("scaleX, scaleYプロパティがscaleオブジェクトに適用される", async () => {
		const tweenMock = createTweenMock();
		const target = { scale: { x: 1, y: 1 } };
		await tweenMock(target, { scaleX: 2, scaleY: 3 });
		expect(target.scale.x).toBe(2);
		expect(target.scale.y).toBe(3);
	});

	it("rotationプロパティが即座に適用される", async () => {
		const tweenMock = createTweenMock();
		const target = { rotation: 0 };
		await tweenMock(target, { rotation: Math.PI });
		expect(target.rotation).toBe(Math.PI);
	});

	it("onUpdateがprogress=1で呼び出される", async () => {
		const tweenMock = createTweenMock();
		let progress = -1;
		await tweenMock(
			{},
			{},
			{
				onUpdate: (p) => {
					progress = p;
				},
			},
		);
		expect(progress).toBe(1);
	});

	it("Promiseを返す", () => {
		const tweenMock = createTweenMock();
		const result = tweenMock({}, {});
		expect(result).toBeInstanceOf(Promise);
	});
});

describe("createTweenValueMock", () => {
	it("onUpdateがprogress=1で呼び出される", async () => {
		const tweenValueMock = createTweenValueMock();
		let progress = -1;
		await tweenValueMock({
			onUpdate: (p) => {
				progress = p;
			},
		});
		expect(progress).toBe(1);
	});

	it("Promiseを返す", () => {
		const tweenValueMock = createTweenValueMock();
		const result = tweenValueMock();
		expect(result).toBeInstanceOf(Promise);
	});
});
