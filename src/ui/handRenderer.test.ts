/**
 * 手札レンダラーのテスト
 */

import type { Container, FederatedPointerEvent, Text } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import type { Card, CardType } from "../types";
import { tween } from "../utils/tween";
import { CARD_DESCRIPTION, CARD_TYPE_NAME } from "./cardConstants";
import {
	CARD_GAP,
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
			{
				id: "card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-3",
				type: "wait",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[index] as Container;
	}

	it("ホバー中のカードの Y 座標が負（浮き上がり）になる", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

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
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		// ホバー中のカードを取得して pointerout
		const card0Hovered = findCardContainer(renderer, 0);
		card0Hovered.emit("pointerout", {} as FederatedPointerEvent);

		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBe(0);
	});

	it("全カードがドラッグ用にeventModeがstaticになる", () => {
		const renderer = new HandRenderer();
		renderer.render(createTestCards());

		const card0 = findCardContainer(renderer, 0);
		// ドラッグ並べ替えのため全カードがインタラクティブ
		expect(card0.eventMode).toBe("static");
	});

	it("ホバー中に render() を再呼び出ししてもホバー状態が維持される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		// 外部から render() を再呼び出し
		renderer.render(cards);

		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBeLessThan(0);
	});

	it("クリック（pointerdown+pointerup）でカード選択コールバックが呼ばれる", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards);

		// waitカード（方向なし）をクリック
		const card2 = findCardContainer(renderer, 2);
		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// コールバックが呼ばれ、その後に消費アニメーションが実行される
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledWith(cards[2]);
		});
	});

	it("onCardSelectがfalseを返した場合、消費アニメーションがスキップされる", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		// falseを返すコールバック（無効クリック）
		const callback = vi.fn().mockReturnValue(false);
		renderer.setOnCardSelect(callback);
		renderer.render(cards);

		const mockedTween = vi.mocked(tween);
		mockedTween.mockClear();

		const card2 = findCardContainer(renderer, 2);
		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// コールバックは呼ばれる
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1);
		});

		// 消費アニメーション（tween）は呼ばれない
		expect(mockedTween).not.toHaveBeenCalled();
	});

	it("クリックで消費アニメーション（パルス拡大→飛行+縮小+フェード）が実行される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setOnCardSelect(vi.fn());
		renderer.render(cards);

		const mockedTween = vi.mocked(tween);
		mockedTween.mockClear();

		const card2 = findCardContainer(renderer, 2);
		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

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
		renderer.render(cards);

		const mockedTween = vi.mocked(tween);
		const tweenCountBefore = mockedTween.mock.calls.length;

		// tweenを未解決のPromiseにしてアニメーション継続中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		const card2 = findCardContainer(renderer, 2);
		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		// 1回目のクリック
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// コールバック→tweenの順で呼ばれるので、tweenが呼ばれるまで待機
		await vi.waitFor(() => {
			expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountBefore);
		});

		const tweenCallCountAfterFirst = mockedTween.mock.calls.length;

		// 2回目のクリックを試行（isInputLockedガードで早期return）
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// tween呼び出し回数が増えていない（2回目は無視された）
		expect(mockedTween.mock.calls.length).toBe(tweenCallCountAfterFirst);

		// コールバックは1回のみ（アニメーション前に呼ばれる）
		expect(callback).toHaveBeenCalledTimes(1);

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
		renderer.render(cards);

		const mockedTween = vi.mocked(tween);
		const tweenCountBefore = mockedTween.mock.calls.length;

		// tweenを未解決のPromiseにしてアニメーション中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;

		// 1回目のクリックで入力ロック
		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerdown", event);
		card0.emit("pointerup", event);

		// コールバック→tweenの順で呼ばれるので、tweenが呼ばれるまで待機
		await vi.waitFor(() => {
			expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountBefore);
		});

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// 外部からrender()を呼んでもロックは解除されない
		renderer.render(cards);

		// クリックしてもtweenは増えない（ロック維持）
		const card0After = findCardContainer(renderer, 0);
		card0After.emit("pointerdown", event);
		card0After.emit("pointerup", event);
		expect(mockedTween.mock.calls.length).toBe(tweenCountAfterFirst);

		// cleanup
		resolveTween();
	});

	it("アニメーション完了後に入力ロックが解除される", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards);

		const mockedTween = vi.mocked(tween);
		const tweenCountBefore = mockedTween.mock.calls.length;

		// tweenを未解決Promiseにしてアニメーション中を再現
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});

		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;

		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// コールバック→tweenの順で呼ばれるので、tweenが呼ばれるまで待機
		await vi.waitFor(() => {
			expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountBefore);
		});

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// アニメーション中は2回目のクリックが無視される
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);
		expect(mockedTween.mock.calls.length).toBe(tweenCountAfterFirst);

		// アニメーション完了
		resolveTween();

		// アニメーション完了後に再クリック可能になる
		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1);
		});

		// render()で再描画されるので新しいカードコンテナを取得
		const card2After = findCardContainer(renderer, 2);
		card2After.emit("pointerdown", event);
		card2After.emit("pointerup", event);
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
				new Promise<undefined>((resolve) => {
					resolveCallback = () => resolve(undefined);
				}),
		);
		renderer.setOnCardSelect(asyncCallback);
		renderer.render(cards);

		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;

		// tweenの1回目（パルス拡大）を即座に解決、2回目（飛行）も即座に解決
		// → animateCardConsume完了 → invokeCallback呼び出し → 非同期コールバック保留
		const card2 = findCardContainer(renderer, 2);
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		// コールバックが呼ばれるまで待機（tweenモックは即座に解決）
		await vi.waitFor(() => {
			expect(asyncCallback).toHaveBeenCalledTimes(1);
		});

		const tweenCountAfterFirst = mockedTween.mock.calls.length;

		// コールバックのPromise未解決中は入力ロックが維持される
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);
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
		card2After.emit("pointerdown", event);
		card2After.emit("pointerup", event);
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
		renderer.render(cards);

		const card2 = findCardContainer(renderer, 2);
		const event = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		card2.emit("pointerdown", event);
		card2.emit("pointerup", event);

		await vi.waitFor(() => {
			expect(mockParticleSystem.emit).toHaveBeenCalledTimes(1);
		});

		const emitConfig = mockParticleSystem.emit.mock.calls[0][0];
		expect(emitConfig.count).toBe(12);
		expect(emitConfig.pattern).toEqual({ type: "radial" });
	});
});

describe("HandRenderer キュー表示", () => {
	function createTestCards(): Card[] {
		return [
			{
				id: "card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-3",
				type: "wait",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[index] as Container;
	}

	function getTextChildren(container: Container): Text[] {
		return container.children.filter(
			(child) =>
				"text" in child &&
				typeof (child as { text: unknown }).text === "string",
		) as unknown as Text[];
	}

	it("キュー内のカードにバッジが表示される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setQueuedCards(new Map([["card-1", 1]]));
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const texts = getTextChildren(card0);
		const badgeText = texts.find((t) => t.text === "1");
		expect(badgeText).toBeDefined();
	});

	it("キュー外のカードにバッジが表示されない", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setQueuedCards(new Map([["card-1", 1]]));
		renderer.render(cards);

		const card1 = findCardContainer(renderer, 1);
		const texts = getTextChildren(card1);
		// 番号テキスト("1", "2", "3"等)がバッジとして存在しないこと
		const badgeText = texts.find(
			(t) => /^[0-9]+$/.test(t.text) && t.style.fontSize === 12,
		);
		expect(badgeText).toBeUndefined();
	});

	it("キュークリア後にバッジが消える", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setQueuedCards(new Map([["card-1", 1]]));
		renderer.render(cards);

		// クリア
		renderer.setQueuedCards(new Map());
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const texts = getTextChildren(card0);
		const badgeText = texts.find(
			(t) => /^[0-9]+$/.test(t.text) && t.style.fontSize === 12,
		);
		expect(badgeText).toBeUndefined();
	});

	it("複数カードの実行順序番号が正しい", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setQueuedCards(
			new Map([
				["card-1", 1],
				["card-2", 2],
			]),
		);
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const card1 = findCardContainer(renderer, 1);
		const texts0 = getTextChildren(card0);
		const texts1 = getTextChildren(card1);

		expect(texts0.find((t) => t.text === "1")).toBeDefined();
		expect(texts1.find((t) => t.text === "2")).toBeDefined();
	});

	it("キュー内カードにバッジが追加される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setQueuedCards(new Map([["card-1", 1]]));
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const card1 = findCardContainer(renderer, 1);

		// キュー内カードはバッジ分だけ子要素が多い
		expect(card0.children.length).toBeGreaterThan(card1.children.length);
	});
});

describe("カード種別ビジュアル差別化", () => {
	const allCardTypes: CardType[] = ["move", "fire", "thunder", "jump", "wait"];

	function renderSingleCard(type: CardType): Container {
		const renderer = new HandRenderer();
		const cards: Card[] = [
			{
				id: `card-${type}`,
				type,
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
		renderer.render(cards);
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[0] as Container;
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
			["fire", "🔥"],
			["thunder", "⚡"],
			["jump", "🦘"],
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

	describe("APコスト非表示", () => {
		it("カードにAPコスト表示がない", () => {
			for (const type of allCardTypes) {
				const cardContainer = renderSingleCard(type);
				const texts = getTextChildren(cardContainer);
				const costText = texts.find((t) => t.text.startsWith("AP:"));
				expect(costText).toBeUndefined();
			}
		});
	});
});

describe("HandRenderer ツールチップ表示", () => {
	function createTestCards(): Card[] {
		return [
			{
				id: "card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-3",
				type: "thunder",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
	}

	function findTooltipContainer(renderer: HandRenderer): Container {
		return renderer
			.getContainer()
			.children.find((c) => c.label === "tooltip") as Container;
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[index] as Container;
	}

	function getAllTextsRecursive(container: Container): Text[] {
		const texts: Text[] = [];
		for (const child of container.children) {
			if (
				"text" in child &&
				typeof (child as { text: unknown }).text === "string"
			) {
				texts.push(child as unknown as Text);
			}
			if ("children" in child) {
				texts.push(...getAllTextsRecursive(child as Container));
			}
		}
		return texts;
	}

	it("ルートコンテナにtooltipコンテナが存在する", () => {
		const renderer = new HandRenderer();
		const tooltipContainer = findTooltipContainer(renderer);
		expect(tooltipContainer).toBeDefined();
		expect(tooltipContainer.label).toBe("tooltip");
	});

	it("ホバー時にツールチップが表示される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		expect(tooltipContainer.children.length).toBeGreaterThan(0);
	});

	it("ツールチップにカード名が含まれる", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		const texts = getAllTextsRecursive(tooltipContainer);
		const hasName = texts.some((t) => t.text.includes(CARD_TYPE_NAME.move));
		expect(hasName).toBe(true);
	});

	it("ツールチップにAPコストが含まれない", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		const texts = getAllTextsRecursive(tooltipContainer);
		const hasCost = texts.some((t) => t.text.includes("AP:"));
		expect(hasCost).toBe(false);
	});

	it("ツールチップに詳細説明が含まれる", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		const texts = getAllTextsRecursive(tooltipContainer);
		const hasDesc = texts.some((t) => t.text.includes(CARD_DESCRIPTION.move));
		expect(hasDesc).toBe(true);
	});

	it("pointeroutでツールチップが消える", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const card0Hovered = findCardContainer(renderer, 0);
		card0Hovered.emit("pointerout", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		expect(tooltipContainer.children.length).toBe(0);
	});

	it("clear()でツールチップが消える", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		renderer.clear();

		const tooltipContainer = findTooltipContainer(renderer);
		expect(tooltipContainer.children.length).toBe(0);
	});

	it("ツールチップのY座標がカードより上にある", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = findTooltipContainer(renderer);
		const tooltip = tooltipContainer.children[0] as Container;
		expect(tooltip.y).toBeLessThan(0);
	});
});

describe("HandRenderer コンボ予告表示", () => {
	function createTestCards(): Card[] {
		return [
			{
				id: "card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-3",
				type: "thunder",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-4",
				type: "wait",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[index] as Container;
	}

	/** コンボ予告なしの基準子要素数を取得 */
	function getBaseChildCount(cardType: CardType): number {
		const renderer = new HandRenderer();
		renderer.setComboHistory(null);
		renderer.render([
			{
				id: "base-card",
				type: cardType,
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		]);
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return (cardsContainer.children[0] as Container).children.length;
	}

	it("comboHistory=nullの場合、コンボ予告が表示されない", () => {
		const baseCount = getBaseChildCount("fire");

		const renderer = new HandRenderer();
		renderer.setComboHistory(null);
		renderer.render(createTestCards());

		const attackCard = findCardContainer(renderer, 1);
		expect(attackCard.children.length).toBe(baseCount);
	});

	it("chain予告: fire後のfireカードに追加Graphicsが描画される", () => {
		const baseCount = getBaseChildCount("fire");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.render(createTestCards());

		const fireCard = findCardContainer(renderer, 1);
		expect(fireCard.children.length).toBe(baseCount + 1);
	});

	it("moveカードにはコンボ予告が表示されない", () => {
		const baseCount = getBaseChildCount("move");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.render(createTestCards());

		const moveCard = findCardContainer(renderer, 0);
		expect(moveCard.children.length).toBe(baseCount);
	});

	it("thunderカードにはコンボ予告が表示されない", () => {
		const baseCount = getBaseChildCount("thunder");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.render(createTestCards());

		const thunderCard = findCardContainer(renderer, 2);
		expect(thunderCard.children.length).toBe(baseCount);
	});

	it("選択中のfireカードにはコンボ予告が表示されない（金枠が優先）", () => {
		const baseCount = getBaseChildCount("fire");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.setSelectedCard("card-2");
		renderer.render(createTestCards());

		const fireCard = findCardContainer(renderer, 1);
		expect(fireCard.children.length).toBe(baseCount);
	});

	it("キュー内のfireカードにはコンボ予告が表示されない（金枠が優先）", () => {
		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.setQueuedCards(new Map([["card-2", 1]]));
		renderer.render(createTestCards());

		const fireCard = findCardContainer(renderer, 1);

		// キューバッジ(2要素)は追加されるが、コンボ予告は追加されない
		renderer.setComboHistory(null);
		renderer.setQueuedCards(new Map([["card-2", 1]]));
		renderer.render(createTestCards());
		const fireCardNoCombo = findCardContainer(renderer, 1);

		expect(fireCard.children.length).toBe(fireCardNoCombo.children.length);
	});

	it("clear()でコンボ予告状態がリセットされる", () => {
		const baseCount = getBaseChildCount("fire");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "fire", lastDirection: null });
		renderer.clear();
		renderer.render(createTestCards());

		const attackCard = findCardContainer(renderer, 1);
		expect(attackCard.children.length).toBe(baseCount);
	});

	it("lastCardType=waitの場合、集中攻撃の予告（全辺強調）が表示される", () => {
		const baseCount = getBaseChildCount("fire");

		const renderer = new HandRenderer();
		renderer.setComboHistory({ lastCardType: "wait", lastDirection: null });
		renderer.render(createTestCards());

		const attackCard = findCardContainer(renderer, 1);
		expect(attackCard.children.length).toBe(baseCount + 1);
	});
});

describe("HandRenderer ドラッグ＆ドロップ", () => {
	function createTestCards(): Card[] {
		return [
			{
				id: "card-1",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-2",
				type: "fire",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-3",
				type: "wait",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
			{
				id: "card-4",
				type: "move",
				level: 1,
				exp: 0,
				stats: { useCount: 0, defeatCount: 0, maxSingleDamage: 0 },
			},
		];
	}

	function findCardContainer(renderer: HandRenderer, index: number): Container {
		const cardsContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "cards") as Container;
		return cardsContainer.children[index] as Container;
	}

	it("DRAG_THRESHOLD未満のポインタ移動はクリック扱いになる", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const callback = vi.fn();
		renderer.setOnCardSelect(callback);
		renderer.render(cards);

		const card2 = findCardContainer(renderer, 2);
		// pointerdown
		card2.emit("pointerdown", {
			button: 0,
			global: { x: 100, y: 50 },
		} as FederatedPointerEvent);

		// 閾値未満の微小移動
		renderer.getContainer().emit("globalpointermove", {
			global: { x: 102, y: 51 },
		} as FederatedPointerEvent);

		// pointerup（クリック扱い）
		card2.emit("pointerup", {
			button: 0,
			global: { x: 102, y: 51 },
		} as FederatedPointerEvent);

		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(cards[2]);
		});
	});

	it("DRAG_THRESHOLD以上のポインタ移動はドラッグ扱いになり、onReorderが呼ばれる", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const reorderCallback = vi.fn();
		const clickCallback = vi.fn();
		renderer.setOnCardSelect(clickCallback);
		renderer.setOnReorder(reorderCallback);
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		// pointerdown
		card0.emit("pointerdown", {
			button: 0,
			global: { x: 100, y: 50 },
		} as FederatedPointerEvent);

		// 閾値以上の移動（ドラッグ確定）
		renderer.getContainer().emit("globalpointermove", {
			global: { x: 300, y: 50 },
		} as FederatedPointerEvent);

		// pointerup（ドロップ扱い）
		card0.emit("pointerupoutside", {
			button: 0,
			global: { x: 300, y: 50 },
		} as FederatedPointerEvent);

		// クリックコールバックは呼ばれない
		expect(clickCallback).not.toHaveBeenCalled();
		// リオーダーコールバックが呼ばれる
		expect(reorderCallback).toHaveBeenCalledTimes(1);
		expect(reorderCallback).toHaveBeenCalledWith(0, expect.any(Number));
	});

	it("ドラッグ確定後、同じ位置にドロップした場合はonReorderが呼ばれない", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const reorderCallback = vi.fn();
		renderer.setOnReorder(reorderCallback);
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const containerPos = renderer.getContainer().getGlobalPosition();

		// 手札の中心付近の座標を計算（card0の位置にドロップ）
		const totalWidth =
			cards.length * CARD_WIDTH + (cards.length - 1) * CARD_GAP;
		const startX = -totalWidth / 2 + containerPos.x;
		const card0CenterX = startX + CARD_WIDTH / 2;

		card0.emit("pointerdown", {
			button: 0,
			global: { x: card0CenterX, y: 50 },
		} as FederatedPointerEvent);

		// 垂直に大きく動かす（DRAG_THRESHOLD超え）が、水平位置はcard0のまま
		renderer.getContainer().emit("globalpointermove", {
			global: { x: card0CenterX, y: 100 },
		} as FederatedPointerEvent);

		card0.emit("pointerupoutside", {
			button: 0,
			global: { x: card0CenterX, y: 100 },
		} as FederatedPointerEvent);

		// 同じ位置なのでonReorderは呼ばれない
		expect(reorderCallback).not.toHaveBeenCalled();
	});

	it("ドラッグ確定中のrender()呼び出しは再描画をスキップする", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const card0InitialX = card0.x;

		// ドラッグ開始
		card0.emit("pointerdown", {
			button: 0,
			global: { x: 100, y: 50 },
		} as FederatedPointerEvent);

		// 閾値以上の移動（ドラッグ確定）
		renderer.getContainer().emit("globalpointermove", {
			global: { x: 200, y: 50 },
		} as FederatedPointerEvent);

		// ドラッグ中のカード位置を記録
		const card0DragX = card0.x;
		expect(card0DragX).not.toBe(card0InitialX);

		// 外部からrender()を呼んでもドラッグ状態が維持される
		renderer.render(cards);
		expect(card0.x).toBe(card0DragX);
	});

	it("isInputLocked中はドラッグ開始しない", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const reorderCallback = vi.fn();
		renderer.setOnReorder(reorderCallback);

		const mockedTween = vi.mocked(tween);
		const tweenCountBefore = mockedTween.mock.calls.length;

		// 未解決Promiseで入力ロック
		let resolveTween!: () => void;
		mockedTween.mockImplementationOnce(() => {
			return new Promise<void>((resolve) => {
				resolveTween = resolve;
			});
		});
		renderer.setOnCardSelect(vi.fn());
		renderer.render(cards);

		// 最初のクリックで入力ロック
		const card2 = findCardContainer(renderer, 2);
		const clickEvent = {
			button: 0,
			global: { x: 0, y: 0 },
		} as FederatedPointerEvent;
		card2.emit("pointerdown", clickEvent);
		card2.emit("pointerup", clickEvent);

		await vi.waitFor(() => {
			expect(mockedTween.mock.calls.length).toBeGreaterThan(tweenCountBefore);
		});

		// 入力ロック中にドラッグを試行
		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerdown", {
			button: 0,
			global: { x: 100, y: 50 },
		} as FederatedPointerEvent);

		renderer.getContainer().emit("globalpointermove", {
			global: { x: 300, y: 50 },
		} as FederatedPointerEvent);

		card0.emit("pointerup", {
			button: 0,
			global: { x: 300, y: 50 },
		} as FederatedPointerEvent);

		// ドラッグは開始されていないのでonReorderは呼ばれない
		expect(reorderCallback).not.toHaveBeenCalled();

		// cleanup
		resolveTween();
	});

	it("使用済みカードのホバーでツールチップが表示される", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setUsedCardIds(new Set(["card-1"]));
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const tooltipContainer = renderer
			.getContainer()
			.children.find((c) => c.label === "tooltip") as Container;
		expect(tooltipContainer.children.length).toBeGreaterThan(0);
	});

	it("使用済みカードのホバーでカードが浮き上がらない", () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		renderer.setUsedCardIds(new Set(["card-1"]));
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		card0.emit("pointerover", {} as FederatedPointerEvent);

		const card0After = findCardContainer(renderer, 0);
		expect(card0After.y).toBe(0);
	});

	it("使用済みカードのクリックはコールバックを呼ばない", async () => {
		const renderer = new HandRenderer();
		const cards = createTestCards();
		const clickCallback = vi.fn();
		renderer.setOnCardSelect(clickCallback);
		renderer.setUsedCardIds(new Set(["card-1"]));
		renderer.render(cards);

		const card0 = findCardContainer(renderer, 0);
		const event = {
			button: 0,
			global: { x: 100, y: 50 },
		} as FederatedPointerEvent;
		card0.emit("pointerdown", event);
		card0.emit("pointerup", event);

		// 少し待ってもコールバックは呼ばれない
		await new Promise((r) => setTimeout(r, 50));
		expect(clickCallback).not.toHaveBeenCalled();
	});
});
