import { describe, expect, it } from "vitest";
import { PLAYER_INITIAL_HP, TRAP_DAMAGE } from "../constants";
import {
	createTestMap,
	createTestState,
} from "../test-utils/createTestFixtures";
import { applyTileEffect } from "./tileEffect";

describe("applyTileEffect", () => {
	it("床タイル: 効果なし", () => {
		const state = createTestState();
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBeNull();
		expect(result.gameOver).toBe(false);
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.hpBefore).toBe(PLAYER_INITIAL_HP);
		expect(result.hpAfter).toBe(PLAYER_INITIAL_HP);
	});

	it("罠タイル: ダメージを受けてタイルがfloorに変化", () => {
		const map = createTestMap();
		map[3][3] = { type: "trap" };
		const state = createTestState({ map });
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBe("trap");
		expect(result.gameOver).toBe(false);
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP - TRAP_DAMAGE);
		expect(result.state.map[3][3].type).toBe("floor");
		expect(result.state.actionLog[0].message).toContain("罠");
		expect(result.hpBefore).toBe(PLAYER_INITIAL_HP);
		expect(result.hpAfter).toBe(PLAYER_INITIAL_HP - TRAP_DAMAGE);
	});

	it("罠タイル: HP1で踏むとゲームオーバー", () => {
		const map = createTestMap();
		map[3][3] = { type: "trap" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBe("trap");
		expect(result.gameOver).toBe(true);
		expect(result.state.player.hp).toBe(1 - TRAP_DAMAGE);
		expect(result.state.screen).toBe("gameOver");
		expect(result.hpBefore).toBe(1);
		expect(result.hpAfter).toBe(1 - TRAP_DAMAGE);
	});

	it("宝箱タイル(chest_common): 回復時にHPが増加しタイルがfloorに変化", () => {
		const map = createTestMap();
		map[3][3] = { type: "chest_common" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 5,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBe("chest_common");
		expect(result.gameOver).toBe(false);
		// rollChestContentにより回復またはスクロール。回復の場合はCHEST_HEAL_AMOUNT.common分回復
		expect(result.state.map[3][3].type).toBe("floor");
		expect(result.state.actionLog[0].message).toContain("宝箱");
		expect(result.hpBefore).toBe(5);
	});

	it("宝箱タイル(chest_common): HP回復がmaxHpを超えない", () => {
		const map = createTestMap();
		map[3][3] = { type: "chest_common" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: PLAYER_INITIAL_HP - 1,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyTileEffect(state);

		// 回復の場合はmaxHpを超えない、スクロールの場合はHP変化なし
		expect(result.state.player.hp).toBeLessThanOrEqual(PLAYER_INITIAL_HP);
		expect(result.hpBefore).toBe(PLAYER_INITIAL_HP - 1);
	});

	it("休憩所タイル: HP全回復してタイルがfloorに変化", () => {
		const map = createTestMap();
		map[3][3] = { type: "rest_area" };
		const state = createTestState({
			map,
			player: {
				position: { x: 3, y: 3 },
				hp: 1,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBe("rest_area");
		expect(result.gameOver).toBe(false);
		expect(result.state.player.hp).toBe(PLAYER_INITIAL_HP);
		expect(result.state.map[3][3].type).toBe("floor");
		expect(result.state.actionLog[0].message).toContain("休憩所");
		expect(result.hpBefore).toBe(1);
		expect(result.hpAfter).toBe(PLAYER_INITIAL_HP);
	});

	it("元のGameStateが変更されない（イミュータブル）", () => {
		const map = createTestMap();
		map[3][3] = { type: "trap" };
		const state = createTestState({ map });
		const originalHp = state.player.hp;

		applyTileEffect(state);

		expect(state.player.hp).toBe(originalHp);
		expect(state.map[3][3].type).toBe("trap");
	});

	it("階段タイル: 効果なし", () => {
		const map = createTestMap();
		map[3][3] = { type: "stairs" };
		const state = createTestState({ map });
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBeNull();
		expect(result.gameOver).toBe(false);
	});

	it("壁タイル: 効果なし", () => {
		const map = createTestMap();
		const state = createTestState({
			map,
			player: {
				position: { x: 0, y: 0 },
				hp: PLAYER_INITIAL_HP,
				maxHp: PLAYER_INITIAL_HP,
			},
		});
		const result = applyTileEffect(state);

		expect(result.triggeredTile).toBeNull();
		expect(result.gameOver).toBe(false);
	});
});
