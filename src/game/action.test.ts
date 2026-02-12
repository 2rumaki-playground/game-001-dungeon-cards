import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_HP,
	MAX_AP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
	PLAYER_STRONG_ATTACK_DAMAGE,
	TRAP_DAMAGE,
	TREASURE_HEAL,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import {
	consumeApAndPlayCard,
	executeAttack,
	executeJump,
	executeMove,
	executeStrongAttack,
	executeWait,
} from "./action";

describe("consumeApAndPlayCard", () => {
	it.each([
		["move", CARD_COST.move],
		["attack", CARD_COST.attack],
		["wait", CARD_COST.wait],
	] as [
		string,
		number,
	][])("%sカード使用時にAP消費・カード捨て札移動", (type, cost) => {
		const cardId = `${type}-1`;
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: cardId, type: type as "move" | "attack" | "wait" }],
				discardPile: [],
			},
		});
		const result = consumeApAndPlayCard(state, cardId, cost);

		expect(result.player.ap).toBe(MAX_AP - cost);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe(cardId);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const originalAp = state.player.ap;

		consumeApAndPlayCard(state, "move-1", CARD_COST.move);

		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
		expect(state.deck.discardPile).toHaveLength(0);
	});
});

describe("executeMove", () => {
	it("床タイルへの移動成功: 位置更新・AP消費・カード捨て札移動・行動ログ", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { state: result, reachedStairs } = executeMove(
			state,
			"move-1",
			"right",
		);

		// 位置が更新される
		expect(result.player.position).toEqual({ x: 4, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("move-1");
		// 行動ログに記録
		expect(result.actionLog.length).toBeGreaterThan(0);
		// 階段ではない
		expect(reachedStairs).toBe(false);
	});

	it("壁タイルへの移動失敗: 位置変更なし・AP消費・カード捨て札移動・失敗ログ", () => {
		// プレイヤーを壁の隣に配置（1,1から上は壁）
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "up");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 1, y: 1 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 行動ログに失敗が記録
		expect(result.actionLog.length).toBeGreaterThan(0);
	});

	it("敵がいるマスへの移動失敗: 位置変更なし・AP消費", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 3,
				maxHp: 3,
				type: "normal",
			},
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { state: result } = executeMove(state, "move-1", "right");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 3, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
	});

	it("階段タイルへの移動成功: reachedStairsがtrueで階層遷移は行わない", () => {
		const map = createTestMap();
		// (4,3)を階段タイルに設定
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { state: result, reachedStairs } = executeMove(
			state,
			"move-1",
			"right",
		);

		// 階段到達フラグ
		expect(reachedStairs).toBe(true);
		// 階層遷移は行わない（floorは変わらない）
		expect(result.floor).toBe(1);
		// プレイヤーは階段マスに移動している
		expect(result.player.position).toEqual({ x: 4, y: 3 });
	});

	it("罠タイルへの移動: ダメージを受けてtileEffectがtrap", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			tileEffect,
			gameOver,
		} = executeMove(state, "move-1", "right");

		expect(result.player.position).toEqual({ x: 4, y: 3 });
		expect(tileEffect).toBe("trap");
		expect(gameOver).toBe(false);
		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - TRAP_DAMAGE);
		expect(result.map[3][4].type).toBe("floor");
	});

	it("宝箱タイルへの移動: HP回復してtileEffectがtreasure", () => {
		const map = createTestMap();
		map[3][4] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { state: result, tileEffect } = executeMove(state, "move-1", "right");

		expect(tileEffect).toBe("treasure");
		expect(result.player.hp).toBe(5 + TREASURE_HEAL);
	});

	it("罠タイルでHP0: gameOverがtrue", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { gameOver } = executeMove(state, "move-1", "right");

		expect(gameOver).toBe(true);
	});

	it("床タイルへの移動: tileEffectがnull", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const { tileEffect, gameOver } = executeMove(state, "move-1", "right");

		expect(tileEffect).toBeNull();
		expect(gameOver).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeMove(state, "move-1", "right"); // MoveResultを返すが、破棄

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

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
		["敵がいない方向", { x: 3, y: 3 }, "right"],
		["壁方向", { x: 1, y: 1 }, "up"],
		["マップ外方向", { x: 0, y: 0 }, "up"],
	] as [
		string,
		{ x: number; y: number },
		string,
	][])("攻撃不成立（%s）: AP消費・カード捨て札移動・失敗ログ", (_, pos, dir) => {
		const state = createTestState({
			enemies: [],
			player: {
				position: pos,
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeAttack(
			state,
			"attack-1",
			dir as "up" | "right",
		);

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
		["敵がいない方向", { x: 3, y: 3 }, "right"],
		["壁方向", { x: 1, y: 1 }, "up"],
	] as [
		string,
		{ x: number; y: number },
		string,
	][])("攻撃不成立（%s）: AP2消費・カード捨て札移動・失敗ログ", (_, pos, dir) => {
		const state = createTestState({
			enemies: [],
			player: {
				position: pos,
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeStrongAttack(
			state,
			"strong-1",
			dir as "up" | "right",
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

describe("executeJump", () => {
	it("ジャンプ成功（2マス先が床）: 位置2マス先・AP消費・カード捨て札移動", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("jump-1");
		expect(jumped).toBe(true);
		expect(reachedStairs).toBe(false);
	});

	it("着地先が壁: 移動なし・AP消費・カード捨て札移動", () => {
		const map = createTestMap();
		map[3][5] = { type: "wall" };

		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 3, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(jumped).toBe(false);
	});

	it("着地先がマップ外: 移動なし・AP消費", () => {
		const state = createTestState({
			player: {
				position: { x: 0, y: 0 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", "up");

		expect(result.player.position).toEqual({ x: 0, y: 0 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(jumped).toBe(false);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toEqual([{ id: "jump-1", type: "jump" }]);
	});

	it("着地先に敵: 移動なし・AP消費", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				type: "normal",
				position: { x: 5, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({
			enemies,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 3, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.jump);
		expect(jumped).toBe(false);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toEqual([{ id: "jump-1", type: "jump" }]);
	});

	it("1マス先に敵がいても飛び越えて2マス先に着地", () => {
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
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(jumped).toBe(true);
	});

	it("1マス先が壁でも飛び越えて2マス先に着地", () => {
		const map = createTestMap();
		map[3][4] = { type: "wall" };

		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const { state: result, jumped } = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(jumped).toBe(true);
	});

	it("1マス先に階段があっても飛び越えて2マス先に着地", () => {
		const map = createTestMap();
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(jumped).toBe(true);
		expect(reachedStairs).toBe(false);
		expect(result.floor).toBe(1);
	});

	it("着地先が階段: reachedStairsがtrueで階層遷移は行わない", () => {
		const map = createTestMap();
		map[3][5] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			jumped,
			reachedStairs,
		} = executeJump(state, "jump-1", "right");

		expect(reachedStairs).toBe(true);
		expect(result.floor).toBe(1);
		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(jumped).toBe(true);
	});

	it("1マス先の罠を飛び越え: 罠効果は発動しない", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.jumped).toBe(true);
		expect(result.state.player.position).toEqual({ x: 5, y: 3 });
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.tileEffects).toEqual([]);
	});

	it("着地先の罠→HP0→ゲームオーバー", () => {
		const map = createTestMap();
		map[3][5] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.gameOver).toBe(true);
		expect(result.jumped).toBe(true);
		expect(result.state.player.position).toEqual({ x: 5, y: 3 });
		expect(result.tileEffects).toContainEqual(
			expect.objectContaining({ tile: "trap" }),
		);
	});

	it("着地先の宝箱: 着地先の効果のみ発動", () => {
		const map = createTestMap();
		map[3][5] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP - 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.jumped).toBe(true);
		expect(result.tileEffects).toEqual([
			{ tile: "treasure", position: { x: 5, y: 3 } },
		]);
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP - 5 + TREASURE_HEAL);
	});

	it("1マス先に罠、着地先に宝箱: 罠は無視、宝箱のみ発動", () => {
		const map = createTestMap();
		map[3][4] = { type: "trap" };
		map[3][5] = { type: "treasure" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP - 5,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.tileEffects).toEqual([
			{ tile: "treasure", position: { x: 5, y: 3 } },
		]);
		// HP: 5 + 3(treasure) = 8（罠ダメージなし）
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP - 5 + TREASURE_HEAL);
	});

	it("ジャンプで特殊タイルなし: tileEffectsが空", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");

		expect(result.tileEffects).toEqual([]);
		expect(result.gameOver).toBe(false);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeJump(state, "jump-1", "right");

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});

describe("executeMove - visitedTiles", () => {
	it("移動成功時に移動先が訪問済みに追加される", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const result = executeMove(state, "move-1", "right");
		expect(result.state.visitedTiles.has("4,3")).toBe(true);
	});

	it("移動失敗時にvisitedTilesは変更されない", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		// (1,1)からupは(1,0)=壁なので失敗
		const result = executeMove(state, "move-1", "up");
		expect(result.state.visitedTiles.size).toBe(0);
	});

	it("部屋に入った場合、部屋全体が訪問済みになる", () => {
		const room = { x: 4, y: 2, width: 2, height: 2 };
		const state = createTestState({
			rooms: [room],
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		// (3,3)から右に移動→(4,3)は部屋内
		const result = executeMove(state, "move-1", "right");
		expect(result.state.visitedTiles.has("4,2")).toBe(true);
		expect(result.state.visitedTiles.has("5,2")).toBe(true);
		expect(result.state.visitedTiles.has("4,3")).toBe(true);
		expect(result.state.visitedTiles.has("5,3")).toBe(true);
	});
});

describe("executeJump - visitedTiles", () => {
	it("ジャンプ着地時に着地先が訪問済みに追加される", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		const result = executeJump(state, "jump-1", "right");
		expect(result.state.visitedTiles.has("5,3")).toBe(true);
	});

	it("ジャンプ失敗時にvisitedTilesは変更されない", () => {
		const state = createTestState({
			player: {
				position: { x: 1, y: 1 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
			deck: {
				drawPile: [],
				hand: [{ id: "jump-1", type: "jump" }],
				discardPile: [],
			},
		});
		// (1,1)からupは(1,-1)=マップ外なので失敗
		const result = executeJump(state, "jump-1", "up");
		expect(result.state.visitedTiles.size).toBe(0);
	});
});
