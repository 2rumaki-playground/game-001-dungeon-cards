/**
 * マップレンダラーのテスト（ポップアップ・エフェクト）
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTickerMock } from "../test-utils/mockPixi";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { MapRenderer } from "./mapRenderer";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

const tickerMock = createTickerMock();
vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	return {
		...actual,
		Ticker: {
			shared: {
				add: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.add(fn),
				remove: (fn: (tick: { deltaMS: number }) => void) =>
					tickerMock.shared.remove(fn),
			},
		},
	};
});

// assetLoader をモック化（ダミーテクスチャを返す）
vi.mock("./assetLoader", async () => {
	const pixi = await vi.importActual<typeof import("pixi.js")>("pixi.js");
	const dummyTexture = pixi.Texture.WHITE;
	return {
		getTileTexture: () => dummyTexture,
		getPlayerTexture: () => dummyTexture,
		getEnemyTexture: () => dummyTexture,
	};
});

beforeEach(() => {
	tickerMock.reset();
});

/**
 * テスト用のマップ状態を作成
 */
function createTestMap() {
	const map = [];
	for (let y = 0; y < 5; y++) {
		const row = [];
		for (let x = 0; x < 5; x++) {
			row.push({ type: "floor" as const });
		}
		map.push(row);
	}
	return map;
}

describe("MapRenderer ダメージ/タイル効果ポップアップ", () => {
	it("animateDamagePopupが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateDamagePopup({ x: 1, y: 1 }, 1),
		).resolves.toBeUndefined();
	});

	it("回復ポップアップが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateDamagePopup({ x: 1, y: 1 }, 3, "heal"),
		).resolves.toBeUndefined();
	});

	it("トラップダメージポップアップが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateDamagePopup({ x: 1, y: 1 }, 1, "trap_damage"),
		).resolves.toBeUndefined();
	});

	it("animateTileEffectPopupが罠タイプで正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 2, y: 2 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateTileEffectPopup("trap", 1),
		).resolves.toBeUndefined();
	});

	it("animateTileEffectPopupが宝箱タイプで正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 2, y: 2 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateTileEffectPopup("treasure", 3),
		).resolves.toBeUndefined();
	});

	it("animateTileEffectPopupが休憩所タイプで正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 2, y: 2 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateTileEffectPopup("rest_area", 5),
		).resolves.toBeUndefined();
	});

	it("ポップアップ完了後にTextが破棄されている", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		const container = renderer.getContainer();
		const childCountBefore = container.children.length;

		await renderer.animateDamagePopup({ x: 2, y: 2 }, 1);

		// ポップアップ完了後、子要素が増えていないこと（Textが破棄されている）
		expect(container.children.length).toBe(childCountBefore);
	});

	it("animateAttackHitでダメージポップアップも表示される", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 0 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		// ダメージ値付きで呼び出しても正常に完了すること
		const promise = renderer.animateAttackHit("e1", 1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
	});

	it("animateEnemyAttackHitでダメージポップアップも表示される", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		// ダメージ値付きで呼び出しても正常に完了すること
		const promise = renderer.animateEnemyAttackHit(1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
	});
});

describe("MapRenderer 攻撃エフェクト", () => {
	it("animateAttackHitが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 0 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		// 敵e1に対する攻撃エフェクトが正常に完了すること
		const promise = renderer.animateAttackHit("e1", 1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
	});

	it("存在しない敵IDでanimateAttackHitを呼んでも正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateAttackHit("nonexistent", 1),
		).resolves.toBeUndefined();
	});

	it("animateEnemyAttackHitが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		// 敵攻撃エフェクトが正常に完了すること
		const promise = renderer.animateEnemyAttackHit(1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
	});

	it("animateEnemyAttackHit完了後にプレイヤーのalphaが1に戻る", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		const promise = renderer.animateEnemyAttackHit(1);
		tickerMock.tick(300);
		await promise;

		// コンテナ内のプレイヤースプライト（5番目の子要素）のalphaが1であること
		const container = renderer.getContainer();
		const playerSprite = container.children[4];
		expect(playerSprite.alpha).toBe(1);
	});

	it("animateAttackHit完了後にコンテナの座標が元に戻る", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 0 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		const container = renderer.getContainer();
		const originalX = container.x;
		const originalY = container.y;

		const promise = renderer.animateAttackHit("e1", 1);
		tickerMock.tick(300);
		await promise;

		// シェイク完了後にコンテナ座標が元に戻ること
		expect(container.x).toBe(originalX);
		expect(container.y).toBe(originalY);
	});
});

describe("MapRenderer MISSポップアップ", () => {
	it("animateMissPopupが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		await expect(
			renderer.animateMissPopup({ x: 1, y: 1 }),
		).resolves.toBeUndefined();
	});

	it("ポップアップ完了後にTextがcontainerから除去・破棄されている", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, []);

		const container = renderer.getContainer();
		const childCountBefore = container.children.length;

		await renderer.animateMissPopup({ x: 2, y: 2 });

		expect(container.children.length).toBe(childCountBefore);
	});
});
