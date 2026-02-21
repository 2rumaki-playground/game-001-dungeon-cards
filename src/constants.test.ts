import { describe, expect, it } from "vitest";
import {
	ENEMY_ATTACK_DAMAGE,
	ENEMY_COMPOSITION_TABLE,
	ENEMY_COUNT,
	ENEMY_HP,
	ENEMY_PARAMS,
	ENEMY_TYPE_LABEL,
	FLOOR_TILE_COUNT,
	getEnemyComposition,
	getEnemyCount,
	getMapSize,
	INITIAL_DECK,
	JUMP_DISTANCE,
	MAP_HEIGHT,
	MAP_WIDTH,
	PLAYER_STRONG_ATTACK_DAMAGE,
	STAIRS_COUNT,
	TOTAL_DECK_SIZE,
} from "./constants";
import type { EnemyType } from "./types";

describe("constants", () => {
	it("デッキ合計枚数が正しい", () => {
		expect(TOTAL_DECK_SIZE).toBe(4);
	});

	it("初期デッキの内訳が正しい", () => {
		expect(INITIAL_DECK.moveCards).toBe(2);
		expect(INITIAL_DECK.attackCards).toBe(1);
		expect(INITIAL_DECK.waitCards).toBe(1);
	});

	it("ジャンプカードの着地距離が2", () => {
		expect(JUMP_DISTANCE).toBe(2);
	});

	it("強攻撃カードのダメージが3", () => {
		expect(PLAYER_STRONG_ATTACK_DAMAGE).toBe(3);
	});

	it("マップサイズが正しい", () => {
		expect(MAP_WIDTH).toBe(7);
		expect(MAP_HEIGHT).toBe(7);
	});

	it("床タイル数がプレイヤー+階段+敵の配置に十分", () => {
		const requiredTiles = 1 + STAIRS_COUNT + ENEMY_COUNT; // プレイヤー1 + 階段1 + 敵3 = 5
		expect(FLOOR_TILE_COUNT).toBeGreaterThanOrEqual(requiredTiles);
	});

	describe("ENEMY_PARAMS", () => {
		it("通常敵のパラメータが正しい", () => {
			expect(ENEMY_PARAMS.normal.hp).toBe(3);
			expect(ENEMY_PARAMS.normal.attackDamage).toBe(1);
			expect(ENEMY_PARAMS.normal.moveDistance).toBe(1);
			expect(ENEMY_PARAMS.normal.senseRange).toBe(5);
		});

		it("重装敵のパラメータが正しい", () => {
			expect(ENEMY_PARAMS.heavy.hp).toBe(5);
			expect(ENEMY_PARAMS.heavy.attackDamage).toBe(2);
			expect(ENEMY_PARAMS.heavy.moveDistance).toBe(0);
			expect(ENEMY_PARAMS.heavy.senseRange).toBe(3);
		});

		it("俊敏敵のパラメータが正しい", () => {
			expect(ENEMY_PARAMS.scout.hp).toBe(2);
			expect(ENEMY_PARAMS.scout.attackDamage).toBe(1);
			expect(ENEMY_PARAMS.scout.moveDistance).toBe(2);
			expect(ENEMY_PARAMS.scout.senseRange).toBe(8);
		});

		it("ミニボスのパラメータが正しい", () => {
			expect(ENEMY_PARAMS.miniboss.hp).toBe(8);
			expect(ENEMY_PARAMS.miniboss.attackDamage).toBe(2);
			expect(ENEMY_PARAMS.miniboss.moveDistance).toBe(1);
			expect(ENEMY_PARAMS.miniboss.senseRange).toBe(7);
		});

		it("ボスのパラメータが正しい", () => {
			expect(ENEMY_PARAMS.boss.hp).toBe(15);
			expect(ENEMY_PARAMS.boss.attackDamage).toBe(3);
			expect(ENEMY_PARAMS.boss.moveDistance).toBe(1);
			expect(ENEMY_PARAMS.boss.senseRange).toBe(10);
		});

		it("旧定数がENEMY_PARAMS.normalと一致する", () => {
			expect(ENEMY_HP).toBe(ENEMY_PARAMS.normal.hp);
			expect(ENEMY_ATTACK_DAMAGE).toBe(ENEMY_PARAMS.normal.attackDamage);
		});
	});

	describe("getMapSize", () => {
		it("階層1-2: 9x9", () => {
			expect(getMapSize(1)).toEqual({ width: 9, height: 9 });
			expect(getMapSize(2)).toEqual({ width: 9, height: 9 });
		});

		it("階層3-4: 11x11", () => {
			expect(getMapSize(3)).toEqual({ width: 11, height: 11 });
			expect(getMapSize(4)).toEqual({ width: 11, height: 11 });
		});

		it("階層5-6: 13x13", () => {
			expect(getMapSize(5)).toEqual({ width: 13, height: 13 });
			expect(getMapSize(6)).toEqual({ width: 13, height: 13 });
		});

		it("階層7-9: 15x15", () => {
			expect(getMapSize(7)).toEqual({ width: 15, height: 15 });
			expect(getMapSize(9)).toEqual({ width: 15, height: 15 });
		});

		it("階層10-14: 17x17", () => {
			expect(getMapSize(10)).toEqual({ width: 17, height: 17 });
			expect(getMapSize(14)).toEqual({ width: 17, height: 17 });
		});

		it("階層15+: 19x19", () => {
			expect(getMapSize(15)).toEqual({ width: 19, height: 19 });
			expect(getMapSize(20)).toEqual({ width: 19, height: 19 });
			expect(getMapSize(99)).toEqual({ width: 19, height: 19 });
		});
	});

	describe("getEnemyCount", () => {
		it("階層1-2: 3体", () => {
			expect(getEnemyCount(1)).toBe(3);
			expect(getEnemyCount(2)).toBe(3);
		});

		it("階層3-4: 4体", () => {
			expect(getEnemyCount(3)).toBe(4);
			expect(getEnemyCount(4)).toBe(4);
		});

		it("階層5-6: 5体", () => {
			expect(getEnemyCount(5)).toBe(5);
			expect(getEnemyCount(6)).toBe(5);
		});

		it("階層7-9: 6体", () => {
			expect(getEnemyCount(7)).toBe(6);
			expect(getEnemyCount(9)).toBe(6);
		});

		it("階層10-14: 7体", () => {
			expect(getEnemyCount(10)).toBe(7);
			expect(getEnemyCount(14)).toBe(7);
		});

		it("階層15+: 8体", () => {
			expect(getEnemyCount(15)).toBe(8);
			expect(getEnemyCount(20)).toBe(8);
			expect(getEnemyCount(99)).toBe(8);
		});
	});

	describe("ENEMY_TYPE_LABEL", () => {
		it("ENEMY_PARAMSの全敵タイプにラベルが定義されている", () => {
			const types = Object.keys(ENEMY_PARAMS) as EnemyType[];
			for (const type of types) {
				expect(ENEMY_TYPE_LABEL[type]).toBeDefined();
				expect(typeof ENEMY_TYPE_LABEL[type]).toBe("string");
			}
		});

		it("ENEMY_TYPE_LABELとENEMY_PARAMSのキー集合が一致する", () => {
			const labelKeys = Object.keys(ENEMY_TYPE_LABEL).sort();
			const paramKeys = Object.keys(ENEMY_PARAMS).sort();
			expect(labelKeys).toEqual(paramKeys);
		});
	});

	describe("getEnemyComposition", () => {
		it("階層1-2: normal×3", () => {
			expect(getEnemyComposition(1)).toEqual({
				normal: 3,
				heavy: 0,
				scout: 0,
				miniboss: 0,
				boss: 0,
			});
			expect(getEnemyComposition(2)).toEqual({
				normal: 3,
				heavy: 0,
				scout: 0,
				miniboss: 0,
				boss: 0,
			});
		});

		it("階層3-4: normal×2 + scout×1", () => {
			expect(getEnemyComposition(3)).toEqual({
				normal: 2,
				heavy: 0,
				scout: 1,
				miniboss: 0,
				boss: 0,
			});
			expect(getEnemyComposition(4)).toEqual({
				normal: 2,
				heavy: 0,
				scout: 1,
				miniboss: 0,
				boss: 0,
			});
		});

		it("階層5: miniboss×1 + normal×1 + heavy×1（中ボス階層）", () => {
			expect(getEnemyComposition(5)).toEqual({
				normal: 1,
				heavy: 1,
				scout: 0,
				miniboss: 1,
				boss: 0,
			});
		});

		it("階層6: normal×1 + heavy×1 + scout×1", () => {
			expect(getEnemyComposition(6)).toEqual({
				normal: 1,
				heavy: 1,
				scout: 1,
				miniboss: 0,
				boss: 0,
			});
		});

		it("階層7-8: heavy×1 + scout×2", () => {
			expect(getEnemyComposition(7)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 2,
				miniboss: 0,
				boss: 0,
			});
			expect(getEnemyComposition(8)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 2,
				miniboss: 0,
				boss: 0,
			});
		});

		it("階層9: heavy×1 + scout×2", () => {
			expect(getEnemyComposition(9)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 2,
				miniboss: 0,
				boss: 0,
			});
		});

		it("階層10: boss×1 + heavy×1 + scout×1（大ボス階層）", () => {
			expect(getEnemyComposition(10)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 1,
				miniboss: 0,
				boss: 1,
			});
		});

		it("階層15: miniboss×1 + heavy×1 + scout×1（中ボス階層）", () => {
			expect(getEnemyComposition(15)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 1,
				miniboss: 1,
				boss: 0,
			});
		});

		it("階層20: boss×1 + heavy×1 + scout×1（大ボス階層）", () => {
			expect(getEnemyComposition(20)).toEqual({
				normal: 0,
				heavy: 1,
				scout: 1,
				miniboss: 0,
				boss: 1,
			});
		});

		it("全エントリの合計が3", () => {
			for (const entry of ENEMY_COMPOSITION_TABLE) {
				const { normal, heavy, scout, miniboss, boss } = entry.composition;
				expect(normal + heavy + scout + miniboss + boss).toBe(ENEMY_COUNT);
			}
		});
	});
});
