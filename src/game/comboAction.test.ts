import { beforeEach, describe, expect, it } from "vitest";
import { COMBO_BONUS, ENEMY_PARAMS, PLAYER_ATTACK_DAMAGE } from "../constants";
import {
	createTestEnemy,
	createTestHand,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import type { GameState } from "../types";
import { executeAttack, executeMove, executeWait } from "./action";

describe("コンボ発動（統合テスト）", () => {
	let state: GameState;

	beforeEach(() => {
		resetTestEnemySeq();
		// プレイヤー(3,3)、敵(3,2)=上方向
		const enemy = createTestEnemy("normal", { x: 3, y: 2 });
		state = createTestState({
			enemies: [enemy],
			deck: {
				hand: createTestHand(["move", "attack", "attack"]),
				usedCardIds: [],
			},
		});
	});

	it("移動→攻撃（同方向）で突撃コンボが発動しダメージが+1", () => {
		// 移動: 上方向 (3,3)→(3,2)は敵がいるので移動失敗、だがカード使用扱い
		const moveResult = executeMove(state, "test-card-0", "up");
		const afterMove = moveResult.state;

		// comboHistoryが更新されている
		expect(afterMove.comboHistory).toEqual({
			lastCardType: "move",
			lastDirection: "up",
		});

		// 攻撃: 上方向（同方向）→突撃コンボ
		const attackResult = executeAttack(afterMove, "test-card-1", "up");
		const afterAttack = attackResult.state;

		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBe("charge");

		// 敵のHP: 初期HP - (基本ダメージ + コンボボーナス)
		const expectedDamage = PLAYER_ATTACK_DAMAGE + COMBO_BONUS.charge;
		const enemy = afterAttack.enemies.find((e) => e.id === "enemy-1");
		if (enemy) {
			expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - expectedDamage);
		}

		// 行動ログにコンボ発動メッセージが含まれる
		const comboLog = afterAttack.actionLog.find(
			(log) => log.message === "突撃コンボ発動！",
		);
		expect(comboLog).toBeDefined();
	});

	it("移動→攻撃（異方向）ではコンボ不発でダメージは基本値", () => {
		// プレイヤー(3,3)、敵を上(3,2)と右(4,3)に配置
		resetTestEnemySeq();
		const enemyUp = createTestEnemy("normal", { x: 3, y: 2 });
		const enemyRight = createTestEnemy("normal", { x: 4, y: 3 });
		const s = createTestState({
			enemies: [enemyUp, enemyRight],
			deck: {
				hand: createTestHand(["move", "attack", "attack"]),
				usedCardIds: [],
			},
		});

		// 移動: 上方向（敵がいて移動失敗、だがカード使用扱い）
		const moveResult = executeMove(s, "test-card-0", "up");

		// 攻撃: 右方向（異方向）→コンボ不発
		const attackResult = executeAttack(
			moveResult.state,
			"test-card-1",
			"right",
		);
		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBeUndefined();

		// 敵のHP: 初期HP - 基本ダメージのみ（コンボなし）
		const enemyAfter = attackResult.state.enemies.find(
			(e) => e.id === "enemy-2",
		);
		if (enemyAfter) {
			expect(enemyAfter.hp).toBe(ENEMY_PARAMS.normal.hp - PLAYER_ATTACK_DAMAGE);
		}

		// コンボ発動ログがない
		const comboLog = attackResult.state.actionLog.find(
			(log) =>
				log.message === "突撃コンボ発動！" ||
				log.message === "連撃コンボ発動！",
		);
		expect(comboLog).toBeUndefined();
	});

	it("攻撃→攻撃で連撃コンボが発動しダメージが+1", () => {
		// 敵(3,2)=上、敵(4,3)=右に2体配置
		resetTestEnemySeq();
		const enemy1 = createTestEnemy("normal", { x: 3, y: 2 });
		const enemy2 = createTestEnemy("normal", { x: 4, y: 3 });
		const s = createTestState({
			enemies: [enemy1, enemy2],
			deck: {
				hand: createTestHand(["attack", "attack", "attack"]),
				usedCardIds: [],
			},
		});

		// 1枚目: 上方向攻撃
		const attack1 = executeAttack(s, "test-card-0", "up");
		expect(attack1.hit).toBe(true);

		// 2枚目: 右方向攻撃→連撃コンボ
		const attack2 = executeAttack(attack1.state, "test-card-1", "right");
		expect(attack2.hit).toBe(true);
		expect(attack2.comboType).toBe("chain");

		// enemy2のHP: 初期HP - (基本ダメージ + コンボボーナス)
		const expectedDamage = PLAYER_ATTACK_DAMAGE + COMBO_BONUS.chain;
		const enemy = attack2.state.enemies.find((e) => e.id === "enemy-2");
		if (enemy) {
			expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - expectedDamage);
		}

		// 連撃コンボログ
		const comboLog = attack2.state.actionLog.find(
			(log) => log.message === "連撃コンボ発動！",
		);
		expect(comboLog).toBeDefined();
	});

	it("ターン最初のカードではコンボが発動しない", () => {
		// comboHistory=null の状態で攻撃
		expect(state.comboHistory).toBeNull();

		const attackResult = executeAttack(state, "test-card-1", "up");
		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBeUndefined();

		// 敵のHP: 初期HP - 基本ダメージのみ
		const enemy = attackResult.state.enemies.find((e) => e.id === "enemy-1");
		if (enemy) {
			expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - PLAYER_ATTACK_DAMAGE);
		}

		// コンボログなし
		const comboLog = attackResult.state.actionLog.find(
			(log) =>
				log.message === "突撃コンボ発動！" ||
				log.message === "連撃コンボ発動！",
		);
		expect(comboLog).toBeUndefined();
	});

	it("攻撃→攻撃→攻撃で2枚目と3枚目にそれぞれ連撃コンボが発動", () => {
		// 敵を3方向に配置
		resetTestEnemySeq();
		const enemy1 = createTestEnemy("normal", { x: 3, y: 2 }); // 上
		const enemy2 = createTestEnemy("normal", { x: 4, y: 3 }); // 右
		const enemy3 = createTestEnemy("normal", { x: 3, y: 4 }); // 下
		const s = createTestState({
			enemies: [enemy1, enemy2, enemy3],
			deck: {
				hand: createTestHand(["attack", "attack", "attack"]),
				usedCardIds: [],
			},
			player: {
				position: { x: 3, y: 3 },
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
			},
		});

		// 1枚目: 上方向（コンボなし）
		const attack1 = executeAttack(s, "test-card-0", "up");

		// 2枚目: 右方向（連撃コンボ）
		const attack2 = executeAttack(attack1.state, "test-card-1", "right");
		const enemy2After = attack2.state.enemies.find((e) => e.id === "enemy-2");
		if (enemy2After) {
			expect(enemy2After.hp).toBe(
				ENEMY_PARAMS.normal.hp - (PLAYER_ATTACK_DAMAGE + COMBO_BONUS.chain),
			);
		}

		// 3枚目: 下方向（連撃コンボ）
		const attack3 = executeAttack(attack2.state, "test-card-2", "down");
		const enemy3After = attack3.state.enemies.find((e) => e.id === "enemy-3");
		if (enemy3After) {
			expect(enemy3After.hp).toBe(
				ENEMY_PARAMS.normal.hp - (PLAYER_ATTACK_DAMAGE + COMBO_BONUS.chain),
			);
		}

		// コンボログが2回出ている
		const comboLogs = attack3.state.actionLog.filter(
			(log) => log.message === "連撃コンボ発動！",
		);
		expect(comboLogs).toHaveLength(2);
	});

	it("wait→攻撃ではコンボが発動しない", () => {
		const waitState = executeWait(state, "test-card-0");
		expect(waitState.comboHistory).toEqual({
			lastCardType: "wait",
			lastDirection: null,
		});

		const attackResult = executeAttack(waitState, "test-card-1", "up");

		// コンボログなし
		const comboLog = attackResult.state.actionLog.find(
			(log) =>
				log.message === "突撃コンボ発動！" ||
				log.message === "連撃コンボ発動！",
		);
		expect(comboLog).toBeUndefined();
	});
});
