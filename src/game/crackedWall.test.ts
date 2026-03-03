/**
 * ひび割れ壁タイル（cracked_wall）のテスト
 * @see docs/spec/rules.md - ひび割れ壁
 */

import { describe, expect, it } from "vitest";
import { ENEMY_HP } from "../constants";
import {
	createTestEnemy,
	createTestHand,
	createTestState,
} from "../test-utils/createTestFixtures";
import type { Enemy, GameState } from "../types";
import {
	executeFire,
	executeJump,
	executeMove,
	executeThunder,
} from "./action";
import { canEnemyMoveTo, hasLineOfSight } from "./enemyAi";
import { bfsFirstStep } from "./pathfinding";
import { applyKnockback } from "./specialAttack";

/** テスト用stateにcracked_wallを配置するヘルパー */
function withCrackedWall(state: GameState, x: number, y: number): GameState {
	const newMap = state.map.map((row) => [...row]);
	newMap[y][x] = { type: "cracked_wall" };
	return { ...state, map: newMap };
}

describe("ひび割れ壁: 移動", () => {
	it("プレイヤーがcracked_wallに移動できない", () => {
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["move"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeMove(state, "test-card-0", "right");
		// 移動失敗: 位置は変わらない
		expect(result.state.player.position).toEqual({ x: 3, y: 3 });
		expect(result.reachedStairs).toBe(false);
	});
});

describe("ひび割れ壁: 通常攻撃", () => {
	it("cracked_wallに向けた攻撃は不成立（壁を破壊しない）", () => {
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["fire"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeFire(state, "test-card-0", "right");
		expect(result.hit).toBe(false);
		// cracked_wallは残っている
		expect(result.state.map[3][4].type).toBe("cracked_wall");
	});
});

describe("ひび割れ壁: 強攻撃", () => {
	it("cracked_wallを破壊して床に変化（カード使用済み）", () => {
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["thunder"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeThunder(state, "test-card-0", "right");
		expect(result.hit).toBe(false);
		// cracked_wallが床に変化
		expect(result.state.map[3][4].type).toBe("floor");
		// カードは使用済み
		expect(result.state.deck.usedCardIds).toContain("test-card-0");
		// ログに破壊メッセージ
		expect(
			result.state.actionLog.some(
				(log) => log.message === "ひび割れ壁を破壊した",
			),
		).toBe(true);
	});
});

describe("ひび割れ壁: ファイアボルト", () => {
	it("ファイアボルト単体ではcracked_wallを破壊しない", () => {
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["fire"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeFire(state, "test-card-0", "right");
		expect(result.hit).toBe(false);
		// cracked_wallは残っている
		expect(result.state.map[3][4].type).toBe("cracked_wall");
	});
});

describe("ひび割れ壁: ジャンプ", () => {
	it("着地先がcracked_wallでジャンプ失敗", () => {
		// プレイヤー(3,3), cracked_wall at (5,3)（2マス先）
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["jump"]),
					usedCardIds: [],
				},
			}),
			5,
			3,
		);

		const result = executeJump(state, "test-card-0", "right");
		expect(result.jumped).toBe(false);
		// 位置は変わらない
		expect(result.state.player.position).toEqual({ x: 3, y: 3 });
	});
});

describe("ひび割れ壁: 敵AI", () => {
	it("canEnemyMoveToがcracked_wallでfalseを返す", () => {
		const enemy = createTestEnemy("normal", { x: 3, y: 3 });
		const state = withCrackedWall(
			createTestState({
				enemies: [enemy],
				player: { position: { x: 1, y: 1 }, hp: 10, maxHp: 10 },
			}),
			4,
			3,
		);

		expect(canEnemyMoveTo(state, enemy, 4, 3)).toBe(false);
	});
});

describe("ひび割れ壁: BFS経路探索", () => {
	it("cracked_wallを迂回する経路を探索する", () => {
		// createFixedLayoutMap のデフォルトマップでは (1,1)→(3,1) は迂回可能
		// BFS は cracked_wall を避けて必ず non-null の経路を返すことを確認する
		const state = createTestState();
		const map = state.map.map((row) => [...row]);
		map[1][2] = { type: "cracked_wall" };

		const result = bfsFirstStep(map, { x: 1, y: 1 }, { x: 3, y: 1 });
		// 到達可能であること（BFS が退化して常に null を返さないこと）を検証する
		expect(result).not.toBeNull();
		// 直進（right）は cracked_wall で塞がれているので最初の一手にはならない
		expect(result).not.toBe("right");
	});

	it("目的地がcracked_wallの場合は到達不可", () => {
		const state = createTestState();
		const map = state.map.map((row) => [...row]);
		map[1][2] = { type: "cracked_wall" };

		const result = bfsFirstStep(map, { x: 1, y: 1 }, { x: 2, y: 1 });
		expect(result).toBeNull();
	});
});

describe("ひび割れ壁: 射線", () => {
	it("cracked_wallが射線を遮蔽する", () => {
		// 射線: (1,3) → (5,3), cracked_wall at (3,3)
		const state = withCrackedWall(
			createTestState({
				player: { position: { x: 1, y: 3 }, hp: 10, maxHp: 10 },
			}),
			3,
			3,
		);

		expect(hasLineOfSight(state, { x: 1, y: 3 }, { x: 5, y: 3 })).toBe(false);
	});
});

describe("ひび割れ壁: ノックバック", () => {
	it("cracked_wallにノックバック不可", () => {
		// 敵(4,3), cracked_wall at (5,3), ノックバック方向: right
		const enemy: Enemy = {
			id: "enemy-1",
			type: "normal",
			position: { x: 4, y: 3 },
			hp: ENEMY_HP,
			maxHp: ENEMY_HP,
		};
		const state = withCrackedWall(
			createTestState({
				enemies: [enemy],
			}),
			5,
			3,
		);

		const result = applyKnockback(state, "enemy-1", "right");
		// 位置は変わらない
		expect(result.enemies[0].position).toEqual({ x: 4, y: 3 });
	});
});

describe("ひび割れ壁: 破壊後", () => {
	it("破壊後は床タイルとして通常動作する", () => {
		// cracked_wall at (4,3) を強攻撃で破壊 → 移動可能
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: [
						{
							id: "sa-1",
							type: "thunder",
							level: 1,
							exp: 0,
							stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
						},
						{
							id: "move-1",
							type: "move",
							level: 1,
							exp: 0,
							stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
						},
					],
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		// 強攻撃で破壊
		const attackResult = executeThunder(state, "sa-1", "right");
		expect(attackResult.state.map[3][4].type).toBe("floor");

		// 破壊後に移動可能
		const moveResult = executeMove(attackResult.state, "move-1", "right");
		expect(moveResult.state.player.position).toEqual({ x: 4, y: 3 });
	});
});
