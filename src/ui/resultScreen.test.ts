/**
 * リザルト画面UIのテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/tween", () => ({
	tween: vi.fn(() => Promise.resolve()),
	Easing: {
		linear: (t: number) => t,
		easeOut: (t: number) => t,
		easeOutCubic: (t: number) => t,
		easeInOut: (t: number) => t,
		easeOutBack: (t: number) => t,
	},
}));

import type { Container, FederatedPointerEvent } from "pixi.js";
import { getTexts } from "../test-utils/pixiTestHelper";
import type { ResultData } from "../types";
import { ResultScreen } from "./resultScreen";

/** 再帰的にテキスト要素を収集 */
function getTextsDeep(container: Container): { text: string }[] {
	const result: { text: string }[] = [];
	for (const child of container.children) {
		if (
			"text" in child &&
			typeof (child as { text: unknown }).text === "string"
		) {
			result.push(child as unknown as { text: string });
		}
		if ("children" in child) {
			result.push(...getTextsDeep(child as Container));
		}
	}
	return result;
}

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

/** コンテナの全子孫からボタンを探す */
function findButtonDeep(
	parent: Container,
	label: string,
): Container | undefined {
	// 直下
	const direct = findButtonByLabel(parent, label);
	if (direct) return direct;
	// 子コンテナを再帰探索
	for (const child of parent.children) {
		if ("children" in child) {
			const found = findButtonDeep(child as Container, label);
			if (found) return found;
		}
	}
	return undefined;
}

function createTestResultData(overrides?: Partial<ResultData>): ResultData {
	return {
		result: "death",
		maxFloor: 5,
		totalTurns: 30,
		totalDamageDealt: 50,
		totalDamageTaken: 20,
		hand: [
			{
				id: "c1",
				type: "attack",
				level: 2,
				exp: 3,
				stats: { useCount: 10, defeatCount: 3, maxSingleDamage: 5 },
			},
		],
		mvpCard: {
			id: "c1",
			type: "attack",
			level: 2,
			exp: 3,
			stats: { useCount: 10, defeatCount: 3, maxSingleDamage: 5 },
		},
		highlights: [
			{
				event: {
					type: "boss_defeated",
					floor: 5,
					turn: 20,
					detail: { enemyType: "boss" },
				},
				text: "5F: ボスを撃破！",
				score: 100,
			},
			{
				event: {
					type: "card_level_up",
					floor: 3,
					turn: 10,
					detail: { cardType: "attack", newLevel: 3 },
				},
				text: "3F: ⚔攻撃がLv.3に成長",
				score: 55,
			},
			{
				event: {
					type: "close_call_defeat",
					floor: 7,
					turn: 35,
					detail: { remainingHpRatio: 0.1, enemyType: "heavy" },
				},
				text: "7F: 瀕死で重装敵を撃破",
				score: 70,
			},
		],
		personality: "brave",
		speechLog: { message: "よくやった…", eventType: "game_over", timestamp: 0 },
		...overrides,
	};
}

describe("ResultScreen", () => {
	let screen: ResultScreen;

	beforeEach(() => {
		screen = new ResultScreen();
	});

	describe("getContainer", () => {
		it("Containerを返す", () => {
			expect(screen.getContainer()).toBeDefined();
		});
	});

	describe("render - ゲームオーバー", () => {
		it("ゲームオーバーテキストが含まれる", () => {
			const data = createTestResultData({ result: "death" });
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("ゲームオーバー"))).toBe(true);
		});

		it("到達階層が表示される", () => {
			const data = createTestResultData({ maxFloor: 8 });
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("8F"))).toBe(true);
		});

		it("タイトルに戻るボタンが存在する", () => {
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "タイトルに戻る");
			expect(btn).toBeDefined();
		});

		it("続けるボタンが存在しない（ゲームオーバー時）", () => {
			const data = createTestResultData({ result: "death" });
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "続ける");
			expect(btn).toBeUndefined();
		});
	});

	describe("render - 勝利", () => {
		it("ダンジョンクリアテキストが含まれる", () => {
			const data = createTestResultData({ result: "clear" });
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("ダンジョンクリア"))).toBe(true);
		});

		it("続けるボタンが存在する", () => {
			const data = createTestResultData({ result: "clear" });
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "続ける");
			expect(btn).toBeDefined();
		});

		it("タイトルに戻るボタンが存在する", () => {
			const data = createTestResultData({ result: "clear" });
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "タイトルに戻る");
			expect(btn).toBeDefined();
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

	describe("コールバック", () => {
		it("タイトルに戻るボタンでsetOnReturnToTitleコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnReturnToTitle(callback);
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "タイトルに戻る");
			expect(btn).toBeDefined();
			btn?.emit("pointerdown", { button: 0 } as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("続けるボタンでsetOnContinueコールバックが呼ばれる", () => {
			const callback = vi.fn();
			screen.setOnContinue(callback);
			const data = createTestResultData({ result: "clear" });
			screen.render(data, 400, 600);
			const btn = findButtonDeep(screen.getContainer(), "続ける");
			expect(btn).toBeDefined();
			btn?.emit("pointerdown", { button: 0 } as FederatedPointerEvent);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe("セクション表示", () => {
		it("ハイライトが3件以上で表示される", () => {
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("ハイライト"))).toBe(true);
		});

		it("ハイライトが3件未満で非表示", () => {
			const data = createTestResultData({ highlights: [] });
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("ハイライト"))).toBe(false);
		});

		it("手札セクションにMVPバッジが表示される", () => {
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text === "MVP")).toBe(true);
		});

		it("発話パネルが表示される", () => {
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const texts = getTextsDeep(screen.getContainer());
			expect(texts.some((t) => t.text.includes("よくやった"))).toBe(true);
		});

		it("再描画時に前の子要素がクリアされる", () => {
			const data = createTestResultData();
			screen.render(data, 400, 600);
			const countBefore = screen.getContainer().children.length;
			screen.render(data, 400, 600);
			const countAfter = screen.getContainer().children.length;
			expect(countAfter).toBe(countBefore);
		});
	});
});
