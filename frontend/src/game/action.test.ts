import { describe, expect, it } from "vitest";
import {
	CARD_COST,
	ENEMY_COUNT,
	ENEMY_HP,
	MAP_HEIGHT,
	MAX_AP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy } from "../types";
import {
	executeAttack,
	executeMove,
	executeRush,
	executeStrongAttack,
	executeWait,
} from "./action";

describe("executeMove", () => {
	it("床タイルへの移動成功: 位置更新・AP消費・カード捨て札移動・行動ログ", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const result = executeMove(state, "move-1", "right");

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
		const result = executeMove(state, "move-1", "up");

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
			{ id: "enemy-1", position: { x: 4, y: 3 }, hp: 3, maxHp: 3 },
		];
		const state = createTestState({
			enemies,
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const result = executeMove(state, "move-1", "right");

		// 位置が変更されない
		expect(result.player.position).toEqual({ x: 3, y: 3 });
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.move);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
	});

	it("階段タイルへの移動成功: 階層遷移が発生する", () => {
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
		const result = executeMove(state, "move-1", "right");

		// 階層が +1
		expect(result.floor).toBe(2);
		// 新マップが生成される
		expect(result.map).toHaveLength(MAP_HEIGHT);
		// 敵が新規配置される
		expect(result.enemies).toHaveLength(ENEMY_COUNT);
		// 行動ログに階層遷移が記録
		const hasFloorLog = result.actionLog.some((log) =>
			log.message.includes("2階に到達した"),
		);
		expect(hasFloorLog).toBe(true);
	});

	it("階段タイルへの移動成功: 遷移後のターンが player", () => {
		const map = createTestMap();
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			deck: {
				drawPile: [],
				hand: [{ id: "move-1", type: "move" }],
				discardPile: [],
			},
		});
		const result = executeMove(state, "move-1", "right");

		expect(result.turn).toBe("player");
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

		executeMove(state, "move-1", "right");

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
			{ id: "enemy-1", position: { x: 4, y: 3 }, hp: 1, maxHp: ENEMY_HP },
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

	it("攻撃不成立（敵がいない方向）: AP消費・カード捨て札移動・失敗ログ", () => {
		const state = createTestState({
			enemies: [],
			deck: {
				drawPile: [],
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result, hit } = executeAttack(state, "attack-1", "right");

		// 攻撃ミス
		expect(hit).toBe(false);
		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("攻撃不成立（壁方向）: AP消費・カード捨て札移動", () => {
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
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result } = executeAttack(state, "attack-1", "up");

		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
		expect(result.actionLog[0].message).toBe("攻撃できなかった");
	});

	it("攻撃不成立（マップ外方向）: AP消費・カード捨て札移動", () => {
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
				hand: [{ id: "attack-1", type: "attack" }],
				discardPile: [],
			},
		});
		const { state: result } = executeAttack(state, "attack-1", "up");

		// AP消費
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.attack);
		// カードが捨て札に移動
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		// 失敗ログ
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
			{ id: "enemy-1", position: { x: 4, y: 3 }, hp: 5, maxHp: 5 },
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

	it("攻撃不成立（敵がいない方向）: AP2消費・カード捨て札移動・失敗ログ", () => {
		const state = createTestState({
			enemies: [],
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

		expect(hit).toBe(false);
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.strong_attack);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.actionLog[0].message).toBe("強攻撃できなかった");
	});

	it("攻撃不成立（壁方向）: AP2消費・失敗ログ", () => {
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
				hand: [{ id: "strong-1", type: "strong_attack" }],
				discardPile: [],
			},
		});
		const { state: result } = executeStrongAttack(state, "strong-1", "up");

		expect(result.player.ap).toBe(MAX_AP - CARD_COST.strong_attack);
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

describe("executeRush", () => {
	it("2マス移動成功（床→床）: 位置2マス先・AP消費・カード捨て札移動", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			movedDistance,
			floorTransitioned,
		} = executeRush(state, "rush-1", "right");

		expect(result.player.position).toEqual({ x: 5, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(result.deck.discardPile[0].id).toBe("rush-1");
		expect(movedDistance).toBe(2);
		expect(floorTransitioned).toBe(false);
	});

	it("1マス目で壁: 移動なし・AP消費・カード捨て札移動", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const { state: result, movedDistance } = executeRush(state, "rush-1", "up");

		expect(result.player.position).toEqual({ x: 1, y: 1 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(result.deck.hand).toHaveLength(0);
		expect(result.deck.discardPile).toHaveLength(1);
		expect(movedDistance).toBe(0);
	});

	it("1マス目でマップ外: 移動なし・AP消費", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const { state: result, movedDistance } = executeRush(state, "rush-1", "up");

		expect(result.player.position).toEqual({ x: 0, y: 0 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(movedDistance).toBe(0);
	});

	it("1マス目で敵: 移動なし・AP消費", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const { state: result, movedDistance } = executeRush(
			state,
			"rush-1",
			"right",
		);

		expect(result.player.position).toEqual({ x: 3, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(movedDistance).toBe(0);
	});

	it("1マス目で階段: 階層遷移が発生する", () => {
		const map = createTestMap();
		map[3][4] = { type: "stairs" };

		const state = createTestState({
			map,
			floor: 1,
			deck: {
				drawPile: [],
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			movedDistance,
			floorTransitioned,
		} = executeRush(state, "rush-1", "right");

		expect(result.floor).toBe(2);
		expect(result.enemies).toHaveLength(ENEMY_COUNT);
		expect(movedDistance).toBe(1);
		expect(floorTransitioned).toBe(true);
	});

	it("2マス目で壁: 1マス停止・AP消費", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const { state: result, movedDistance } = executeRush(
			state,
			"rush-1",
			"right",
		);

		expect(result.player.position).toEqual({ x: 4, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(movedDistance).toBe(1);
	});

	it("2マス目で敵: 1マス停止・AP消費", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const { state: result, movedDistance } = executeRush(
			state,
			"rush-1",
			"right",
		);

		expect(result.player.position).toEqual({ x: 4, y: 3 });
		expect(result.player.ap).toBe(MAX_AP - CARD_COST.rush);
		expect(movedDistance).toBe(1);
	});

	it("2マス目で階段: 階層遷移が発生する", () => {
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
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const {
			state: result,
			movedDistance,
			floorTransitioned,
			intermediatePosition,
		} = executeRush(state, "rush-1", "right");

		expect(result.floor).toBe(2);
		expect(result.enemies).toHaveLength(ENEMY_COUNT);
		expect(movedDistance).toBe(2);
		expect(floorTransitioned).toBe(true);
		expect(intermediatePosition).toEqual({ x: 4, y: 3 });
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			deck: {
				drawPile: [],
				hand: [{ id: "rush-1", type: "rush" }],
				discardPile: [],
			},
		});
		const originalPosition = { ...state.player.position };
		const originalAp = state.player.ap;

		executeRush(state, "rush-1", "right");

		expect(state.player.position).toEqual(originalPosition);
		expect(state.player.ap).toBe(originalAp);
		expect(state.deck.hand).toHaveLength(1);
	});
});
