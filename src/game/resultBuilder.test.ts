import { describe, expect, it } from "vitest";
import { RESULT_HIGHLIGHT_COUNT, RESULT_MAX_SAME_TYPE } from "../constants";
import { createTestState } from "../test-utils/createTestFixtures";
import type { Card, RunEvent } from "../types";
import {
	buildResultData,
	extractHighlights,
	formatHighlight,
	selectMvpCard,
} from "./resultBuilder";

function makeCard(overrides?: Partial<Card>): Card {
	return {
		id: "card-1",
		type: "fire",
		level: 1,
		exp: 0,
		stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
		...overrides,
	};
}

describe("formatHighlight", () => {
	it("boss_defeatedのテキスト生成", () => {
		const event: RunEvent = {
			type: "boss_defeated",
			floor: 10,
			turn: 50,
			detail: { enemyType: "boss" },
		};
		expect(formatHighlight(event)).toBe("10F: ボスを撃破！");
	});

	it("card_level_upのテキスト生成", () => {
		const event: RunEvent = {
			type: "card_level_up",
			floor: 5,
			turn: 25,
			detail: { cardType: "fire", newLevel: 3 },
		};
		expect(formatHighlight(event)).toBe("5F: 🔥ファイアボルトがLv.3に成長");
	});

	it("card_acquiredのテキスト生成", () => {
		const event: RunEvent = {
			type: "card_acquired",
			floor: 3,
			turn: 15,
			detail: { cardType: "jump" },
		};
		expect(formatHighlight(event)).toBe("3F: 🦘ジャンプを獲得");
	});

	it("close_call_defeatのテキスト生成", () => {
		const event: RunEvent = {
			type: "close_call_defeat",
			floor: 7,
			turn: 35,
			detail: { remainingHpRatio: 0.1, enemyType: "heavy" },
		};
		expect(formatHighlight(event)).toBe("7F: 瀕死で重装敵を撃破");
	});
});

describe("extractHighlights", () => {
	it("空のイベントリストでは空配列を返す", () => {
		expect(extractHighlights([])).toEqual([]);
	});

	it(`上位${RESULT_HIGHLIGHT_COUNT}件に制限される`, () => {
		const events: RunEvent[] = Array.from({ length: 10 }, (_, i) => ({
			type: "card_acquired" as const,
			floor: i + 1,
			turn: i * 5,
			detail: { cardType: "fire" },
		}));
		const result = extractHighlights(events);
		expect(result.length).toBeLessThanOrEqual(RESULT_HIGHLIGHT_COUNT);
	});

	it(`同一typeは最大${RESULT_MAX_SAME_TYPE}件まで`, () => {
		const events: RunEvent[] = Array.from({ length: 5 }, (_, i) => ({
			type: "card_acquired" as const,
			floor: i + 1,
			turn: i * 5,
			detail: { cardType: "fire" },
		}));
		const result = extractHighlights(events);
		const acquiredCount = result.filter(
			(h) => h.event.type === "card_acquired",
		).length;
		expect(acquiredCount).toBeLessThanOrEqual(RESULT_MAX_SAME_TYPE);
	});

	it("スコアの高い順に選択される（boss > miniboss > close_call > card_level_up > card_acquired）", () => {
		const events: RunEvent[] = [
			{
				type: "card_acquired",
				floor: 1,
				turn: 5,
				detail: { cardType: "fire" },
			},
			{
				type: "boss_defeated",
				floor: 10,
				turn: 50,
				detail: { enemyType: "boss" },
			},
			{
				type: "card_level_up",
				floor: 5,
				turn: 25,
				detail: { cardType: "fire", newLevel: 3 },
			},
		];
		const result = extractHighlights(events);
		expect(result).toHaveLength(3);
		// floor昇順で再ソートされる
		expect(result[0].event.floor).toBe(1);
		expect(result[1].event.floor).toBe(5);
		expect(result[2].event.floor).toBe(10);
	});

	it("結果はfloor昇順でソートされる", () => {
		const events: RunEvent[] = [
			{
				type: "boss_defeated",
				floor: 10,
				turn: 50,
				detail: { enemyType: "boss" },
			},
			{
				type: "miniboss_defeated",
				floor: 5,
				turn: 25,
				detail: { enemyType: "miniboss" },
			},
		];
		const result = extractHighlights(events);
		expect(result[0].event.floor).toBe(5);
		expect(result[1].event.floor).toBe(10);
	});
});

describe("selectMvpCard", () => {
	it("空の手札ではnullを返す", () => {
		expect(selectMvpCard([])).toBeNull();
	});

	it("defeatCountが最多のカードが選出される", () => {
		const cards = [
			makeCard({
				id: "c1",
				stats: { useCount: 10, defeatCount: 2, maxSingleDamage: 1 },
			}),
			makeCard({
				id: "c2",
				stats: { useCount: 5, defeatCount: 5, maxSingleDamage: 1 },
			}),
		];
		expect(selectMvpCard(cards)?.id).toBe("c2");
	});

	it("defeatCount同値ならmaxSingleDamageで決まる", () => {
		const cards = [
			makeCard({
				id: "c1",
				stats: { useCount: 0, defeatCount: 3, maxSingleDamage: 2 },
			}),
			makeCard({
				id: "c2",
				stats: { useCount: 0, defeatCount: 3, maxSingleDamage: 5 },
			}),
		];
		expect(selectMvpCard(cards)?.id).toBe("c2");
	});

	it("defeatCount=0ならuseCount降順フォールバック", () => {
		const cards = [
			makeCard({
				id: "c1",
				stats: { useCount: 3, defeatCount: 0, maxSingleDamage: 0 },
			}),
			makeCard({
				id: "c2",
				stats: { useCount: 10, defeatCount: 0, maxSingleDamage: 0 },
			}),
		];
		expect(selectMvpCard(cards)?.id).toBe("c2");
	});

	it("全カードが統計0なら先頭のカードが返る", () => {
		const cards = [makeCard({ id: "c1" }), makeCard({ id: "c2" })];
		expect(selectMvpCard(cards)?.id).toBe("c1");
	});
});

describe("buildResultData", () => {
	it("死亡時のResultDataが正しく組み立てられる", () => {
		const state = createTestState({
			floor: 5,
			deck: {
				hand: [
					makeCard({
						id: "c1",
						stats: { useCount: 5, defeatCount: 2, maxSingleDamage: 3 },
					}),
				],
				usedCardIds: [],
			},
			eventLog: [
				{
					type: "boss_defeated",
					floor: 5,
					turn: 20,
					detail: { enemyType: "boss" },
				},
			],
		});
		const result = buildResultData(state, "death");

		expect(result.result).toBe("death");
		expect(result.hand).toHaveLength(1);
		expect(result.mvpCard?.id).toBe("c1");
		expect(result.highlights).toHaveLength(1);
		expect(result.personality).toBe(state.personality);
	});

	it("クリア時のResultDataが正しく組み立てられる", () => {
		const state = createTestState({ floor: 20 });
		const result = buildResultData(state, "clear");

		expect(result.result).toBe("clear");
	});
});
