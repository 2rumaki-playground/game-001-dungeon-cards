import { describe, expect, it } from "vitest";
import { RNG } from "./rng";

describe("RNG", () => {
	describe("constructor", () => {
		it("シード指定時はそのシードを使用", () => {
			const rng = new RNG(12345);
			expect(rng.seed).toBe(12345);
		});

		it("シード未指定時はランダムなシードを生成", () => {
			const rng1 = new RNG();
			const rng2 = new RNG();
			// 異なるシードが生成される（確率的に）
			expect(rng1.seed).not.toBe(rng2.seed);
		});
	});

	describe("random", () => {
		it("0以上1未満の値を返す", () => {
			const rng = new RNG(12345);
			for (let i = 0; i < 100; i++) {
				const value = rng.random();
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThan(1);
			}
		});

		it("同一シードで同一の乱数列を生成", () => {
			const rng1 = new RNG(12345);
			const rng2 = new RNG(12345);

			for (let i = 0; i < 10; i++) {
				expect(rng1.random()).toBe(rng2.random());
			}
		});

		it("異なるシードで異なる乱数列を生成", () => {
			const rng1 = new RNG(12345);
			const rng2 = new RNG(54321);

			const values1 = Array.from({ length: 10 }, () => rng1.random());
			const values2 = Array.from({ length: 10 }, () => rng2.random());

			expect(values1).not.toEqual(values2);
		});
	});

	describe("randomInt", () => {
		it("指定範囲内の整数を返す", () => {
			const rng = new RNG(12345);
			for (let i = 0; i < 100; i++) {
				const value = rng.randomInt(5, 10);
				expect(value).toBeGreaterThanOrEqual(5);
				expect(value).toBeLessThan(10);
				expect(Number.isInteger(value)).toBe(true);
			}
		});
	});

	describe("shuffle", () => {
		it("元の配列を変更しない", () => {
			const rng = new RNG(12345);
			const original = [1, 2, 3, 4, 5];
			const originalCopy = [...original];
			rng.shuffle(original);
			expect(original).toEqual(originalCopy);
		});

		it("同じ要素を含む配列を返す", () => {
			const rng = new RNG(12345);
			const original = [1, 2, 3, 4, 5];
			const shuffled = rng.shuffle(original);
			expect(shuffled.sort()).toEqual(original.sort());
		});

		it("同一シードで同一のシャッフル結果", () => {
			const rng1 = new RNG(12345);
			const rng2 = new RNG(12345);
			const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

			expect(rng1.shuffle(array)).toEqual(rng2.shuffle(array));
		});
	});

	describe("pick", () => {
		it("配列から1つの要素を返す", () => {
			const rng = new RNG(12345);
			const array = [1, 2, 3, 4, 5];
			const picked = rng.pick(array);
			expect(array).toContain(picked);
		});

		it("空配列でエラー", () => {
			const rng = new RNG(12345);
			expect(() => rng.pick([])).toThrow("Cannot pick from empty array");
		});
	});

	describe("sample", () => {
		it("指定個数の要素を返す", () => {
			const rng = new RNG(12345);
			const array = [1, 2, 3, 4, 5];
			const sampled = rng.sample(array, 3);
			expect(sampled.length).toBe(3);
		});

		it("重複なしで選択", () => {
			const rng = new RNG(12345);
			const array = [1, 2, 3, 4, 5];
			const sampled = rng.sample(array, 5);
			const unique = new Set(sampled);
			expect(unique.size).toBe(5);
		});

		it("配列長を超える個数でエラー", () => {
			const rng = new RNG(12345);
			const array = [1, 2, 3];
			expect(() => rng.sample(array, 5)).toThrow(
				"Cannot sample 5 items from array of length 3",
			);
		});

		it("負の個数でエラー", () => {
			const rng = new RNG(12345);
			const array = [1, 2, 3];
			expect(() => rng.sample(array, -1)).toThrow(
				"Cannot sample negative count: -1",
			);
		});
	});

	describe("serialize/deserialize", () => {
		it("シリアライズ/デシリアライズ後にRNGの内部状態が正しく復元される", () => {
			const original = new RNG(12345);

			// 乱数をいくつか消費
			original.random();
			original.random();

			const serialized = original.serialize();
			const restored = RNG.deserialize(serialized);

			// シードが同じか
			expect(restored.seed).toBe(original.seed);

			// 次の乱数が同じになるか（状態の復元確認）
			for (let i = 0; i < 10; i++) {
				expect(restored.random()).toBe(original.random());
			}
		});

		it("複数回の乱数生成後でもシリアライズ/デシリアライズが正しく動作する", () => {
			const original = new RNG(9999);
			const values1: number[] = [];

			// 100回回す
			for (let i = 0; i < 100; i++) {
				values1.push(original.random());
			}

			const serialized = original.serialize();
			const restored = RNG.deserialize(serialized);

			// 続きから100回回す
			for (let i = 0; i < 100; i++) {
				const v1 = original.random();
				const v2 = restored.random();
				expect(v2).toBe(v1);
			}
		});
	});
});
