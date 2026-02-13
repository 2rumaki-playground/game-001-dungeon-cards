import { afterEach, describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_HP,
	MAX_AP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Direction, Enemy } from "../types";
import {
	consumeApAndPlayCard,
	executeAttack,
	executeStrongAttack,
	executeWait,
} from "./action";
import {
	getEffectiveCardCost,
	resetDebugCheats,
	toggleDebugCheat,
} from "./debugCheats";

describe("executeAttack", () => {
	it("攻撃成功: 敵HPが減少・AP消費・カード捨て札移動・行動ログ", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", "right");

		// 攻撃ヒット
		expect(hit).toBe(true);
		// 敵HPが減少
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].hp).toBe(ENEMY_HP - PLAYER_ATTACK_DAMAGE);
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("attack-1");
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("敵にダメージを与えた");
	});

	it("攻撃成功（敵HP0で死亡）: 敵がenemiesから削除される", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 1,
				maxHp: ENEMY_HP,
				type: "normal",
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", "right");

		// 攻撃ヒット
		expect(hit).toBe(true);
		// 敵が削除される
		expect(result.enemies).toHaveLength(0);
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// 行動ログに死亡が記録
		expect(result.actionLog[0].message).toBe("敵を倒した");
	});

	it.each([
		["敵がいない方向", undefined, "right"],
		["壁方向", { x: 1, y: 1 }, "up"],
		["マップ外方向", { x: 0, y: 0 }, "up"],
	] as [
		string,
		{ x: number; y: number } | undefined,
		Direction,
	][])("攻撃不成立（%s）: AP消費・カード捨て札移動・失敗ログ", (_, playerPos, direction) => {
		const state = createTestState({
			enemies: [],
			...(playerPos
				? {
						player: {
							position: playerPos,
							hp: PLAYER_INITIAL_HP,
							maxHp: PLAYER_INITIAL_HP,
							ap: MAX_AP,
							maxAp: MAX_AP,
						},
					}
				: {}),
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", direction);

		expect(hit).toBe(false);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const originalEnemyHp = state.enemies[0].hp;
		const originalAp = state.player.ap;

		executeAttack(state, "attack-1", "right");

		expect(state.enemies[0].hp).toBe(originalEnemyHp);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeWait", () => {
	it("待機成功: AP消費なし・カード捨て札移動・行動ログ", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "wait-1", type: "wait" }],
				discardPile: [],
			},
		});
		const result = executeWait(state, "wait-1");

		// APが減らない（コスト0）
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.wait);
		expect(result.player.ap).toBe(MAX_AP);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("wait-1");
		// 行動ログに記録
		expect(result.actionLog).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("待機した");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "wait-1", type: "wait" }],
				discardPile: [],
			},
		});
		const originalAp = state.player.ap;

		executeWait(state, "wait-1");

		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.discardPile).toHaveLength(0);
	});
});

describe("executeStrongAttack", () => {
	it("攻撃成功: 敵HP3が0になり倒される・AP2消費・カード捨て札移動", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);

		expect(hit).toBe(true);
		// ENEMY_HP(3) - PLAYER_STRONG_ATTACK_DAMAGE(3) = 0 → 敵は倒される
		expect(result.enemies).toHaveLength(0);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.strong_attack);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("strong-1");
		expect(result.actionLog[0].message).toBe("敵を倒した");
	});

	it("攻撃成功（敵HPが3超過）: ダメージ3適用・敵生存", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 5,
				maxHp: 5,
				type: "normal",
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			"right",
		);

		expect(hit).toBe(true);
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].hp).toBe(5 - PLAYER_STRONG_ATTACK_DAMAGE);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.strong_attack);
	});

	it.each([
		["敵がいない方向", undefined, "right"],
		["壁方向", { x: 1, y: 1 }, "up"],
	] as [
		string,
		{ x: number; y: number } | undefined,
		Direction,
	][])("攻撃不成立（%s）: AP2消費・カード捨て札移動・失敗ログ", (_, playerPos, direction) => {
		const state = createTestState({
			enemies: [],
			...(playerPos
				? {
						player: {
							position: playerPos,
							hp: PLAYER_INITIAL_HP,
							maxHp: PLAYER_INITIAL_HP,
							ap: MAX_AP,
							maxAp: MAX_AP,
						},
					}
				: {}),
			deck: {
				drawPile: [],
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			direction,
		);

		expect(hit).toBe(false);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.strong_attack);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("強攻撃できなかった");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const originalEnemyHp = state.enemies[0].hp;
		const originalAp = state.player.ap;

		executeStrongAttack(state, "strong-1", "right");

		expect(state.enemies[0].hp).toBe(originalEnemyHp);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("consumeApAndPlayCard - AP無限チート", () => {
	afterEach(() => {
		resetDebugCheats();
	});

	it("AP無限ONの場合、APが減らない", () => {
		toggleDebugCheat("infiniteAp");
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const cost = getEffectiveCardCost("move");
		expect(cost).toBe(0);
		const result = consumeApAndPlayCard(state, "move-1", cost);

		expect(result.player.ap).toBe(MAX_AP);
	});

	it("AP無限OFFの場合、通常通りAPが減る", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const cost = getEffectiveCardCost("move");
		expect(cost).toBe(CARD_COST.move);
		const result = consumeApAndPlayCard(state, "move-1", cost);

		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
	});
});
