import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_COUNT,
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
});
