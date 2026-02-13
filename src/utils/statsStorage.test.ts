import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PLAY_SESSIONS } from "../constants";
import type { PlaySession } from "../types";
import {
	clearPlaySessions,
	loadPlaySessions,
	savePlaySession,
} from "./statsStorage";

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

function createTestSession(overrides?: Partial<PlaySession>): PlaySession {
	return {
		id: "test-id",
		startedAt: 1000,
		endedAt: 2000,
		maxFloor: 5,
		result: "death",
		deathCause: "enemy_attack",
		cardUsage: { move: 10, attack: 5, strong_attack: 2, jump: 1, wait: 3 },
		totalDamageDealt: 20,
		totalDamageTaken: 10,
		turnCount: 15,
		...overrides,
	};
}

describe("statsStorage", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe("loadPlaySessions", () => {
		it("データがない場合は空配列を返す", () => {
			expect(loadPlaySessions()).toEqual([]);
		});

		it("不正なJSONの場合は空配列を返す", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			localStorageMock.setItem("dungeon-cards-stats", "invalid json");
			expect(loadPlaySessions()).toEqual([]);
			consoleSpy.mockRestore();
		});

		it("配列でないデータの場合は空配列を返す", () => {
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify({ not: "array" }),
			);
			expect(loadPlaySessions()).toEqual([]);
		});

		it("有効なセッションデータを読み込む", () => {
			const session = createTestSession();
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify([session]),
			);
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(1);
			expect(loaded[0].id).toBe("test-id");
			expect(loaded[0].maxFloor).toBe(5);
		});

		it("不正なエントリはフィルタリングされる", () => {
			const valid = createTestSession();
			const invalid = [null, "string", { id: "no-other-fields" }, 42];
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify([valid, ...invalid]),
			);
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(1);
			expect(loaded[0].id).toBe("test-id");
		});

		it("deathCauseが不正な値の場合はフィルタリングされる", () => {
			const invalid = createTestSession({
				deathCause: "invalid" as never,
			});
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify([invalid]),
			);
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("clearなのにdeathCauseがnullでない場合はフィルタリングされる", () => {
			const invalid = createTestSession({
				result: "clear",
				deathCause: "enemy_attack",
			});
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify([invalid]),
			);
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("deathなのにdeathCauseがnullの場合はフィルタリングされる", () => {
			const invalid = createTestSession({
				result: "death",
				deathCause: null,
			});
			localStorageMock.setItem(
				"dungeon-cards-stats",
				JSON.stringify([invalid]),
			);
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("cardUsageが欠落している場合はフィルタリングされる", () => {
			const session = createTestSession();
			const raw = { ...session, cardUsage: null };
			localStorageMock.setItem("dungeon-cards-stats", JSON.stringify([raw]));
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("cardUsageの値が数値でない場合はフィルタリングされる", () => {
			const session = createTestSession();
			const raw = {
				...session,
				cardUsage: {
					move: "not a number",
					attack: 0,
					strong_attack: 0,
					jump: 0,
					wait: 0,
				},
			};
			localStorageMock.setItem("dungeon-cards-stats", JSON.stringify([raw]));
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("cardUsageに必須キーが欠落している場合はフィルタリングされる", () => {
			const session = createTestSession();
			const raw = { ...session, cardUsage: { move: 1 } };
			localStorageMock.setItem("dungeon-cards-stats", JSON.stringify([raw]));
			expect(loadPlaySessions()).toHaveLength(0);
		});

		it("上限超過データは最新側を優先して切り詰められる", () => {
			const sessions = Array.from({ length: MAX_PLAY_SESSIONS + 5 }, (_, i) =>
				createTestSession({ id: `s${i}` }),
			);
			localStorageMock.setItem("dungeon-cards-stats", JSON.stringify(sessions));
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(MAX_PLAY_SESSIONS);
			expect(loaded[0].id).toBe("s5");
			expect(loaded[loaded.length - 1].id).toBe(`s${MAX_PLAY_SESSIONS + 4}`);
		});
	});

	describe("savePlaySession", () => {
		it("セッションを保存できる", () => {
			const session = createTestSession();
			savePlaySession(session);
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(1);
			expect(loaded[0].id).toBe("test-id");
		});

		it("複数セッションを追加保存できる", () => {
			savePlaySession(createTestSession({ id: "s1" }));
			savePlaySession(createTestSession({ id: "s2" }));
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(2);
			expect(loaded[0].id).toBe("s1");
			expect(loaded[1].id).toBe("s2");
		});

		it("上限超過時は古いセッションが削除される", () => {
			// MAX_PLAY_SESSIONS 件まで埋める
			for (let i = 0; i < MAX_PLAY_SESSIONS; i++) {
				savePlaySession(createTestSession({ id: `s${i}` }));
			}
			// 1件追加
			savePlaySession(createTestSession({ id: "new" }));
			const loaded = loadPlaySessions();
			expect(loaded).toHaveLength(MAX_PLAY_SESSIONS);
			// 最古のセッション (s0) は削除されている
			expect(loaded[0].id).toBe("s1");
			// 最新セッションは末尾
			expect(loaded[loaded.length - 1].id).toBe("new");
		});
	});

	describe("clearPlaySessions", () => {
		it("全セッションを削除できる", () => {
			savePlaySession(createTestSession());
			expect(loadPlaySessions()).toHaveLength(1);
			clearPlaySessions();
			expect(loadPlaySessions()).toEqual([]);
		});
	});
});
