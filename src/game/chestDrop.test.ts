import { describe, expect, it } from "vitest";
import { ENEMY_CARD_TYPE_TABLE } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { GameState } from "../types";
import { RNG } from "../utils/rng";
import {
	checkChestDrop,
	chestRarityToTileType,
	isChestTile,
	placeChestTile,
	rollChestContent,
	rollChestRarity,
} from "./chestDrop";

describe("checkChestDrop", () => {
	it("boss(100%)は必ず当選する", () => {
		for (let seed = 0; seed < 10; seed++) {
			const rng = new RNG(seed);
			const result = checkChestDrop(rng, "boss");
			expect(result).not.toBeNull();
		}
	});

	it("normal(25%)で当選と落選が両方発生する", () => {
		let dropCount = 0;
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			if (checkChestDrop(rng, "normal") !== null) dropCount++;
		}
		expect(dropCount).toBeGreaterThan(0);
		expect(dropCount).toBeLessThan(100);
	});

	it("落選時にnullを返す", () => {
		let foundNull = false;
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			if (checkChestDrop(rng, "normal") === null) {
				foundNull = true;
				break;
			}
		}
		expect(foundNull).toBe(true);
	});

	it("当選時にChestRarityを返す", () => {
		const rng = new RNG(12345);
		const result = checkChestDrop(rng, "boss");
		expect(["common", "rare", "epic"]).toContain(result);
	});
});

describe("rollChestRarity", () => {
	it("100回試行で3種すべて出現する", () => {
		const seen = new Set<string>();
		for (let seed = 0; seed < 100; seed++) {
			const rng = new RNG(seed);
			seen.add(rollChestRarity(rng));
		}
		expect(seen.has("common")).toBe(true);
		expect(seen.has("rare")).toBe(true);
		expect(seen.has("epic")).toBe(true);
	});

	it("commonが最も多い", () => {
		const counts = { common: 0, rare: 0, epic: 0 };
		for (let seed = 0; seed < 1000; seed++) {
			const rng = new RNG(seed);
			counts[rollChestRarity(rng)]++;
		}
		expect(counts.common).toBeGreaterThan(counts.rare);
		expect(counts.rare).toBeGreaterThan(counts.epic);
	});
});

describe("rollChestContent", () => {
	it("回復の光の回復量がレアリティ別に正しい", () => {
		// common: 3, rare: 5
		for (let seed = 0; seed < 200; seed++) {
			const rng = new RNG(seed);
			const content = rollChestContent(rng, "common", "normal");
			if (content.type === "heal") {
				expect(content.healAmount).toBe(3);
				break;
			}
		}
		for (let seed = 0; seed < 200; seed++) {
			const rng = new RNG(seed);
			const content = rollChestContent(rng, "rare", "normal");
			if (content.type === "heal") {
				expect(content.healAmount).toBe(5);
				break;
			}
		}
	});

	it("エピック回復は全回復（healAmountがundefined）", () => {
		for (let seed = 0; seed < 200; seed++) {
			const rng = new RNG(seed);
			const content = rollChestContent(rng, "epic", "normal");
			if (content.type === "heal") {
				expect(content.healAmount).toBeUndefined();
				break;
			}
		}
	});

	it("スクロールで正しいCardExchangeEntryを返す", () => {
		for (let seed = 0; seed < 200; seed++) {
			const rng = new RNG(seed);
			const content = rollChestContent(rng, "common", "heavy");
			if (content.type === "scroll") {
				expect(content.cardExchangeEntry).toEqual({
					acquiredCardType: ENEMY_CARD_TYPE_TABLE.heavy,
					defeatedEnemyType: "heavy",
				});
				break;
			}
		}
	});

	it("回復とスクロールが両方出現する", () => {
		const types = new Set<string>();
		for (let seed = 0; seed < 200; seed++) {
			const rng = new RNG(seed);
			types.add(rollChestContent(rng, "common", "normal").type);
		}
		expect(types.has("heal")).toBe(true);
		expect(types.has("scroll")).toBe(true);
	});
});

describe("placeChestTile", () => {
	it("空き床に配置できる", () => {
		const state = createTestState();
		const pos = { x: 2, y: 2 };
		const result = placeChestTile(state, pos, "common", "normal");
		expect(result).not.toBeNull();
		expect(result?.map[2][2].type).toBe("chest_common");
	});

	it("既チェスト位置の場合は隣接床に配置する", () => {
		const state = createTestState();
		// まず(2,2)にチェストを配置
		const first = placeChestTile(state, { x: 2, y: 2 }, "common", "normal");
		expect(first).not.toBeNull();
		// 同じ位置に再度配置→隣接に配置される
		const result = placeChestTile(
			first as GameState,
			{ x: 2, y: 2 },
			"rare",
			"heavy",
		);
		expect(result).not.toBeNull();
		// 元の位置はcommonのまま
		expect(result?.map[2][2].type).toBe("chest_common");
		// 隣接のいずれかにrareが配置されている
		const neighbors = [
			result?.map[1][2],
			result?.map[3][2],
			result?.map[2][1],
			result?.map[2][3],
		];
		expect(neighbors.some((t) => t?.type === "chest_rare")).toBe(true);
	});

	it("プレイヤー位置には配置しない", () => {
		const state = createTestState();
		// プレイヤーは(3,3)にいる
		const result = placeChestTile(state, { x: 3, y: 3 }, "common", "normal");
		// 隣接の空き床に配置される
		expect(result).not.toBeNull();
		expect(result?.map[3][3].type).toBe("floor");
	});

	it("敵がいる位置には配置しない", () => {
		const state = createTestState({
			enemies: [
				{
					id: "e1",
					type: "normal",
					hp: 3,
					maxHp: 3,
					position: { x: 2, y: 2 },
				},
			],
		});
		const result = placeChestTile(state, { x: 2, y: 2 }, "common", "normal");
		// 敵の位置には配置されず、隣接の空き床に配置される
		expect(result).not.toBeNull();
		expect(result?.map[2][2].type).toBe("floor");
	});

	it("配置不可でnullを返す", () => {
		// 壁で囲まれた位置（壁タイル）
		const state = createTestState();
		const result = placeChestTile(state, { x: 0, y: 0 }, "common", "normal");
		expect(result).toBeNull();
	});

	it("chestMetaにエントリが追加される", () => {
		const state = createTestState();
		const result = placeChestTile(state, { x: 2, y: 2 }, "rare", "miniboss");
		expect(result).not.toBeNull();
		expect(result?.chestMeta["2,2"]).toEqual({
			rarity: "rare",
			defeatedEnemyType: "miniboss",
		});
	});

	it("配置位置の残骸がクリアされる", () => {
		const state = createTestState({ remnants: { "2,2": 1 } });
		const result = placeChestTile(state, { x: 2, y: 2 }, "common", "normal");
		expect(result).not.toBeNull();
		expect(result?.remnants["2,2"]).toBeUndefined();
	});

	it("イミュータブルに更新される", () => {
		const state = createTestState();
		const result = placeChestTile(state, { x: 2, y: 2 }, "common", "normal");
		expect(result).not.toBe(state);
		expect(result?.map).not.toBe(state.map);
		expect(result?.chestMeta).not.toBe(state.chestMeta);
		// 元のstateは変更されていない
		expect(state.map[2][2].type).toBe("floor");
		expect(state.chestMeta["2,2"]).toBeUndefined();
	});
});

describe("chestRarityToTileType", () => {
	it("レアリティに対応するタイルタイプを返す", () => {
		expect(chestRarityToTileType("common")).toBe("chest_common");
		expect(chestRarityToTileType("rare")).toBe("chest_rare");
		expect(chestRarityToTileType("epic")).toBe("chest_epic");
	});
});

describe("isChestTile", () => {
	it("宝箱タイルでtrueを返す", () => {
		expect(isChestTile("chest_common")).toBe(true);
		expect(isChestTile("chest_rare")).toBe(true);
		expect(isChestTile("chest_epic")).toBe(true);
	});

	it("宝箱以外のタイルでfalseを返す", () => {
		expect(isChestTile("floor")).toBe(false);
		expect(isChestTile("wall")).toBe(false);
		expect(isChestTile("trap")).toBe(false);
		expect(isChestTile("rest_area")).toBe(false);
	});
});
