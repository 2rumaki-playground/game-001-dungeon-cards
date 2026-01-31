import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
