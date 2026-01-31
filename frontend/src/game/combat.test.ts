import { describe, expect, it } from "vitest";
import {
	ENEMY_ATTACK_DAMAGE,
	ENEMY_HP,
	MAP_HEIGHT,
	MAP_WIDTH,
	MAX_AP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_INITIAL_HP,
} from "../constants";
import type { Enemy, GameMap, GameState, Tile } from "../types";
import { RNG } from "../utils/rng";
import {
	applyDamageToEnemy,
	applyDamageToPlayer,
	checkGameOver,
	isDefeated,
} from "./combat";

/**
 * テスト用の7x7マップを生成（外周壁・内側床）
 */
function createTestMap(): GameMap {
	const map: GameMap = [];
	for (let y = 0; y < MAP_HEIGHT; y++) {
		const row: Tile[] = [];
		for (let x = 0; x < MAP_WIDTH; x++) {
			const isBoundary =
				x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
			row.push({ type: isBoundary ? "wall" : "floor" });
		}
		map.push(row);
	}
	return map;
}

/**
 * テスト用のGameStateを生成
 */
function createTestState(overrides?: Partial<GameState>): GameState {
	const map = createTestMap();
	return {
		screen: "game",
		turn: "player",
		floor: 1,
		map,
		player: {
			position: { x: 3, y: 3 },
			hp: PLAYER_INITIAL_HP,
			maxHp: PLAYER_INITIAL_HP,
			ap: MAX_AP,
			maxAp: MAX_AP,
		},
		enemies: [],
		deck: {
			drawPile: [],
			hand: [],
			discardPile: [],
		},
		actionLog: [],
		rng: new RNG(12345),
		...overrides,
	};
}

describe("isDefeated", () => {
	it("HP0の場合trueを返す", () => {
		expect(isDefeated(0)).toBe(true);
	});

	it("HP負の場合trueを返す", () => {
		expect(isDefeated(-1)).toBe(true);
	});

	it("HP1以上の場合falseを返す", () => {
		expect(isDefeated(1)).toBe(false);
	});

	it("最大HPの場合falseを返す", () => {
		expect(isDefeated(PLAYER_INITIAL_HP)).toBe(false);
	});
});

describe("applyDamageToEnemy", () => {
	it("敵のHPからダメージ量を減算する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		expect(result.enemies[0].hp).toBe(ENEMY_HP - PLAYER_ATTACK_DAMAGE);
	});

	it("HP0以下の敵をマップから除去する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 1,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		expect(result.enemies).toHaveLength(0);
	});

	it("敵撃破時に行動ログを記録する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: 1,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("敵を倒した");
	});

	it("ダメージ時に行動ログを記録する", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("敵にダメージを与えた");
	});

	it("複数の敵のうち1体にダメージを与えても他の敵は影響を受けない", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
			{
				id: "enemy-2",
				position: { x: 2, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const result = applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		const enemy2 = result.enemies.find((e) => e.id === "enemy-2");
		expect(enemy2).toBeDefined();
		expect(enemy2?.hp).toBe(ENEMY_HP);
	});

	it("存在しない敵IDを指定した場合、状態が変更されない", () => {
		const state = createTestState();
		const result = applyDamageToEnemy(
			state,
			"nonexistent",
			PLAYER_ATTACK_DAMAGE,
		);

		expect(result).toBe(state);
		expect(result.actionLog).toHaveLength(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const enemies: Enemy[] = [
			{
				id: "enemy-1",
				position: { x: 4, y: 3 },
				hp: ENEMY_HP,
				maxHp: ENEMY_HP,
			},
		];
		const state = createTestState({ enemies });
		const originalHp = state.enemies[0].hp;

		applyDamageToEnemy(state, "enemy-1", PLAYER_ATTACK_DAMAGE);

		expect(state.enemies[0].hp).toBe(originalHp);
	});
});

describe("applyDamageToPlayer", () => {
	it("プレイヤーのHPからダメージ量を減算する", () => {
		const state = createTestState();
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(PLAYER_INITIAL_HP - ENEMY_ATTACK_DAMAGE);
	});

	it("ダメージ時に行動ログを記録する", () => {
		const state = createTestState();
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("プレイヤーがダメージを受けた");
	});

	it("HPが0以下になっても状態を返す（ゲームオーバー判定は別関数）", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const result = applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(result.player.hp).toBe(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState();
		const originalHp = state.player.hp;

		applyDamageToPlayer(state, ENEMY_ATTACK_DAMAGE);

		expect(state.player.hp).toBe(originalHp);
	});
});

describe("checkGameOver", () => {
	it("プレイヤーHP0以下でゲームオーバー画面に遷移する", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 0,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const result = checkGameOver(state);

		expect(result.screen).toBe("gameOver");
	});

	it("プレイヤーHP負でもゲームオーバー画面に遷移する", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: -2,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const result = checkGameOver(state);

		expect(result.screen).toBe("gameOver");
	});

	it("ゲームオーバー時に行動ログを記録する", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 0,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const result = checkGameOver(state);

		expect(result.actionLog.length).toBeGreaterThan(0);
		expect(result.actionLog[0].message).toBe("ゲームオーバー");
	});

	it("プレイヤーHP1以上の場合、状態が変更されない", () => {
		const state = createTestState();
		const result = checkGameOver(state);

		expect(result.screen).toBe("game");
		expect(result.actionLog).toHaveLength(0);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const state = createTestState({
			player: {
				position: { x: 3, y: 3 },
				hp: 0,
				maxHp: PLAYER_INITIAL_HP,
				ap: MAX_AP,
				maxAp: MAX_AP,
			},
		});
		const originalScreen = state.screen;

		checkGameOver(state);

		expect(state.screen).toBe(originalScreen);
	});
});
