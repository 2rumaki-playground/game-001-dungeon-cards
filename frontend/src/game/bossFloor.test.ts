import { describe, expect, it } from "vitest";
import {
	ENEMY_PARAMS,
	type EnemyComposition,
	getBossType,
	getEnemyComposition,
	getEnemyCount,
	isBossFloor,
} from "../constants";
import { createEnemiesForFloor } from "./state";

describe("ボス階層判定", () => {
	describe("isBossFloor", () => {
		it("5Fはボス階層", () => {
			expect(isBossFloor(5)).toBe(true);
		});

		it("10Fはボス階層", () => {
			expect(isBossFloor(10)).toBe(true);
		});

		it("15Fはボス階層", () => {
			expect(isBossFloor(15)).toBe(true);
		});

		it("20Fはボス階層", () => {
			expect(isBossFloor(20)).toBe(true);
		});

		it("1Fはボス階層ではない", () => {
			expect(isBossFloor(1)).toBe(false);
		});

		it("3Fはボス階層ではない", () => {
			expect(isBossFloor(3)).toBe(false);
		});

		it("7Fはボス階層ではない", () => {
			expect(isBossFloor(7)).toBe(false);
		});

		it("12Fはボス階層ではない", () => {
			expect(isBossFloor(12)).toBe(false);
		});
	});

	describe("getBossType", () => {
		it("5Fは中ボス", () => {
			expect(getBossType(5)).toBe("miniboss");
		});

		it("10Fは大ボス", () => {
			expect(getBossType(10)).toBe("boss");
		});

		it("15Fは中ボス", () => {
			expect(getBossType(15)).toBe("miniboss");
		});

		it("20Fは大ボス", () => {
			expect(getBossType(20)).toBe("boss");
		});

		it("ボス階層でない場合はnullを返す", () => {
			expect(getBossType(1)).toBeNull();
			expect(getBossType(3)).toBeNull();
			expect(getBossType(7)).toBeNull();
		});

		it("非ボス階層すべてでnullを返す", () => {
			const nonBossFloors = [
				1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19,
			];
			for (const floor of nonBossFloors) {
				expect(getBossType(floor), `${floor}Fでnullであるべき`).toBeNull();
			}
		});
	});
});

describe("難易度テーブル拡張（10F〜20F）", () => {
	describe("敵構成テーブル", () => {
		it("5F: ボス1体を含む構成", () => {
			const comp = getEnemyComposition(5);
			expect(comp.miniboss).toBeGreaterThanOrEqual(1);
		});

		it("10F: ボス1体を含む構成", () => {
			const comp = getEnemyComposition(10);
			expect(comp.boss).toBe(1);
		});

		it("15F: 中ボス1体を含む構成", () => {
			const comp = getEnemyComposition(15);
			expect(comp.miniboss).toBeGreaterThanOrEqual(1);
		});

		it("20F: ボス1体を含む構成", () => {
			const comp = getEnemyComposition(20);
			expect(comp.boss).toBe(1);
		});

		it("9F〜11Fの構成が定義されている", () => {
			for (const floor of [9, 10, 11]) {
				const comp = getEnemyComposition(floor);
				const total =
					comp.normal + comp.heavy + comp.scout + comp.miniboss + comp.boss;
				expect(total).toBeGreaterThan(0);
			}
		});

		it("12F〜20Fの構成が定義されている", () => {
			for (let floor = 12; floor <= 20; floor++) {
				const comp = getEnemyComposition(floor);
				const total =
					comp.normal + comp.heavy + comp.scout + comp.miniboss + comp.boss;
				expect(total).toBeGreaterThan(0);
			}
		});

		it("難易度が段階的に上昇する（非ボス階層の強敵割合が増加）", () => {
			// 序盤（1-2F）vs 中盤（7-8F）vs 終盤（17-18F）の強敵比率を比較
			const earlyComp = getEnemyComposition(1);
			const midComp = getEnemyComposition(7);
			const lateComp = getEnemyComposition(17);

			const strongRatio = (c: EnemyComposition) =>
				c.heavy + c.scout + c.miniboss + c.boss;

			expect(strongRatio(midComp)).toBeGreaterThanOrEqual(
				strongRatio(earlyComp),
			);
			expect(strongRatio(lateComp)).toBeGreaterThanOrEqual(
				strongRatio(midComp),
			);
		});
	});

	describe("敵配置数テーブル", () => {
		it("10F以降も敵数が定義されている", () => {
			for (let floor = 10; floor <= 20; floor++) {
				expect(getEnemyCount(floor)).toBeGreaterThanOrEqual(3);
			}
		});

		it("敵数が階層に応じて段階的に増加する", () => {
			expect(getEnemyCount(1)).toBeLessThanOrEqual(getEnemyCount(10));
			expect(getEnemyCount(10)).toBeLessThanOrEqual(getEnemyCount(20));
		});
	});
});

describe("ボス階層の敵生成", () => {
	it("5F: 中ボス1体を含む敵が生成される", () => {
		const count = getEnemyCount(5);
		const positions = Array.from({ length: count }, (_, i) => ({
			x: i + 1,
			y: i + 1,
		}));
		const enemies = createEnemiesForFloor(positions, 5);
		const minibosses = enemies.filter((e) => e.type === "miniboss");
		expect(minibosses.length).toBeGreaterThanOrEqual(1);
		expect(minibosses[0].hp).toBe(ENEMY_PARAMS.miniboss.hp);
	});

	it("10F: ボス1体を含む敵が生成される", () => {
		const count = getEnemyCount(10);
		const positions = Array.from({ length: count }, (_, i) => ({
			x: i + 1,
			y: i + 1,
		}));
		const enemies = createEnemiesForFloor(positions, 10);
		const bosses = enemies.filter((e) => e.type === "boss");
		expect(bosses.length).toBe(1);
		expect(bosses[0].hp).toBe(ENEMY_PARAMS.boss.hp);
	});

	it("15F: 中ボス1体を含む敵が生成される", () => {
		const count = getEnemyCount(15);
		const positions = Array.from({ length: count }, (_, i) => ({
			x: i + 1,
			y: i + 1,
		}));
		const enemies = createEnemiesForFloor(positions, 15);
		const minibosses = enemies.filter((e) => e.type === "miniboss");
		expect(minibosses.length).toBeGreaterThanOrEqual(1);
	});

	it("20F: ボス1体を含む敵が生成される", () => {
		const count = getEnemyCount(20);
		const positions = Array.from({ length: count }, (_, i) => ({
			x: i + 1,
			y: i + 1,
		}));
		const enemies = createEnemiesForFloor(positions, 20);
		const bosses = enemies.filter((e) => e.type === "boss");
		expect(bosses.length).toBe(1);
		expect(bosses[0].hp).toBe(ENEMY_PARAMS.boss.hp);
	});
});
