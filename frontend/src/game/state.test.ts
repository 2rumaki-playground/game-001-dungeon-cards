import { describe, expect, it } from "vitest";
import {
	ENEMY_HP,
	ENEMY_PARAMS,
	getEnemyCount,
	getMapSize,
	HAND_LIMIT,
	INITIAL_FLOOR,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import {
	addActionLog,
	changeScreen,
	changeTurn,
	createEnemiesForFloor,
	createEnemiesFromPositions,
	createInitialGameState,
	createInitialPlayer,
	createTitleScreenState,
	removeEnemy,
	returnToTitle,
	setFloor,
	setTile,
	startNewGame,
	updateEnemy,
	updatePlayer,
} from "./state";

describe("state", () => {
	describe("createInitialPlayer", () => {
		it("初期HP/APが正しい", () => {
			const player = createInitialPlayer();
			expect(player.hp).toBe(PLAYER_INITIAL_HP);
			expect(player.maxHp).toBe(PLAYER_INITIAL_HP);
			expect(player.ap).toBe(MAX_AP);
			expect(player.maxAp).toBe(MAX_AP);
		});
	});

	describe("createEnemiesFromPositions", () => {
		it("タイプ未指定時はnormalになる", () => {
			const positions = [{ x: 1, y: 1 }];
			const enemies = createEnemiesFromPositions(positions);
			expect(enemies[0].type).toBe("normal");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.normal.hp);
			expect(enemies[0].maxHp).toBe(ENEMY_PARAMS.normal.hp);
		});

		it("heavyタイプ指定時に対応HPが設定される", () => {
			const positions = [{ x: 2, y: 2 }];
			const enemies = createEnemiesFromPositions(positions, "heavy");
			expect(enemies[0].type).toBe("heavy");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.heavy.hp);
			expect(enemies[0].maxHp).toBe(ENEMY_PARAMS.heavy.hp);
		});

		it("scoutタイプ指定時に対応HPが設定される", () => {
			const positions = [{ x: 3, y: 3 }];
			const enemies = createEnemiesFromPositions(positions, "scout");
			expect(enemies[0].type).toBe("scout");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.scout.hp);
			expect(enemies[0].maxHp).toBe(ENEMY_PARAMS.scout.hp);
		});

		it("minibossタイプ指定時に対応HPが設定される", () => {
			const positions = [{ x: 2, y: 2 }];
			const enemies = createEnemiesFromPositions(positions, "miniboss");
			expect(enemies[0].type).toBe("miniboss");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.miniboss.hp);
			expect(enemies[0].maxHp).toBe(ENEMY_PARAMS.miniboss.hp);
		});

		it("bossタイプ指定時に対応HPが設定される", () => {
			const positions = [{ x: 2, y: 2 }];
			const enemies = createEnemiesFromPositions(positions, "boss");
			expect(enemies[0].type).toBe("boss");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.boss.hp);
			expect(enemies[0].maxHp).toBe(ENEMY_PARAMS.boss.hp);
		});
	});

	describe("createEnemiesForFloor", () => {
		const positions = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
			{ x: 3, y: 3 },
		];

		it("階層1: normal×3", () => {
			const enemies = createEnemiesForFloor(positions, 1);
			expect(enemies).toHaveLength(3);
			expect(enemies.every((e) => e.type === "normal")).toBe(true);
			expect(enemies.every((e) => e.hp === ENEMY_PARAMS.normal.hp)).toBe(true);
		});

		it("階層3: normal×2 + scout×1", () => {
			const enemies = createEnemiesForFloor(positions, 3);
			expect(enemies[0].type).toBe("normal");
			expect(enemies[1].type).toBe("normal");
			expect(enemies[2].type).toBe("scout");
			expect(enemies[2].hp).toBe(ENEMY_PARAMS.scout.hp);
		});

		it("階層5: miniboss×1 + normal×1 + heavy×1", () => {
			const enemies = createEnemiesForFloor(positions, 5);
			expect(enemies[0].type).toBe("miniboss");
			expect(enemies[0].hp).toBe(ENEMY_PARAMS.miniboss.hp);
			expect(enemies[1].type).toBe("normal");
			expect(enemies[2].type).toBe("heavy");
			expect(enemies[2].hp).toBe(ENEMY_PARAMS.heavy.hp);
		});

		it("各敵にIDと座標が設定される", () => {
			const enemies = createEnemiesForFloor(positions, 1);
			expect(enemies[0].id).toBe("enemy-1");
			expect(enemies[1].id).toBe("enemy-2");
			expect(enemies[2].id).toBe("enemy-3");
			expect(enemies[0].position).toEqual({ x: 1, y: 1 });
			expect(enemies[2].position).toEqual({ x: 3, y: 3 });
		});

		it("4体以上: 構成テーブルの3体 + 残りはnormal", () => {
			const positions4 = [
				{ x: 1, y: 1 },
				{ x: 2, y: 2 },
				{ x: 3, y: 3 },
				{ x: 4, y: 4 },
			];
			// 階層3: normal×2 + scout×1 → 4体目はnormal
			const enemies = createEnemiesForFloor(positions4, 3);
			expect(enemies).toHaveLength(4);
			expect(enemies[0].type).toBe("normal");
			expect(enemies[1].type).toBe("normal");
			expect(enemies[2].type).toBe("scout");
			expect(enemies[3].type).toBe("normal");
		});

		it("minibossタイプの敵が正しいHPで生成される", () => {
			const enemies = createEnemiesForFloor(positions, 5);
			const miniboss = enemies.find((e) => e.type === "miniboss");
			expect(miniboss).toBeDefined();
			expect(miniboss?.hp).toBe(ENEMY_PARAMS.miniboss.hp);
			expect(miniboss?.maxHp).toBe(ENEMY_PARAMS.miniboss.hp);
		});

		it("6体: 構成テーブルの3体 + 残り3体はすべてnormal", () => {
			const positions6 = [
				{ x: 1, y: 1 },
				{ x: 2, y: 2 },
				{ x: 3, y: 3 },
				{ x: 4, y: 4 },
				{ x: 5, y: 5 },
				{ x: 1, y: 5 },
			];
			// 階層7: normal×1 + heavy×1 + scout×1 → 残り3体はnormal
			const enemies = createEnemiesForFloor(positions6, 7);
			expect(enemies).toHaveLength(6);
			expect(enemies[0].type).toBe("normal");
			expect(enemies[1].type).toBe("heavy");
			expect(enemies[2].type).toBe("scout");
			expect(enemies[3].type).toBe("normal");
			expect(enemies[4].type).toBe("normal");
			expect(enemies[5].type).toBe("normal");
		});
	});

	describe("createTitleScreenState", () => {
		it("タイトル画面の初期状態を作成", () => {
			const state = createTitleScreenState(12345);
			expect(state.screen).toBe("title");
			expect(state.turn).toBe("player");
			expect(state.floor).toBe(INITIAL_FLOOR);
			expect(state.rng.seed).toBe(12345);
		});

		it("シード未指定時はランダムシード", () => {
			const state1 = createTitleScreenState();
			const state2 = createTitleScreenState();
			expect(state1.rng.seed).not.toBe(state2.rng.seed);
		});
	});

	describe("createInitialGameState", () => {
		it("ゲーム画面の初期状態を作成", () => {
			const state = createInitialGameState(12345);
			const expectedSize = getMapSize(INITIAL_FLOOR);
			expect(state.screen).toBe("game");
			expect(state.turn).toBe("player");
			expect(state.floor).toBe(INITIAL_FLOOR);
			expect(state.rng.seed).toBe(12345);
			expect(state.map.length).toBe(expectedSize.height);
			for (const row of state.map) {
				expect(row.length).toBe(expectedSize.width);
			}
			expect(state.enemies.length).toBe(getEnemyCount(INITIAL_FLOOR));
			for (const enemy of state.enemies) {
				expect(enemy.hp).toBe(ENEMY_HP);
				expect(enemy.maxHp).toBe(ENEMY_HP);
				expect(state.map[enemy.position.y][enemy.position.x].type).toBe(
					"floor",
				);
			}
			expect(
				state.map[state.player.position.y][state.player.position.x].type,
			).toBe("floor");
			const stairsCount = state.map
				.flat()
				.filter((tile) => tile.type === "stairs").length;
			expect(stairsCount).toBe(1);
		});
	});

	describe("startNewGame", () => {
		it("ゲーム画面に遷移する", () => {
			const titleState = createTitleScreenState(12345);
			const gameState = startNewGame(titleState);
			expect(gameState.screen).toBe("game");
			expect(gameState.turn).toBe("player");
			expect(gameState.floor).toBe(INITIAL_FLOOR);
		});

		it("マップと敵が初期化される", () => {
			const titleState = createTitleScreenState(12345);
			const gameState = startNewGame(titleState);
			const expectedSize = getMapSize(INITIAL_FLOOR);
			expect(gameState.map.length).toBe(expectedSize.height);
			for (const row of gameState.map) {
				expect(row.length).toBe(expectedSize.width);
			}
			expect(gameState.enemies.length).toBe(getEnemyCount(INITIAL_FLOOR));
			for (const enemy of gameState.enemies) {
				expect(enemy.hp).toBe(ENEMY_HP);
				expect(enemy.maxHp).toBe(ENEMY_HP);
			}
		});

		it("デッキが生成され手札がドローされる", () => {
			const titleState = createTitleScreenState(12345);
			const gameState = startNewGame(titleState);
			expect(gameState.deck.hand.length).toBe(HAND_LIMIT);
			expect(gameState.deck.drawPile.length).toBeGreaterThan(0);
		});

		it("プレイヤーのHP/APが初期値", () => {
			const titleState = createTitleScreenState(12345);
			const gameState = startNewGame(titleState);
			expect(gameState.player.hp).toBe(PLAYER_INITIAL_HP);
			expect(gameState.player.ap).toBe(MAX_AP);
		});
	});

	describe("changeScreen", () => {
		it("画面を変更", () => {
			const state = createTitleScreenState(12345);
			const newState = changeScreen(state, "game");
			expect(newState.screen).toBe("game");
			expect(state.screen).toBe("title"); // 元の状態は変更されない
		});
	});

	describe("changeTurn", () => {
		it("ターンを変更", () => {
			const state = createTitleScreenState(12345);
			const newState = changeTurn(state, "enemy");
			expect(newState.turn).toBe("enemy");
		});
	});

	describe("rng", () => {
		it("状態更新でRNG参照が共有されない", () => {
			const state = createTitleScreenState(12345);
			const newState = changeScreen(state, "game");
			expect(newState.rng).not.toBe(state.rng);
			const newStateValue = newState.rng.random();
			const oldStateValue = state.rng.random();
			expect(oldStateValue).toBe(newStateValue);
		});
	});

	describe("setFloor", () => {
		it("階層を設定", () => {
			const state = createTitleScreenState(12345);
			const newState = setFloor(state, 5);
			expect(newState.floor).toBe(5);
		});
	});

	describe("updatePlayer", () => {
		it("プレイヤーを更新", () => {
			const state = createTitleScreenState(12345);
			const newState = updatePlayer(state, (p) => ({ ...p, hp: 5 }));
			expect(newState.player.hp).toBe(5);
			expect(state.player.hp).toBe(PLAYER_INITIAL_HP); // 元の状態は変更されない
		});
	});

	describe("updateEnemy / removeEnemy", () => {
		it("敵を更新", () => {
			const state = createTitleScreenState(12345);
			state.enemies = [
				{ id: "e1", type: "normal", position: { x: 1, y: 1 }, hp: 3, maxHp: 3 },
				{ id: "e2", type: "normal", position: { x: 2, y: 2 }, hp: 3, maxHp: 3 },
			];
			const newState = updateEnemy(state, "e1", (e) => ({ ...e, hp: 1 }));
			expect(newState.enemies[0].hp).toBe(1);
			expect(newState.enemies[1].hp).toBe(3);
		});

		it("敵を削除", () => {
			const state = createTitleScreenState(12345);
			state.enemies = [
				{ id: "e1", type: "normal", position: { x: 1, y: 1 }, hp: 3, maxHp: 3 },
				{ id: "e2", type: "normal", position: { x: 2, y: 2 }, hp: 3, maxHp: 3 },
			];
			const newState = removeEnemy(state, "e1");
			expect(newState.enemies.length).toBe(1);
			expect(newState.enemies[0].id).toBe("e2");
		});
	});

	describe("returnToTitle", () => {
		it("タイトル画面に遷移する", () => {
			const gameState = createInitialGameState(12345);
			const titleState = returnToTitle(gameState);
			expect(titleState.screen).toBe("title");
		});

		it("ゲーム状態がリセットされる", () => {
			const gameState = createInitialGameState(12345);
			const titleState = returnToTitle(gameState);
			expect(titleState.floor).toBe(INITIAL_FLOOR);
			expect(titleState.player.hp).toBe(PLAYER_INITIAL_HP);
			expect(titleState.player.ap).toBe(MAX_AP);
			expect(titleState.enemies).toEqual([]);
			expect(titleState.deck.hand).toEqual([]);
			expect(titleState.deck.drawPile).toEqual([]);
			expect(titleState.deck.discardPile).toEqual([]);
			expect(titleState.actionLog).toEqual([]);
		});
	});

	describe("addActionLog", () => {
		it("行動ログを追加", () => {
			const state = createTitleScreenState(12345);
			const newState = addActionLog(state, "テストメッセージ");
			expect(newState.actionLog.length).toBe(1);
			expect(newState.actionLog[0].message).toBe("テストメッセージ");
		});

		it("最新のログが先頭に追加される", () => {
			let state = createTitleScreenState(12345);
			state = addActionLog(state, "メッセージ1");
			state = addActionLog(state, "メッセージ2");
			expect(state.actionLog[0].message).toBe("メッセージ2");
			expect(state.actionLog[1].message).toBe("メッセージ1");
		});

		it("上限を超えると古いログが削除される", () => {
			let state = createTitleScreenState(12345);
			for (let i = 0; i < 55; i++) {
				state = addActionLog(state, `メッセージ${i}`, 50);
			}
			expect(state.actionLog.length).toBe(50);
			expect(state.actionLog[0].message).toBe("メッセージ54");
		});
	});

	describe("setTile", () => {
		it("指定座標のタイルが変更される", () => {
			const state = createTestState();
			const result = setTile(state, 3, 3, { type: "trap" });
			expect(result.map[3][3].type).toBe("trap");
		});

		it("元のGameStateが変更されない（イミュータブル）", () => {
			const state = createTestState();
			const original = state.map[3][3].type;
			setTile(state, 3, 3, { type: "trap" });
			expect(state.map[3][3].type).toBe(original);
		});

		it("他の座標のタイルは変更されない", () => {
			const state = createTestState();
			const result = setTile(state, 3, 3, { type: "treasure" });
			expect(result.map[2][3].type).toBe("floor");
			expect(result.map[3][2].type).toBe("floor");
		});
	});
});
