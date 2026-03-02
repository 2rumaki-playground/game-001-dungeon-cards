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
	executeAttack,
	executeJump,
	executeMove,
	executeStrongAttack,
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
					hand: createTestHand(["attack"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeAttack(state, "test-card-0", "right");
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
					hand: createTestHand(["strong_attack"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeStrongAttack(state, "test-card-0", "right");
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

describe("ひび割れ壁: 突撃コンボ", () => {
	it("move→attack同方向でcracked_wallを破壊", () => {
		// プレイヤー(3,3), cracked_wall at (5,3)
		// 1. move right → (4,3)
		// 2. attack right → cracked_wall at (5,3) を破壊
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: [
						{ id: "move-1", type: "move", level: 1, exp: 0 },
						{ id: "attack-1", type: "attack", level: 1, exp: 0 },
					],
					usedCardIds: [],
				},
			}),
			5,
			3,
		);

		// Step 1: 移動
		const moveResult = executeMove(state, "move-1", "right");
		expect(moveResult.state.player.position).toEqual({ x: 4, y: 3 });

		// Step 2: 攻撃（突撃コンボ成立）
		const attackResult = executeAttack(moveResult.state, "attack-1", "right");
		expect(attackResult.hit).toBe(false);
		expect(attackResult.comboType).toBe("charge");
		// cracked_wallが床に変化
		expect(attackResult.state.map[3][5].type).toBe("floor");
		// ログに破壊メッセージ
		expect(
			attackResult.state.actionLog.some(
				(log) => log.message === "ひび割れ壁を破壊した",
			),
		).toBe(true);
	});

	it("通常攻撃単体ではcracked_wallを破壊しない（突撃コンボ非成立）", () => {
		const state = withCrackedWall(
			createTestState({
				deck: {
					hand: createTestHand(["attack"]),
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		const result = executeAttack(state, "test-card-0", "right");
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
		// from(1,1) to(3,1), cracked_wall at (2,1)
		// BFSは (2,1) を通れないので迂回するか null を返す
		const state = createTestState();
		const map = state.map.map((row) => [...row]);
		map[1][2] = { type: "cracked_wall" };

		const result = bfsFirstStep(map, { x: 1, y: 1 }, { x: 3, y: 1 });
		// 迂回可能な場合は上か下に向かう（直進はcracked_wallで不可）
		if (result !== null) {
			expect(result).not.toBe("right");
		}
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
						{ id: "sa-1", type: "strong_attack", level: 1, exp: 0 },
						{ id: "move-1", type: "move", level: 1, exp: 0 },
					],
					usedCardIds: [],
				},
			}),
			4,
			3,
		);

		// 強攻撃で破壊
		const attackResult = executeStrongAttack(state, "sa-1", "right");
		expect(attackResult.state.map[3][4].type).toBe("floor");

		// 破壊後に移動可能
		const moveResult = executeMove(attackResult.state, "move-1", "right");
		expect(moveResult.state.player.position).toEqual({ x: 4, y: 3 });
	});
});
