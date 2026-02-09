import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnemyCount, INITIAL_FLOOR } from "../constants";
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
});
