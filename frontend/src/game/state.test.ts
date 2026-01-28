import { describe, expect, it } from "vitest";
import { INITIAL_FLOOR, MAX_AP, PLAYER_INITIAL_HP } from "../constants";
import {
	addActionLog,
	changeScreen,
	changeTurn,
	createInitialPlayer,
	createTitleScreenState,
	removeEnemy,
	setFloor,
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
				{ id: "e1", position: { x: 1, y: 1 }, hp: 3, maxHp: 3 },
				{ id: "e2", position: { x: 2, y: 2 }, hp: 3, maxHp: 3 },
			];
			const newState = updateEnemy(state, "e1", (e) => ({ ...e, hp: 1 }));
			expect(newState.enemies[0].hp).toBe(1);
			expect(newState.enemies[1].hp).toBe(3);
		});

		it("敵を削除", () => {
			const state = createTitleScreenState(12345);
			state.enemies = [
				{ id: "e1", position: { x: 1, y: 1 }, hp: 3, maxHp: 3 },
				{ id: "e2", position: { x: 2, y: 2 }, hp: 3, maxHp: 3 },
			];
			const newState = removeEnemy(state, "e1");
			expect(newState.enemies.length).toBe(1);
			expect(newState.enemies[0].id).toBe("e2");
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
});
