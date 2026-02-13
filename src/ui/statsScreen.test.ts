/**
 * 統計ダッシュボード画面UIのテスト
 */

import type { Container, FederatedPointerEvent } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTexts } from "../test-utils/pixiTestHelper";
import type { PlaySession } from "../types";
import { StatsScreen } from "./statsScreen";

/** テスト用セッション生成ヘルパー */
function createDeathSession(overrides: Partial<PlaySession> = {}): PlaySession {
	return {
		id: "test-1",
		startedAt: 1000,
		endedAt: 61000,
		maxFloor: 5,
		cardUsage: { move: 10, attack: 5, strong_attack: 2, jump: 1, wait: 3 },
		totalDamageDealt: 20,
		totalDamageTaken: 10,
		playerTurnCount: 15,
		result: "death",
		deathCause: "enemy_attack",
		...overrides,
	} as PlaySession;
}

function createClearSession(overrides: Partial<PlaySession> = {}): PlaySession {
	return {
		id: "test-2",
		startedAt: 2000,
		endedAt: 302000,
		maxFloor: 20,
		cardUsage: { move: 30, attack: 20, strong_attack: 8, jump: 5, wait: 10 },
		totalDamageDealt: 80,
		totalDamageTaken: 15,
		playerTurnCount: 50,
		result: "clear",
		deathCause: null,
		...overrides,
	} as PlaySession;
}

/** ラベルテキストでinteractiveなボタンを探索 */
function findButtonByLabel(
	parent: Container,
	label: string,
): Container | undefined {
	return parent.children.find((child) => {
		if (child.eventMode !== "static" || child.cursor !== "pointer")
			return false;
		const texts = getTexts(child as Container);
		return texts.some((t) => t.text === label);
	}) as Container | undefined;
}

/** コンテナ全体からテキスト要素を再帰的に収集する */
function getAllTexts(container: Container): string[] {
	const results: string[] = [];
	for (const child of container.children) {
		if (
			"text" in child &&
			typeof (child as { text: unknown }).text === "string"
		) {
			results.push((child as { text: string }).text);
		}
		if ("children" in child) {
			results.push(...getAllTexts(child as Container));
		}
	}
	return results;
}

describe("StatsScreen", () => {
	let screen: StatsScreen;

	beforeEach(() => {
		screen = new StatsScreen();
	});

	describe("getContainer", () => {
		it("Containerを返す", () => {
			const container = screen.getContainer();
			expect(container).toBeDefined();
		});
	});

	describe("show / hide", () => {
		it("show()でvisibleがtrueになる", () => {
			screen.hide();
			screen.show();
			expect(screen.getContainer().visible).toBe(true);
		});

		it("hide()でvisibleがfalseになる", () => {
			screen.show();
			screen.hide();
			expect(screen.getContainer().visible).toBe(false);
		});
	});

	describe("render", () => {
		it("タイトルテキストが含まれる", () => {
			screen.render([], 800, 600);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("プレイ統計"))).toBe(true);
		});

		it("セッション0件時にデータなし表示", () => {
			screen.render([], 800, 600);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("データなし"))).toBe(true);
		});

		it("プレイ回数が表示される", () => {
			screen.render(
				[createDeathSession({ id: "s1" }), createClearSession({ id: "s2" })],
				800,
				600,
			);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("2"))).toBe(true);
		});

		it("クリア率が表示される", () => {
			screen.render(
				[createDeathSession({ id: "s1" }), createClearSession({ id: "s2" })],
				800,
				600,
			);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("50%"))).toBe(true);
		});

		it("カード使用ランキングが表示される", () => {
			screen.render([createDeathSession()], 800, 600);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("移動"))).toBe(true);
		});

		it("死因が表示される", () => {
			screen.render([createDeathSession()], 800, 600);
			const texts = getAllTexts(screen.getContainer());
			expect(texts.some((t) => t.includes("敵の攻撃"))).toBe(true);
		});

		it("再描画時に前の子要素がクリアされる", () => {
			screen.render([createDeathSession()], 800, 600);
			const countBefore = screen.getContainer().children.length;
			screen.render([createDeathSession()], 800, 600);
			const countAfter = screen.getContainer().children.length;
			expect(countAfter).toBe(countBefore);
		});
	});

	describe("コールバック", () => {
		it("閉じるボタンのpointerdownでsetOnCloseコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnClose(callback);
			screen.render([], 800, 600);
			const closeButton = findButtonByLabel(screen.getContainer(), "閉じる");
			expect(closeButton).toBeDefined();
			closeButton?.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("リセットボタンのpointerdownでsetOnResetコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnReset(callback);
			screen.render([createDeathSession()], 800, 600);
			const resetButton = findButtonByLabel(
				screen.getContainer(),
				"データリセット",
			);
			expect(resetButton).toBeDefined();
			resetButton?.emit("pointerdown", {
				button: 0,
			} as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
