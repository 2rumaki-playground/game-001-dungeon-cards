/**
 * 手札レンダラーのテスト
 */

import type { Container, FederatedPointerEvent, Text } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { CARD_COST } from "../constants";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import type { Card, CardType } from "../types";
import { tween } from "../utils/tween";
import {
	CARD_HEIGHT,
	CARD_WIDTH,
	getDirectionFromClickPosition,
	HandRenderer,
} from "./handRenderer";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

describe("getDirectionFromClickPosition", () => {
	// カードサイズ: 90x120 (幅x高さ)
	// 中心: (45, 60)
	// 対角線の傾き: 120/90 = 4/3

	describe("明確な方向判定", () => {
		it("カードの上部中央をクリックした場合、upが返される", () => {
			// 中央上部 (45, 10) → 相対位置 (0, -50)
			const result = getDirectionFromClickPosition(45, 10);
			expect(result).toBe("up");
		});

		it("カードの下部中央をクリックした場合、downが返される", () => {
			// 中央下部 (45, 110) → 相対位置 (0, 50)
			const result = getDirectionFromClickPosition(45, 110);
			expect(result).toBe("down");
		});

		it("カードの左側中央をクリックした場合、leftが返される", () => {
			// 左中央 (10, 60) → 相対位置 (-35, 0)
			const result = getDirectionFromClickPosition(10, 60);
			expect(result).toBe("left");
		});

		it("カードの右側中央をクリックした場合、rightが返される", () => {
			// 右中央 (80, 60) → 相対位置 (35, 0)
			const result = getDirectionFromClickPosition(80, 60);
			expect(result).toBe("right");
		});
	});

	describe("四隅付近の判定（対角線付近）", () => {
		it("左上コーナー付近はupになる（高さ方向に偏っているため）", () => {
			// 左上 (10, 10) → 相対位置 (-35, -50)
			// slope = -50/-35 ≈ 1.43, diagSlope = 120/90 ≈ 1.33
			// |slope| > diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(10, 10);
			expect(result).toBe("up");
		});

		it("右上コーナー付近はupになる", () => {
			// 右上 (80, 10) → 相対位置 (35, -50)
			const result = getDirectionFromClickPosition(80, 10);
			expect(result).toBe("up");
		});

		it("左下コーナー付近はdownになる", () => {
			// 左下 (10, 110) → 相対位置 (-35, 50)
			const result = getDirectionFromClickPosition(10, 110);
			expect(result).toBe("down");
		});

		it("右下コーナー付近はdownになる", () => {
			// 右下 (80, 110) → 相対位置 (35, 50)
			const result = getDirectionFromClickPosition(80, 110);
			expect(result).toBe("down");
		});
	});

	describe("対角線上の点", () => {
		it("対角線上の点は上下方向として判定される（傾きが等しい場合は上下）", () => {
			// 対角線の傾きと同じ傾きの点
			// 右上方向: (45 + 30, 60 - 40) = (75, 20) → relX=30, relY=-40, slope=-4/3
			// |slope| = diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(75, 20);
			expect(result).toBe("up");
		});
	});

	describe("中心付近", () => {
		it("中心をクリックした場合（relX=0）、上下で判定される", () => {
			// 中心 (45, 60) → 相対位置 (0, 0)
			// relX = 0 かつ relY = 0 の場合、up になる（relY > 0 ではないため）
			const result = getDirectionFromClickPosition(45, 60);
			expect(result).toBe("up");
		});

		it("中心のわずかに上をクリックした場合、upが返される", () => {
			const result = getDirectionFromClickPosition(45, 59);
			expect(result).toBe("up");
		});

		it("中心のわずかに下をクリックした場合、downが返される", () => {
			const result = getDirectionFromClickPosition(45, 61);
			expect(result).toBe("down");
		});
	});

	describe("カスタムサイズ", () => {
		it("正方形のカードでも正しく判定される", () => {
			// 100x100 のカード、中心 (50, 50)
			// 右上 (90, 10) → 相対位置 (40, -40)
			// slope = -1, diagSlope = 1
			// |slope| = diagSlope なので上下判定 → relY < 0 なので up
			const result = getDirectionFromClickPosition(90, 10, 100, 100);
			expect(result).toBe("up");

			// 右 (90, 50) → 相対位置 (40, 0)
			const result2 = getDirectionFromClickPosition(90, 50, 100, 100);
			expect(result2).toBe("right");
		});
	});

	describe("カードサイズ定数", () => {
		it("CARD_WIDTHは90", () => {
			expect(CARD_WIDTH).toBe(90);
		});

		it("CARD_HEIGHTは120", () => {
			expect(CARD_HEIGHT).toBe(120);
		});
	});
});

describe("HandRenderer ホバー・選択演出", () => {
	function createTestCards(): Card[] {
		return [
			{ id: "card-1", type: "move" },
			{ id: "card-2", type: "attack" },
			{ id: "card-3", type: "wait" },
		];
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		return renderer.getContainer().children[index] as Container;
	}

	it("ホバー中のカードの Y 座標が負（浮き上がり）になる", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards, 10);

		const card0 = findCardContainer(renderer, 0);
		// pointerover をシミュレート
		card0.emit("pointerover", {} as FederatedPointerEvent);

		// render() が再呼び出しされるので、新しいカードコンテナを取得
		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBeLessThan(0);
	});

	it("pointerout でホバー解除後、Y=0 に戻る", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards, 10);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		// ホバー中のカードを取得して pointerout
		const card0Hovered = findCardContainer(renderer, 0);
		card0Hovered.emit("pointerout", {} as FederatedPointerEvent);

		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBe(0);
	});

	it("無効カード（AP不足）は eventMode が static でない", () => {
		const renderer = new HandRenderer();
		// AP=0 なので move / attack は無効（wait は有効のまま）
		renderer.render(createTestCards(), 0);

		const card0 = findCardContainer(renderer, 0);
		expect(card0.eventMode).not.toBe("static");
	});

	it("ホバー中に render() を再呼び出ししてもホバー状態が維持される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards, 10);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		// 外部から render() を再呼び出し
		renderer.render(cards, 10);

		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBeLessThan(0);
	});

	it("pointerdown でカード選択コールバックが呼ばれる", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards, 10);

		// waitカード（方向なし）をクリック
		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		// 消費アニメーション完了後にコールバックが呼ばれる
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledWith(cards[2]);
		});
	});

	it("pointerdown で消費アニメーション（パルス拡大→飛行+縮小+フェード）が実行される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setOnCardSelect(vi.fn());
		renderer.render(cards, 10);

		const mockedTween = vi.mocked(tween);
		mockedTween.mockClear();

		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		await vi.waitFor(() => {
			expect(mockedTween).toHaveBeenCalledTimes(2);
		});

		// フェーズ1a: パルス拡大
		expect(mockedTween.mock.calls[0][1]).toEqual(
			expect.objectContaining({ scaleX: 1.1, scaleY: 1.1 }),
		);
		// フェーズ1b: 飛行+縮小+フェード
		expect(mockedTween.mock.calls[1][1]).toEqual(
			expect.objectContaining({ scaleX: 0.3, scaleY: 0.3, alpha: 0 }),
		);
		expect(mockedTween.mock.calls[1][1]).toHaveProperty("y");
	});

	it("アニメーション中の二重クリックが防止される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards, 10);

		const mockedTween = vi.mocked(tween);

		// tweenを未解決のPromiseにしてアニメーション継続中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		const card2 = findCardContainer(renderer, 2);
		// 1回目のクリック
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		const tweenCallCountAfterFirst = mockedTween.mock.calls.length;

		// 2回目のクリックを試行（isInputLockedガードで早期return）
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		// tween呼び出し回数が増えていない（2回目は無視された）
		expect(mockedTween.mock.calls.length).toBe(tweenCallCountAfterFirst);

		// アニメーション完了前にコールバックは呼ばれない
		expect(callback).not.toHaveBeenCalled();

		// tweenを完了させてアニメーション完了
		resolveTween();

		// アニメーション完了後もコールバックは1回のみ
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	it("外部からのrender()では入力ロックが解除されない", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards, 10);

		const mockedTween = vi.mocked(tween);

		// tweenを未解決のPromiseにしてアニメーション中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		// 1回目のクリックで入力ロック
		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// 外部からrender()を呼んでもロックは解除されない
		renderer.render(cards, 10);

		// クリックしてもtweenは増えない（ロック維持）
		const card0After = findCardContainer(renderer, 0);
		card0After.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);
		expect(mockedTween.mock.calls.length).toBe(tweenCountAfterFirst);

		// cleanup
		resolveTween();
	});

	it("アニメーション完了後に入力ロックが解除される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards, 10);

		const mockedTween = vi.mocked(tween);

		// tweenを未解決Promiseにしてアニメーション中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// アニメーション中は2回目のクリックが無視される
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);
		expect(mockedTween.mock.calls.length).toBe(tweenCountAfterFirst);

		// アニメーション完了
		resolveTween();

		// アニメーション完了後に再クリック可能になる
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1);
		});

		// render()で再描画されるので新しいカードコンテナを取得
		const card2After = findCardContainer(renderer, 2);
		card2After.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);
		expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountAfterFirst);
	});

	it("非同期コールバック完了まで入力ロックが維持される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();

		const mockedTween = vi.mocked(tween);

		// 非同期コールバック（未解決Promiseで保留）
		let resolveCallback!: () => void;
		const asyncCallback = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveCallback = resolve;
				}),
		);
		renderer.setOnCardSelect(asyncCallback);
		renderer.render(cards, 10);

		// tweenの1回目（パルス拡大）を即座に解決、2回目（飛行）も即座に解決
		// → animateCardConsume完了 → invokeCallback呼び出し → 非同期コールバック保留
		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		// コールバックが呼ばれるまで待機（tweenモックは即座に解決）
		await vi.waitFor(() => {
			expect(asyncCallback).toHaveBeenCalledTimes(1);
		});

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// コールバックのPromise未解決中は入力ロックが維持される
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);
		expect(mockedTween.mock.calls.length).toBe(tweenCountAfterFirst);

		// コールバックのPromiseを解決
		resolveCallback();

		// 再描画完了（新しいカードコンテナが取得できる状態）になるまで待機
		await vi.waitFor(() => {
			const card2After = findCardContainer(renderer, 2);
			// 再描画によりコンテナが差し替わったことを確認
			expect(card2After).not.toBe(card2);
		});

		// 再描画完了後に、改めて新しいカードコンテナを取得してクリック
		const card2After = findCardContainer(renderer, 2);
		card2After.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);
		expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountAfterFirst);
	});

	it("ParticleSystem付きの場合、消費アニメーション後にemitが呼ばれる", async () => {
		const mockContainer = {
			toLocal: vi.fn((pos: { x: number; y: number }) => ({
				x: pos.x,
				y: pos.y,
			})),
		};
		const mockParticleSystem = {
			emit: vi.fn().mockResolvedValue(undefined),
			getContainer: vi.fn().mockReturnValue(mockContainer),
			clear: vi.fn(),
		};
		const renderer = new HandRenderer(mockParticleSystem as never);
		const cards = createTestCards();
		renderer.setOnCardSelect(vi.fn());
		renderer.render(cards, 10);

		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", {
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent);

		await vi.waitFor(() => {
			expect(mockParticleSystem.emit).toHaveBeenCalledTimes(1);
		});

		const emitConfig = mockParticleSystem.emit.mock.calls[0][0];
		expect(emitConfig.count).toBe(12);
		expect(emitConfig.pattern).toEqual({ type: "radial" });
	});
});

describe("カード種別ビジュアル差別化", () => {
	const allCardTypes: CardType[] = [
		"move",
		"attack",
		"strong_attack",
		"rush",
		"wait",
	];

	function renderSingleCard(type: CardType): Container {
		const renderer = new HandRenderer();
		const cards: Card[] = [{ id: `card-${type}`, type }];
		renderer.render(cards, 10);
		return renderer.getContainer().children[0] as Container;
	}

	function getTextChildren(container: Container): Text[] {
		return container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		) as unknown as Text[];
	}

	describe("シンボル表示", () => {
		it.each([
			["move", "👟"],
			["attack", "⚔"],
			["strong_attack", "🔥"],
			["rush", "💨"],
			["wait", "⏳"],
		] as [
			CardType,
			string,
		][])("%s カードにシンボル %s が表示される", (type, expectedSymbol) => {
			const cardContainer = renderSingleCard(type);
			const texts = getTextChildren(cardContainer);
			const symbolText = texts.find((t) => t.text === expectedSymbol);
			expect(symbolText).toBeDefined();
		});
	});

	describe("効果テキスト表示", () => {
		it.each([
			["move", "1マス移動"],
			["attack", "1ダメージ"],
			["strong_attack", "3ダメージ"],
			["rush", "2マス移動"],
			["wait", "-"],
		] as [
			CardType,
			string,
		][])("%s カードに効果テキスト「%s」が表示される", (type, expectedEffect) => {
			const cardContainer = renderSingleCard(type);
			const texts = getTextChildren(cardContainer);
			const effectText = texts.find((t) => t.text === expectedEffect);
			expect(effectText).toBeDefined();
		});
	});

	describe("APコスト表示強化", () => {
		it("コスト2のカードはAPコストが強調色で表示される", () => {
			for (const type of allCardTypes) {
				const cost = CARD_COST[type];
				if (cost < 2) continue;
				const cardContainer = renderSingleCard(type);
				const texts = getTextChildren(cardContainer);
				const costText = texts.find((t) => t.text === `AP: ${cost}`);
				expect(costText).toBeDefined();
				// style.fillは強調色 0xffaa44
				const style = (costText as Text).style;
				expect(style.fill).toBe(0xffaa44);
			}
		});

		it("コスト0の待機カードはAPコストが非表示になる", () => {
			const cardContainer = renderSingleCard("wait");
			const texts = getTextChildren(cardContainer);
			const costText = texts.find((t) => t.text.startsWith("AP:"));
			expect(costText).toBeUndefined();
		});

		it("コスト1のカードは通常色で表示される", () => {
			for (const type of allCardTypes) {
				const cost = CARD_COST[type];
				if (cost !== 1) continue;
				const cardContainer = renderSingleCard(type);
				const texts = getTextChildren(cardContainer);
				const costText = texts.find((t) => t.text === `AP: ${cost}`);
				expect(costText).toBeDefined();
				const style = (costText as Text).style;
				expect(style.fill).toBe(0xcccccc);
			}
		});
	});
});
