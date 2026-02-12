import { beforeEach, describe, expect, it } from "vitest";
import {
	ENEMY_PARAMS,
	MAP_HEIGHT,
	MAP_WIDTH,
	MAX_AP,
	PLAYER_INITIAL_HP,
} from "../constants";
import {
	createTestEnemy,
	createTestHand,
	createTestMap,
	createTestState,
	resetTestEnemySeq,
} from "./createTestFixtures";

describe("createTestMap", () => {
	it("7x7マップを生成する", () => {
		const map = createTestMap();
		expect(map).toHaveLength(MAP_HEIGHT);
		for (const row of map) {
			expect(row).toHaveLength(MAP_WIDTH);
		}
	});

	it("外周が壁、内側が床", () => {
		const map = createTestMap();
		// 外周は壁
		for (let x = 0; x < MAP_WIDTH; x++) {
			expect(map[0][x].type).toBe("wall");
			expect(map[MAP_HEIGHT - 1][x].type).toBe("wall");
		}
		for (let y = 0; y < MAP_HEIGHT; y++) {
			expect(map[y][0].type).toBe("wall");
			expect(map[y][MAP_WIDTH - 1].type).toBe("wall");
		}
		// 内側は床
		for (let y = 1; y < MAP_HEIGHT - 1; y++) {
			for (let x = 1; x < MAP_WIDTH - 1; x++) {
				expect(map[y][x].type).toBe("floor");
			}
		}
	});
});

describe("createTestState", () => {
	it("デフォルト値で生成される", () => {
		const state = createTestState();
		expect(state.screen).toBe("game");
		expect(state.turn).toBe("player");
		expect(state.floor).toBe(1);
		expect(state.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(state.player.maxHp).toBe(PLAYER_INITIAL_HP);
		expect(state.player.ap).toBe(MAX_AP);
		expect(state.player.position).toEqual({ x: 3, y: 3 });
		expect(state.enemies).toEqual([]);
		expect(state.deck.hand).toEqual([]);
		expect(state.actionLog).toEqual([]);
	});

	it("overridesで値を上書きできる", () => {
		const state = createTestState({ turn: "enemy", floor: 5 });
		expect(state.turn).toBe("enemy");
		expect(state.floor).toBe(5);
	});

	it("毎回新しいマップインスタンスを返す", () => {
		const state1 = createTestState();
		const state2 = createTestState();
		expect(state1.map).not.toBe(state2.map);
	});
});

describe("createTestEnemy", () => {
	beforeEach(() => {
		resetTestEnemySeq();
	});

	it("デフォルト値で通常敵を生成する", () => {
		const enemy = createTestEnemy();
		expect(enemy.type).toBe("normal");
		expect(enemy.position).toEqual({ x: 4, y: 3 });
		expect(enemy.hp).toBe(ENEMY_PARAMS.normal.hp);
		expect(enemy.maxHp).toBe(ENEMY_PARAMS.normal.hp);
		expect(enemy.id).toBe("enemy-1");
	});

	it("タイプ指定でHPが自動設定される", () => {
		const boss = createTestEnemy("boss");
		expect(boss.type).toBe("boss");
		expect(boss.hp).toBe(ENEMY_PARAMS.boss.hp);
		expect(boss.maxHp).toBe(ENEMY_PARAMS.boss.hp);

		const heavy = createTestEnemy("heavy");
		expect(heavy.hp).toBe(ENEMY_PARAMS.heavy.hp);
	});

	it("位置を指定できる", () => {
		const enemy = createTestEnemy("normal", { x: 1, y: 2 });
		expect(enemy.position).toEqual({ x: 1, y: 2 });
	});

	it("overridesで任意のフィールドを上書きできる", () => {
		const enemy = createTestEnemy(
			"boss",
			{ x: 4, y: 3 },
			{
				id: "custom-boss",
				hp: 7,
				pendingSkill: { type: "area_attack" },
				enraged: true,
			},
		);
		expect(enemy.id).toBe("custom-boss");
		expect(enemy.hp).toBe(7);
		expect(enemy.maxHp).toBe(ENEMY_PARAMS.boss.hp);
		expect(enemy.pendingSkill).toEqual({ type: "area_attack" });
		expect(enemy.enraged).toBe(true);
	});

	it("複数回呼んでもIDが一意になる", () => {
		const e1 = createTestEnemy();
		const e2 = createTestEnemy();
		expect(e1.id).not.toBe(e2.id);
	});

	it("overridesでtypeを上書きするとhp/maxHpが再計算される", () => {
		const enemy = createTestEnemy("normal", { x: 4, y: 3 }, { type: "boss" });
		expect(enemy.type).toBe("boss");
		expect(enemy.hp).toBe(ENEMY_PARAMS.boss.hp);
		expect(enemy.maxHp).toBe(ENEMY_PARAMS.boss.hp);
	});
});

describe("createTestHand", () => {
	it("CardType配列から手札を生成する", () => {
		const hand = createTestHand(["move", "attack", "jump"]);
		expect(hand).toHaveLength(3);
		expect(hand[0]).toEqual({ id: "card-0", type: "move" });
		expect(hand[1]).toEqual({ id: "card-1", type: "attack" });
		expect(hand[2]).toEqual({ id: "card-2", type: "jump" });
	});

	it("空配列で空の手札を返す", () => {
		const hand = createTestHand([]);
		expect(hand).toEqual([]);
	});
});
