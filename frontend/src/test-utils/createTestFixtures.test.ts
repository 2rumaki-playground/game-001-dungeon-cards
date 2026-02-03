import { describe, expect, it } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH, MAX_AP, PLAYER_INITIAL_HP } from "../constants";
import { createTestMap, createTestState } from "./createTestFixtures";

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
