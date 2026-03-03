import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_PERSONALITY,
	getEnemyCount,
	INITIAL_FLOOR,
} from "../constants";
import { createTitleScreenState } from "../game/state";
import { deleteSaveData, hasSaveData, loadGame, saveGame } from "./storage";

// localStorage のモック
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value.toString();
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
});

describe("storage", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	it("should save and load game state", () => {
		const originalState = createTitleScreenState(12345);
		// RNGを進めておく
		originalState.rng.random();
		const nextRandom = originalState.rng.clone().random();

		saveGame(originalState);

		expect(localStorage.setItem).toHaveBeenCalled();
		expect(hasSaveData()).toBe(true);

		const loadedState = loadGame();

		expect(loadedState).not.toBeNull();
		if (loadedState) {
			expect(loadedState.floor).toBe(originalState.floor);
			expect(loadedState.rng.seed).toBe(originalState.rng.seed);

			// RNGの状態が正しく復元されているか（次の乱数が同じになるか）
			expect(loadedState.rng.random()).toBe(nextRandom);
		}
	});

	it("should delete save data", () => {
		const state = createTitleScreenState();
		saveGame(state);
		expect(hasSaveData()).toBe(true);

		deleteSaveData();
		expect(hasSaveData()).toBe(false);
		expect(loadGame()).toBeNull();
	});

	it("should return null if invalid json", () => {
		localStorageMock.setItem("dungeon-cards-save", "invalid json");
		// console.error をモックしてエラー出力を抑制
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(loadGame()).toBeNull();

		consoleSpy.mockRestore();
	});

	it("should return null if required properties are missing", () => {
		const invalidStates = [
			{}, // empty
			{ floor: 1 }, // missing player, rng
			{ floor: 1, player: { hp: 10 } }, // missing rng
			{ floor: 1, player: { hp: 10 }, rng: {} }, // invalid rng
			{ floor: "1", player: { hp: 10 }, rng: { seed: 1, state: 1 } }, // invalid floor type
		];

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		for (const state of invalidStates) {
			localStorageMock.setItem("dungeon-cards-save", JSON.stringify(state));
			expect(loadGame()).toBeNull();
		}

		warnSpy.mockRestore();
	});

	it("should add default type to enemies without type field (backward compatibility)", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			enemies: [
				{ id: "e1", position: { x: 1, y: 1 }, hp: 3, maxHp: 3 },
				{ id: "e2", position: { x: 2, y: 2 }, hp: 5, maxHp: 5 },
			],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		if (loaded) {
			for (const enemy of loaded.enemies) {
				expect(enemy.type).toBe("normal");
			}
		}
	});

	it("should preserve existing type field on enemies", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			enemies: [
				{ id: "e1", position: { x: 1, y: 1 }, hp: 5, maxHp: 5, type: "heavy" },
			],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		if (loaded) {
			expect(loaded.enemies[0].type).toBe("heavy");
		}
	});

	it("should convert old 3-zone deck format to hand-only format (backward compatibility)", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			deck: {
				deckOrder: [{ id: "c1", type: "move" }],
				drawPile: [{ id: "c2", type: "fire" }],
				hand: [{ id: "c3", type: "jump" }],
				discardPile: [{ id: "c4", type: "wait" }],
			},
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		if (loaded) {
			// 旧3ゾーンのカードがすべてhandに統合される
			expect(loaded.deck.hand).toHaveLength(3);
			expect(loaded.deck.usedCardIds).toEqual([]);
		}
	});

	it("should sanitize invalid defeatedEnemyCount to 0", () => {
		const state = createTitleScreenState(42);
		const invalidCounts = ["abc", null, undefined, -1];

		for (const count of invalidCounts) {
			const saveData = {
				...state,
				screen: "game",
				defeatedEnemyCount: count,
				rng: state.rng.serialize(),
			};
			localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

			const loaded = loadGame();
			expect(loaded).not.toBeNull();
			expect(loaded?.defeatedEnemyCount).toBe(0);
		}
	});

	it("should floor fractional defeatedEnemyCount", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			defeatedEnemyCount: 2.5,
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.defeatedEnemyCount).toBe(2);
	});

	it("should clamp defeatedEnemyCount to getEnemyCount(floor)", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			defeatedEnemyCount: 999,
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.defeatedEnemyCount).toBe(getEnemyCount(INITIAL_FLOOR));
	});

	it("should fallback isCleared to false for old save data", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			// isCleared フィールドなし（旧セーブデータ）
		};
		// isCleared プロパティを明示的に削除
		const { isCleared: _, ...saveDataWithoutIsCleared } = saveData as Record<
			string,
			unknown
		>;
		localStorageMock.setItem(
			"dungeon-cards-save",
			JSON.stringify(saveDataWithoutIsCleared),
		);

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.isCleared).toBe(false);
	});

	it("should restore victory screen to game screen", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "victory",
			isCleared: true,
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.screen).toBe("game");
		expect(loaded?.isCleared).toBe(true);
	});

	it("should add default actor to actionLog entries without actor field", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			actionLog: [{ id: "1", message: "旧ログ", timestamp: 1000 }],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.actionLog[0].actor).toBe("system");
	});

	it("should fallback invalid actor to system", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			actionLog: [
				{ id: "1", actor: "foo", message: "不正actor", timestamp: 1000 },
			],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.actionLog[0].actor).toBe("system");
	});

	it("should fallback non-array actionLog to empty array", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			actionLog: "not-an-array",
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.actionLog).toEqual([]);
	});

	it("should skip null/undefined entries in actionLog", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			actionLog: [
				null,
				{ id: "1", actor: "player", message: "有効", timestamp: 1000 },
				undefined,
			],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.actionLog).toHaveLength(1);
		expect(loaded?.actionLog[0].actor).toBe("player");
	});

	it("should fallback undefined rooms to empty array", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
		};
		const saveDataWithoutRooms = {
			...(saveData as Record<string, unknown>),
		};
		delete (saveDataWithoutRooms as Record<string, unknown>).rooms;
		localStorageMock.setItem(
			"dungeon-cards-save",
			JSON.stringify(saveDataWithoutRooms),
		);

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.rooms).toEqual([]);
	});

	it("should filter out invalid room entries", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rooms: [
				{ x: 1, y: 2, width: 3, height: 4 },
				null,
				{ x: "bad", y: 2, width: 3, height: 4 },
				{ x: 1, y: -1, width: 3, height: 4 },
				{ x: 1, y: 2, width: 0, height: 4 },
				{ x: 1, y: 2, width: 3, height: -1 },
				{ x: 1, y: 2, width: 3 },
				{ x: 5, y: 6, width: 7, height: 8 },
			],
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.rooms).toEqual([
			{ x: 1, y: 2, width: 3, height: 4 },
			{ x: 5, y: 6, width: 7, height: 8 },
		]);
	});

	it("should preserve valid rooms", () => {
		const state = createTitleScreenState(42);
		const validRooms = [
			{ x: 0, y: 0, width: 5, height: 3 },
			{ x: 10, y: 10, width: 4, height: 4 },
		];
		const saveData = {
			...state,
			screen: "game",
			rooms: validRooms,
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.rooms).toEqual(validRooms);
	});

	it("should return null if screen is invalid", () => {
		const validState = createTitleScreenState();
		const invalidState = {
			...validState,
			screen: "invalid-screen",
			rng: validState.rng.serialize(),
		};

		localStorageMock.setItem(
			"dungeon-cards-save",
			JSON.stringify(invalidState),
		);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(loadGame()).toBeNull();

		warnSpy.mockRestore();
	});

	it("saveGameでvisitedTilesがArrayとして保存される", () => {
		const state = createTitleScreenState(42);
		state.visitedTiles = new Set(["1,1", "2,2"]);
		saveGame(state);

		const saved = JSON.parse(
			localStorageMock.setItem.mock.calls[0][1] as string,
		);
		expect(Array.isArray(saved.visitedTiles)).toBe(true);
		expect(saved.visitedTiles).toContain("1,1");
		expect(saved.visitedTiles).toContain("2,2");
	});

	it("loadGameでArrayがSetに復元される", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: ["3,3", "4,4"],
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.visitedTiles).toBeInstanceOf(Set);
		expect(loaded?.visitedTiles.has("3,3")).toBe(true);
		expect(loaded?.visitedTiles.has("4,4")).toBe(true);
	});

	it("旧セーブデータ（visitedTilesなし）はマップ全体が訪問済みとなる", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			map: [
				[{ type: "wall" }, { type: "floor" }],
				[{ type: "floor" }, { type: "stairs" }],
			],
			rng: state.rng.serialize(),
		};
		// visitedTiles フィールドを削除
		delete (saveData as Record<string, unknown>).visitedTiles;
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.visitedTiles.has("0,0")).toBe(true);
		expect(loaded?.visitedTiles.has("1,0")).toBe(true);
		expect(loaded?.visitedTiles.has("0,1")).toBe(true);
		expect(loaded?.visitedTiles.has("1,1")).toBe(true);
		expect(loaded?.visitedTiles.size).toBe(4);
	});

	it("personalityが正しく保存・復元される", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			personality: "cheerful",
			rng: state.rng.serialize(),
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.personality).toBe("cheerful");
	});

	it("旧セーブデータ（personalityなし）はデフォルト性格にフォールバック", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
		};
		delete (saveData as Record<string, unknown>).personality;
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.personality).toBe(DEFAULT_PERSONALITY);
	});

	it("不正なpersonality値はデフォルト性格にフォールバック", () => {
		const invalidValues = ["invalid", 123, null, "", "Bold"];
		for (const value of invalidValues) {
			const state = createTitleScreenState(42);
			const saveData = {
				...state,
				screen: "game",
				personality: value,
				rng: state.rng.serialize(),
			};
			localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

			const loaded = loadGame();
			expect(loaded).not.toBeNull();
			expect(loaded?.personality).toBe(DEFAULT_PERSONALITY);
		}
	});

	it("achievedMilestonesが正しく保存される", () => {
		const state = createTitleScreenState(42);
		state.achievedMilestones = new Set([
			"first_defeat" as const,
			"first_trap" as const,
		]);
		saveGame(state);

		const saved = JSON.parse(
			localStorageMock.setItem.mock.calls[0][1] as string,
		);
		expect(Array.isArray(saved.achievedMilestones)).toBe(true);
		expect(saved.achievedMilestones).toContain("first_defeat");
		expect(saved.achievedMilestones).toContain("first_trap");
	});

	it("loadGameでachievedMilestonesのArrayがSetに復元される", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
			achievedMilestones: ["first_defeat", "ten_defeats"],
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.achievedMilestones).toBeInstanceOf(Set);
		expect(loaded?.achievedMilestones.has("first_defeat")).toBe(true);
		expect(loaded?.achievedMilestones.has("ten_defeats")).toBe(true);
	});

	it("旧セーブデータ（achievedMilestonesなし）は空Setにフォールバック", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
		};
		delete (saveData as Record<string, unknown>).achievedMilestones;
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.achievedMilestones).toBeInstanceOf(Set);
		expect(loaded?.achievedMilestones.size).toBe(0);
	});

	it("不正なachievedMilestonesエントリは除外される", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
			achievedMilestones: [
				"first_defeat",
				"invalid_milestone",
				123,
				null,
				"first_trap",
			],
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.achievedMilestones.size).toBe(2);
		expect(loaded?.achievedMilestones.has("first_defeat")).toBe(true);
		expect(loaded?.achievedMilestones.has("first_trap")).toBe(true);
	});

	it("pendingMilestoneが有効値のとき正しく復元される", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
			pendingMilestone: "first_defeat",
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.pendingMilestone).toBe("first_defeat");
	});

	it("pendingMilestoneが不正値のときnullになる", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
			pendingMilestone: "invalid_milestone",
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.pendingMilestone).toBeNull();
	});

	it("pendingMilestoneが未設定のときnullになる", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [],
		};
		delete (saveData as Record<string, unknown>).pendingMilestone;
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		expect(loaded?.pendingMilestone).toBeNull();
	});

	it("不正なvisitedTilesエントリは除外され有効な座標のみ残る", () => {
		const state = createTitleScreenState(42);
		const saveData = {
			...state,
			screen: "game",
			rng: state.rng.serialize(),
			visitedTiles: [123, null, "invalid", "1,2", "bad,data"],
		};
		localStorageMock.setItem("dungeon-cards-save", JSON.stringify(saveData));

		const loaded = loadGame();
		expect(loaded).not.toBeNull();
		// 有効なエントリは "1,2" のみ
		expect(loaded?.visitedTiles.size).toBe(1);
		expect(loaded?.visitedTiles.has("1,2")).toBe(true);
	});
});
