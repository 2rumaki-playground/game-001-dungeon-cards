import { describe, expect, it } from "vitest";
import {
	ENEMY_HP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Direction, Enemy } from "../types";
import {
	executeAttack,
	executeStrongAttack,
	executeWait,
	markCardAsPlayed,
} from "./action";

describe("executeAttack", () => {
	it("攻撃成功: 敵HPが減少・カード使用済み記録・行動ログ", () => {
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
				hand: [{ id: "attack-1", type: "attack" }],
				usedCardIds: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", "right");

		// 攻撃ヒット
		expect(hit).toBe(true);
		// 敵HPが減少
		expect(result.enemies).toHaveLength(1);
		expect(result.enemies[0].hp).toBe(ENEMY_HP - PLAYER_ATTACK_DAMAGE);
		// カードが使用済みに記録
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds[0]).toBe("attack-1");
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
				hand: [{ id: "attack-1", type: "attack" }],
				usedCardIds: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", "right");

		// 攻撃ヒット
		expect(hit).toBe(true);
		// 敵が削除される
		expect(result.enemies).toHaveLength(0);
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
	][])("攻撃不成立（%s）: カード使用済み記録・失敗ログ", (_, playerPos, direction) => {
		const state = createTestState({
			enemies: [],
			...(playerPos
				? {
						player: {
							position: playerPos,
							hp: PLAYER_INITIAL_HP,
							maxHp: PLAYER_INITIAL_HP,
						},
					}
				: {}),
			deck: {
				hand: [{ id: "attack-1", type: "attack" }],
				usedCardIds: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", direction);

		expect(hit).toBe(false);
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
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
				hand: [{ id: "attack-1", type: "attack" }],
				usedCardIds: [],
			},
		});
		const originalEnemyHp = state.enemies[0].hp;

		executeAttack(state, "attack-1", "right");

		expect(state.enemies[0].hp).toBe(originalEnemyHp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeWait", () => {
	it("待機成功: カード使用済み記録・行動ログ", () => {
		const state = createTestState({
			deck: {
				hand: [{ id: "wait-1", type: "wait" }],
				usedCardIds: [],
			},
		});
		const result = executeWait(state, "wait-1");

		// カードが使用済みに記録
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds[0]).toBe("wait-1");
		// 行動ログに記録
		expect(result.actionLog).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("待機した");
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				hand: [{ id: "wait-1", type: "wait" }],
				usedCardIds: [],
			},
		});

		executeWait(state, "wait-1");

		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.usedCardIds).toHaveLength(0);
	});
});

describe("executeStrongAttack", () => {
	it("攻撃成功: 敵HP3が0になり倒される・カード使用済み記録", () => {
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
				hand: [{ id: "strong-1", type: "strong_attack" }],
				usedCardIds: [],
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
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
		expect(result.deck.usedCardIds[0]).toBe("strong-1");
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
				hand: [{ id: "strong-1", type: "strong_attack" }],
				usedCardIds: [],
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
	});

	it.each([
		["敵がいない方向", undefined, "right"],
		["壁方向", { x: 1, y: 1 }, "up"],
	] as [
		string,
		{ x: number; y: number } | undefined,
		Direction,
	][])("攻撃不成立（%s）: カード使用済み記録・失敗ログ", (_, playerPos, direction) => {
		const state = createTestState({
			enemies: [],
			...(playerPos
				? {
						player: {
							position: playerPos,
							hp: PLAYER_INITIAL_HP,
							maxHp: PLAYER_INITIAL_HP,
						},
					}
				: {}),
			deck: {
				hand: [{ id: "strong-1", type: "strong_attack" }],
				usedCardIds: [],
			},
		});
		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			direction,
		);

		expect(hit).toBe(false);
		expect(result.deck.hand).toHaveLength(1);
		expect(result.deck.usedCardIds).toHaveLength(1);
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
				hand: [{ id: "strong-1", type: "strong_attack" }],
				usedCardIds: [],
			},
		});
		const originalEnemyHp = state.enemies[0].hp;

		executeStrongAttack(state, "strong-1", "right");

		expect(state.enemies[0].hp).toBe(originalEnemyHp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("markCardAsPlayed", () => {
	it("カードが使用済みに記録される", () => {
		const state = createTestState({
			deck: {
				hand: [{ id: "move-1", type: "move" }],
				usedCardIds: [],
			},
		});
		const result = markCardAsPlayed(state, "move-1");

		expect(result.deck.usedCardIds).toContain("move-1");
	});
});
