import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_ATTACK_DAMAGE,
	ENEMY_COUNT,
	ENEMY_HP,
	ENEMY_PARAMS,
	FLOOR_TILE_COUNT,
	INITIAL_DECK,
	MAP_HEIGHT,
	MAP_WIDTH,
	PLAYER_STRONG_ATTACK_DAMAGE,
	RUSH_MAX_DISTANCE,
	STAIRS_COUNT,
	TOTAL_DECK_SIZE,
} from "./constants";

describe("constants", () => {
	it("デッキ合計枚数が正しい", () => {
		expect(TOTAL_DECK_SIZE).toBe(18);
	});

	it("初期デッキの内訳が正しい", () => {
		expect(INITIAL_DECK.moveCards).toBe(6);
		expect(INITIAL_DECK.attackCards).toBe(6);
		expect(INITIAL_DECK.strongAttackCards).toBe(2);
		expect(INITIAL_DECK.rushCards).toBe(2);
		expect(INITIAL_DECK.waitCards).toBe(2);
	});

	it("突進カードのAPコストが2", () => {
		expect(CARD_COST.rush).toBe(2);
	});

	it("突進カードの最大移動距離が2", () => {
		expect(RUSH_MAX_DISTANCE).toBe(2);
	});

	it("強攻撃カードのAPコストが2", () => {
		expect(CARD_COST.strong_attack).toBe(2);
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
		});

		it("重装敵のパラメータが正しい", () => {
			expect(ENEMY_PARAMS.heavy.hp).toBe(5);
			expect(ENEMY_PARAMS.heavy.attackDamage).toBe(2);
			expect(ENEMY_PARAMS.heavy.moveDistance).toBe(0);
		});

		it("俊敏敵のパラメータが正しい", () => {
			expect(ENEMY_PARAMS.scout.hp).toBe(2);
			expect(ENEMY_PARAMS.scout.attackDamage).toBe(1);
			expect(ENEMY_PARAMS.scout.moveDistance).toBe(2);
		});

		it("旧定数がENEMY_PARAMS.normalと一致する", () => {
			expect(ENEMY_HP).toBe(ENEMY_PARAMS.normal.hp);
			expect(ENEMY_ATTACK_DAMAGE).toBe(ENEMY_PARAMS.normal.attackDamage);
		});
	});
});
