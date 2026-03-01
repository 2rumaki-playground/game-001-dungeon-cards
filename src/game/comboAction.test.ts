import { beforeEach, describe, expect, it } from "vitest";
import { COMBO_BONUS, ENEMY_PARAMS, PLAYER_ATTACK_DAMAGE } from "../constants";
import {
	createTestEnemy,
	createTestHand,
	createTestState,
	resetTestEnemySeq,
} from "../test-utils/createTestFixtures";
import type { GameState } from "../types";
import { executeAttack, executeJump, executeMove, executeWait } from "./action";

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

	it("移動成功→攻撃（同方向）で突撃コンボが発動しダメージが+1", () => {
		// プレイヤー(3,3)、敵(3,1)=上方向2マス先に配置（1マス先は空き）
		resetTestEnemySeq();
		const enemy = createTestEnemy("normal", { x: 3, y: 1 });
		const s = createTestState({
			enemies: [enemy],
			deck: {
				hand: createTestHand(["move", "attack", "attack"]),
				usedCardIds: [],
			},
		});

		// 移動: 上方向 (3,3)→(3,2) 移動成功
		const moveResult = executeMove(s, "test-card-0", "up");
		const afterMove = moveResult.state;
		expect(afterMove.player.position).toEqual({ x: 3, y: 2 });

		// comboHistoryが方向付きで更新されている
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
		const remainingEnemy = afterAttack.enemies.find((e) => e.id === "enemy-1");
		expect(remainingEnemy).toBeDefined();
		if (!remainingEnemy) return;
		expect(remainingEnemy.hp).toBe(ENEMY_PARAMS.normal.hp - expectedDamage);

		// 行動ログにコンボ発動メッセージが含まれる
		const comboLog = afterAttack.actionLog.find(
			(log) => log.message === "突撃コンボ発動！",
		);
		expect(comboLog).toBeDefined();
	});

	it("移動失敗→攻撃（同方向）では突撃コンボが発動しない", () => {
		// プレイヤー(3,3)、敵(3,2)=上方向（移動が敵でブロックされる）
		// 移動: 上方向 (3,3)→(3,2)は敵がいるので移動失敗
		const moveResult = executeMove(state, "test-card-0", "up");
		const afterMove = moveResult.state;

		// comboHistoryは方向なし（移動失敗）
		expect(afterMove.comboHistory).toEqual({
			lastCardType: "move",
			lastDirection: null,
		});

		// 攻撃: 上方向→突撃コンボは発動しない
		const attackResult = executeAttack(afterMove, "test-card-1", "up");

		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBeUndefined();

		// 敵のHP: 初期HP - 基本ダメージのみ（コンボなし）
		const enemy = attackResult.state.enemies.find((e) => e.id === "enemy-1");
		expect(enemy).toBeDefined();
		if (!enemy) return;
		expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - PLAYER_ATTACK_DAMAGE);

		// コンボ発動ログがない
		const comboLog = attackResult.state.actionLog.find(
			(log) => log.message === "突撃コンボ発動！",
		);
		expect(comboLog).toBeUndefined();
	});

	it("移動成功→攻撃（異方向）ではコンボ不発でダメージは基本値", () => {
		// プレイヤー(3,3)、敵を(4,4)に配置、下方向は空き
		// 下移動後: プレイヤー(3,4)、敵(4,4)=右方向
		resetTestEnemySeq();
		const enemyRight = createTestEnemy("normal", { x: 4, y: 4 });
		const s = createTestState({
			enemies: [enemyRight],
			deck: {
				hand: createTestHand(["move", "attack", "attack"]),
				usedCardIds: [],
			},
		});

		// 移動: 下方向（移動成功、(3,3)→(3,4)）
		const moveResult = executeMove(s, "test-card-0", "down");

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
			(e) => e.id === "enemy-1",
		);
		expect(enemyAfter).toBeDefined();
		if (!enemyAfter) return;
		expect(enemyAfter.hp).toBe(ENEMY_PARAMS.normal.hp - PLAYER_ATTACK_DAMAGE);

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
		expect(enemy).toBeDefined();
		if (!enemy) return;
		expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - expectedDamage);

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
		expect(enemy).toBeDefined();
		if (!enemy) return;
		expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - PLAYER_ATTACK_DAMAGE);

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
			},
		});

		// 1枚目: 上方向（コンボなし）
		const attack1 = executeAttack(s, "test-card-0", "up");

		// 2枚目: 右方向（連撃コンボ）
		const attack2 = executeAttack(attack1.state, "test-card-1", "right");
		const enemy2After = attack2.state.enemies.find((e) => e.id === "enemy-2");
		expect(enemy2After).toBeDefined();
		if (!enemy2After) return;
		expect(enemy2After.hp).toBe(
			ENEMY_PARAMS.normal.hp - (PLAYER_ATTACK_DAMAGE + COMBO_BONUS.chain),
		);

		// 3枚目: 下方向（連撃コンボ）
		const attack3 = executeAttack(attack2.state, "test-card-2", "down");
		const enemy3After = attack3.state.enemies.find((e) => e.id === "enemy-3");
		expect(enemy3After).toBeDefined();
		if (!enemy3After) return;
		expect(enemy3After.hp).toBe(
			ENEMY_PARAMS.normal.hp - (PLAYER_ATTACK_DAMAGE + COMBO_BONUS.chain),
		);

		// コンボログが2回出ている
		const comboLogs = attack3.state.actionLog.filter(
			(log) => log.message === "連撃コンボ発動！",
		);
		expect(comboLogs).toHaveLength(2);
	});

	it("wait→攻撃で集中攻撃コンボが発動しダメージが+1", () => {
		const waitState = executeWait(state, "test-card-0");
		expect(waitState.comboHistory).toEqual({
			lastCardType: "wait",
			lastDirection: null,
		});

		const attackResult = executeAttack(waitState, "test-card-1", "up");

		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBe("focus");

		// 敵のHP: 初期HP - (基本ダメージ + コンボボーナス)
		const expectedDamage = PLAYER_ATTACK_DAMAGE + COMBO_BONUS.focus;
		const enemy = attackResult.state.enemies.find((e) => e.id === "enemy-1");
		expect(enemy).toBeDefined();
		if (!enemy) return;
		expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp - expectedDamage);

		// コンボ発動ログ
		const comboLog = attackResult.state.actionLog.find(
			(log) => log.message === "集中攻撃コンボ発動！",
		);
		expect(comboLog).toBeDefined();
	});

	it("jump成功→攻撃（同方向）で奇襲コンボが発動しダメージが+2", () => {
		// プレイヤー(3,4)、敵(3,1)に配置
		// ジャンプ上方向: (3,4)→(3,2)、攻撃上方向: (3,2)→(3,1)の敵にヒット
		resetTestEnemySeq();
		const enemy = createTestEnemy("normal", { x: 3, y: 1 });
		const s = createTestState({
			enemies: [enemy],
			deck: {
				hand: createTestHand(["jump", "attack", "attack"]),
				usedCardIds: [],
			},
			player: {
				position: { x: 3, y: 4 },
				hp: 10,
				maxHp: 10,
			},
		});

		// ジャンプ: 上方向 (3,4)→(3,2)
		const jumpResult = executeJump(s, "test-card-0", "up");
		expect(jumpResult.jumped).toBe(true);
		const afterJump = jumpResult.state;
		expect(afterJump.player.position).toEqual({ x: 3, y: 2 });

		// comboHistoryが方向付きで更新されている
		expect(afterJump.comboHistory).toEqual({
			lastCardType: "jump",
			lastDirection: "up",
		});

		// 攻撃: 上方向（同方向）→奇襲コンボ
		const attackResult = executeAttack(afterJump, "test-card-1", "up");

		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBe("ambush");

		// ダメージ = 基本(1) + 奇襲ボーナス(2) = 3 = 通常敵HP → 撃破
		expect(attackResult.defeated).toBe(true);

		// 行動ログにコンボ発動メッセージが含まれる
		const comboLog = attackResult.state.actionLog.find(
			(log) => log.message === "奇襲コンボ発動！",
		);
		expect(comboLog).toBeDefined();
	});

	it("jump失敗→攻撃（同方向）では奇襲コンボが発動しない", () => {
		// 着地先(3,2)に敵を配置してジャンプ失敗にする
		// プレイヤー(3,4)、敵(3,2)=着地先
		resetTestEnemySeq();
		const enemy = createTestEnemy("normal", { x: 3, y: 2 });
		const s = createTestState({
			enemies: [enemy],
			deck: {
				hand: createTestHand(["jump", "attack", "attack"]),
				usedCardIds: [],
			},
			player: {
				position: { x: 3, y: 4 },
				hp: 10,
				maxHp: 10,
			},
		});

		// ジャンプ: 上方向 (3,4)→(3,2) は敵がいるので失敗
		const jumpResult = executeJump(s, "test-card-0", "up");
		expect(jumpResult.jumped).toBe(false);
		const afterJump = jumpResult.state;

		// comboHistoryは方向なし（ジャンプ失敗）
		expect(afterJump.comboHistory).toEqual({
			lastCardType: "jump",
			lastDirection: null,
		});

		// 攻撃: 上方向→奇襲コンボは発動しない
		// 敵は(3,2)にいるがプレイヤー(3,4)からは隣接していない
		// 隣接位置(3,3)に敵を配置し直してヒットさせる
		const afterJumpWithEnemy = {
			...afterJump,
			enemies: [{ ...enemy, position: { x: 3, y: 3 } }],
		};

		const attackResult = executeAttack(afterJumpWithEnemy, "test-card-1", "up");
		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBeUndefined();

		// コンボ発動ログがない
		const comboLog = attackResult.state.actionLog.find(
			(log) => log.message === "奇襲コンボ発動！",
		);
		expect(comboLog).toBeUndefined();
	});

	it("jump成功→攻撃（異方向）ではコンボ不発", () => {
		// プレイヤー(3,4)、ジャンプ上方向→(3,2)、敵を(4,2)=右方向に配置
		resetTestEnemySeq();
		const enemy = createTestEnemy("normal", { x: 4, y: 2 });
		const s = createTestState({
			enemies: [enemy],
			deck: {
				hand: createTestHand(["jump", "attack", "attack"]),
				usedCardIds: [],
			},
			player: {
				position: { x: 3, y: 4 },
				hp: 10,
				maxHp: 10,
			},
		});

		// ジャンプ: 上方向 (3,4)→(3,2)
		const jumpResult = executeJump(s, "test-card-0", "up");
		expect(jumpResult.jumped).toBe(true);

		// 攻撃: 右方向（異方向）→コンボ不発
		const attackResult = executeAttack(
			jumpResult.state,
			"test-card-1",
			"right",
		);
		expect(attackResult.hit).toBe(true);
		expect(attackResult.comboType).toBeUndefined();
	});
});
