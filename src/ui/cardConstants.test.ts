import { describe, expect, it } from "vitest";
import {
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
} from "../constants";
import type { Card, CardType } from "../types";
import {
	CARD_COLORS,
	CARD_DESCRIPTION,
	CARD_GLOW_COLORS,
	CARD_TYPE_NAME,
	CARD_TYPE_SYMBOL,
	getCardDescription,
} from "./cardConstants";

const ALL_CARD_TYPES: CardType[] = [
	"move",
	"attack",
	"strong_attack",
	"jump",
	"wait",
];

describe("cardConstants", () => {
	describe("CARD_COLORS", () => {
		it("全カード種別に背景色とボーダー色が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(CARD_COLORS[type]).toBeDefined();
				expect(typeof CARD_COLORS[type].bg).toBe("number");
				expect(typeof CARD_COLORS[type].border).toBe("number");
			}
		});
	});

	describe("CARD_TYPE_SYMBOL", () => {
		it("全カード種別にシンボルが定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_TYPE_SYMBOL[type]).toBe("string");
				expect(CARD_TYPE_SYMBOL[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("CARD_TYPE_NAME", () => {
		it("全カード種別に日本語名が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_TYPE_NAME[type]).toBe("string");
				expect(CARD_TYPE_NAME[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("CARD_GLOW_COLORS", () => {
		it("全カード種別に発光色が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(CARD_GLOW_COLORS[type]).toBeDefined();
				expect(Array.isArray(CARD_GLOW_COLORS[type])).toBe(true);
				expect(CARD_GLOW_COLORS[type].length).toBeGreaterThan(0);
			}
		});

		it("各発光色はnumber型の配列である", () => {
			for (const type of ALL_CARD_TYPES) {
				for (const color of CARD_GLOW_COLORS[type]) {
					expect(typeof color).toBe("number");
				}
			}
		});
	});

	describe("CARD_DESCRIPTION", () => {
		it("全カード種別に詳細説明が定義されている", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(typeof CARD_DESCRIPTION[type]).toBe("string");
				expect(CARD_DESCRIPTION[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("getCardDescription", () => {
		function makeCard(overrides?: Partial<Card>): Card {
			return {
				id: "card-1",
				type: "attack",
				level: 1,
				exp: 0,
				...overrides,
			};
		}

		it("CardType文字列を渡すとCARD_DESCRIPTIONと同じ値を返す", () => {
			for (const type of ALL_CARD_TYPES) {
				expect(getCardDescription(type)).toBe(CARD_DESCRIPTION[type]);
			}
		});

		it("Lv.1の攻撃カードではボーナス表示なし", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 1 }));
			expect(desc).toContain(`${PLAYER_ATTACK_DAMAGE}ダメージ`);
			expect(desc).not.toContain("(+");
		});

		it("Lv.2の攻撃カードでは+1ボーナスが表示される", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 2 }));
			expect(desc).toContain(`${PLAYER_ATTACK_DAMAGE + 1}ダメージ(+1)`);
		});

		it("Lv.5の攻撃カードでは+3ボーナスが表示される", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 5 }));
			expect(desc).toContain(`${PLAYER_ATTACK_DAMAGE + 3}ダメージ(+3)`);
		});

		it("Lv.2の強攻撃カードでは+1ボーナスが表示される", () => {
			const desc = getCardDescription(
				makeCard({ type: "strong_attack", level: 2 }),
			);
			expect(desc).toContain(`${PLAYER_STRONG_ATTACK_DAMAGE + 1}ダメージ(+1)`);
		});

		it("移動カードはレベルに関係なく固定テキスト", () => {
			const desc = getCardDescription(makeCard({ type: "move", level: 3 }));
			expect(desc).toBe(CARD_DESCRIPTION.move);
		});

		it("Lv.3の攻撃カードでは貫通の説明が表示される", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 3 }));
			expect(desc).toContain("貫通");
			expect(desc).toContain("隣接1マス先");
		});

		it("Lv.5の攻撃カードでは射程延長+貫通の説明が表示される", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 5 }));
			expect(desc).toContain("2マス先まで");
			expect(desc).toContain("貫通");
		});

		it("Lv.3の強攻撃カードではノックバックの説明が表示される", () => {
			const desc = getCardDescription(
				makeCard({ type: "strong_attack", level: 3 }),
			);
			expect(desc).toContain("ノックバック");
			expect(desc).toContain("隣接1マス先");
		});

		it("Lv.5の強攻撃カードでは衝撃波の説明が表示される", () => {
			const desc = getCardDescription(
				makeCard({ type: "strong_attack", level: 5 }),
			);
			expect(desc).toContain("正面+左右3マス");
			expect(desc).toContain("ノックバック");
		});

		it("Lv.1-2の攻撃カードでは特殊効果の説明がない", () => {
			const desc = getCardDescription(makeCard({ type: "attack", level: 2 }));
			expect(desc).not.toContain("貫通");
			expect(desc).not.toContain("ノックバック");
		});

		it("Lv.1-2の強攻撃カードでは特殊効果の説明がない", () => {
			const desc = getCardDescription(
				makeCard({ type: "strong_attack", level: 2 }),
			);
			expect(desc).not.toContain("ノックバック");
			expect(desc).not.toContain("衝撃波");
		});
	});
});
