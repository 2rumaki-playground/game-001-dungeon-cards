/**
 * マップレンダラーのテスト（攻撃エフェクト）
 */

import { type FederatedPointerEvent, Graphics } from "pixi.js";
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

describe("MapRenderer タイプ別敵描画", () => {
	it("Normal敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Heavy敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-heavy",
				position: { x: 2, y: 2 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Scout敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 3, y: 3 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Miniboss敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-miniboss",
				position: { x: 1, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
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
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ（内部にSprite + HPバー）
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("Boss敵が描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-boss",
				position: { x: 2, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
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
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ（内部にSprite + HPバー）
		expect(enemiesContainer.children.length).toBe(1);
	});

	it("全タイプの敵が同時に描画できる", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
			{
				id: "e-heavy",
				position: { x: 2, y: 2 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
			},
			{
				id: "e-scout",
				position: { x: 3, y: 3 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
			},
			{
				id: "e-miniboss",
				position: { x: 4, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
			},
			{
				id: "e-boss",
				position: { x: 4, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
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
		const enemiesContainer = container.children[4];
		// 5体 = 5つの敵コンテナ
		expect(enemiesContainer.children.length).toBe(5);
	});

	it("Heavy敵の撃破アニメーションが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-heavy",
				position: { x: 1, y: 1 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
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

		await expect(
			renderer.animateEnemyDefeat("e-heavy"),
		).resolves.toBeUndefined();
	});

	it("Scout敵の攻撃ヒットアニメーションが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 1, y: 0 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
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

		const promise = renderer.animateAttackHit("e-scout", 1);
		tickerMock.tick(300);
		await expect(promise).resolves.toBeUndefined();
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

describe("MapRenderer 敵撃破アニメーション", () => {
	it("animateEnemyDefeatが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
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

		await expect(renderer.animateEnemyDefeat("e1")).resolves.toBeUndefined();
	});

	it("撃破アニメーション完了後に敵コンテナが削除される", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
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

		// enemiesContainerに敵コンテナが存在すること
		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);

		await renderer.animateEnemyDefeat("e1");

		// 撃破後、敵コンテナが削除されていること
		expect(enemiesContainer.children.length).toBe(0);
	});

	it("Miniboss敵の撃破アニメーション完了後にコンテナごと削除される", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-miniboss",
				position: { x: 1, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);

		await renderer.animateEnemyDefeat("e-miniboss");

		// 撃破後、敵コンテナが削除されていること
		expect(enemiesContainer.children.length).toBe(0);
	});

	it("存在しない敵IDでanimateEnemyDefeatを呼んでもエラーにならない", async () => {
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
			renderer.animateEnemyDefeat("nonexistent"),
		).resolves.toBeUndefined();
	});
});

describe("MapRenderer HPバー", () => {
	it("miniboss敵のコンテナにHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-miniboss",
				position: { x: 1, y: 1 },
				hp: 8,
				maxHp: 8,
				type: "miniboss" as const,
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
		const enemiesContainer = container.children[4];
		// 敵コンテナ1つ
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("boss敵のコンテナにHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-boss",
				position: { x: 2, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("normal敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("heavy敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-heavy",
				position: { x: 1, y: 1 },
				hp: 5,
				maxHp: 5,
				type: "heavy" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("scout敵のコンテナにもHPバーが含まれる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-scout",
				position: { x: 1, y: 1 },
				hp: 2,
				maxHp: 2,
				type: "scout" as const,
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
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(1);
		// 敵コンテナ内にSprite(1) + HPバー(1) = 2
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.children.length).toBe(2);
	});

	it("HP減少が通常敵のHPバーに反映される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};

		// HP満タンで描画
		const fullHpEnemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 3,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		const rectSpy = vi.spyOn(Graphics.prototype, "rect");
		renderer.render(map, player, fullHpEnemies);

		// HPバー描画: 背景rect + HP部分rect
		const fullHpCalls = rectSpy.mock.calls.filter(
			(args) => args[2] !== undefined && args[3] === 6,
		);
		// 背景(幅40) + HP部分(幅40)
		expect(fullHpCalls).toHaveLength(2);
		const fullBarWidth = fullHpCalls[1][2] as number;

		// HP減少して再描画
		rectSpy.mockClear();
		const damagedEnemies = [
			{
				id: "e-normal",
				position: { x: 1, y: 1 },
				hp: 1,
				maxHp: 3,
				type: "normal" as const,
			},
		];
		renderer.render(map, player, damagedEnemies);

		const damagedHpCalls = rectSpy.mock.calls.filter(
			(args) => args[2] !== undefined && args[3] === 6,
		);
		expect(damagedHpCalls).toHaveLength(2);
		const damagedBarWidth = damagedHpCalls[1][2] as number;

		// HP比率に応じてバー幅が縮小していること
		expect(damagedBarWidth).toBeLessThan(fullBarWidth);
		expect(damagedBarWidth).toBeCloseTo(fullBarWidth * (1 / 3), 5);

		rectSpy.mockRestore();
	});

	it("clear後にコンテナがクリアされる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e-boss",
				position: { x: 2, y: 2 },
				hp: 15,
				maxHp: 15,
				type: "boss" as const,
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
		renderer.clear();

		const container = renderer.getContainer();
		const enemiesContainer = container.children[4];
		expect(enemiesContainer.children.length).toBe(0);
	});
});

describe("MapRenderer タイルスプライト描画", () => {
	it("マップのタイル数と同じスプライトが生成される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap(); // 5x5
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(25);
	});

	it("特殊タイルを含むマップが正しく描画される", () => {
		const renderer = new MapRenderer();
		const map = [
			[{ type: "floor" as const }, { type: "trap" as const }],
			[{ type: "treasure" as const }, { type: "rest_area" as const }],
		];
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(4);
	});

	it("階段タイルがスプライトとして描画される", () => {
		const renderer = new MapRenderer();
		const map = [[{ type: "stairs" as const }]];
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(1);
	});

	it("同一map参照で再呼び出しするとSprite再生成がスキップされる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		renderer.renderMap(map);

		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		const childrenBefore = [...tilesContainer.children];

		// 同一参照で再呼び出し
		renderer.renderMap(map);

		// children の参照が維持されていること（Spriteが差し替わっていない）
		expect(tilesContainer.children.length).toBe(childrenBefore.length);
		for (let i = 0; i < childrenBefore.length; i++) {
			expect(tilesContainer.children[i]).toBe(childrenBefore[i]);
		}
	});

	it("renderMapを再呼び出しすると前のスプライトがクリアされる", () => {
		const renderer = new MapRenderer();
		const map1 = [[{ type: "floor" as const }]]; // 1x1
		const map2 = createTestMap(); // 5x5

		renderer.renderMap(map1);
		const container = renderer.getContainer();
		const tilesContainer = container.children[0];
		expect(tilesContainer.children.length).toBe(1);

		renderer.renderMap(map2);
		expect(tilesContainer.children.length).toBe(25);
	});
});

describe("MapRenderer Fog of War", () => {
	const player = {
		position: { x: 0, y: 0 },
		hp: 10,
		maxHp: 10,
		ap: 3,
		maxAp: 3,
	};

	describe("renderEnemies with visitedTiles", () => {
		it("訪問済みタイル上の敵は表示される", () => {
			const renderer = new MapRenderer();
			const map = createTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			const visitedTiles = new Set(["1,1"]);
			renderer.render(map, player, enemies, false, false, {}, visitedTiles);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(1);
		});

		it("未訪問タイル上の敵は描画されない", () => {
			const renderer = new MapRenderer();
			const map = createTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			// (1,1)は未訪問
			const visitedTiles = new Set(["0,0"]);
			renderer.render(map, player, enemies, false, false, {}, visitedTiles);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(0);
		});

		it("visitedTiles未指定時は全敵が表示される（後方互換）", () => {
			const renderer = new MapRenderer();
			const map = createTestMap();
			const enemies = [
				{
					id: "e1",
					position: { x: 1, y: 1 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
				{
					id: "e2",
					position: { x: 2, y: 2 },
					hp: 3,
					maxHp: 3,
					type: "normal" as const,
				},
			];
			renderer.render(map, player, enemies);

			const container = renderer.getContainer();
			const enemiesContainer = container.children[4];
			expect(enemiesContainer.children.length).toBe(2);
		});
	});

	describe("renderFog", () => {
		it("未訪問タイルに黒い矩形が描画される", () => {
			const renderer = new MapRenderer();
			const map = [
				[{ type: "floor" as const }, { type: "floor" as const }],
				[{ type: "floor" as const }, { type: "floor" as const }],
			];
			// (0,0)のみ訪問済み → 残り3タイルがfog対象
			const visitedTiles = new Set(["0,0"]);

			const rectSpy = vi.spyOn(Graphics.prototype, "rect");
			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, [], false, false, {}, visitedTiles);

			// fogGraphicsのrect呼び出し: 3タイル分（remnants.clear後のfog描画）
			// rectは他の描画でも呼ばれるので、fill(0x000000)の呼び出し回数で判定
			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(3);

			rectSpy.mockRestore();
			fillSpy.mockRestore();
		});

		it("全タイル訪問済みの場合はfog矩形が描画されない", () => {
			const renderer = new MapRenderer();
			const map = [[{ type: "floor" as const }, { type: "floor" as const }]];
			const visitedTiles = new Set(["0,0", "1,0"]);

			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, [], false, false, {}, visitedTiles);

			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(0);

			fillSpy.mockRestore();
		});

		it("visitedTiles未指定時はfogGraphicsがクリアされる", () => {
			const renderer = new MapRenderer();
			const map = createTestMap();

			const fillSpy = vi.spyOn(Graphics.prototype, "fill");

			renderer.render(map, player, []);

			// visitedTiles未指定時は0x000000のfillは呼ばれない
			const fogFillCalls = fillSpy.mock.calls.filter(
				(args) => args[0] === 0x000000,
			);
			expect(fogFillCalls.length).toBe(0);

			fillSpy.mockRestore();
		});
	});
});

describe("MapRenderer 敵ホバーツールチップ", () => {
	it("敵コンテナのeventModeがstaticに設定される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
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
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.eventMode).toBe("static");
	});

	it("敵コンテナにpointerover/pointeroutリスナーが登録される", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
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
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		expect(enemyContainer.listenerCount("pointerover")).toBe(1);
		expect(enemyContainer.listenerCount("pointerout")).toBe(1);
	});

	it("pointeroverでツールチップが表示されpointeroutで非表示になる", () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [
			{
				id: "e1",
				position: { x: 1, y: 1 },
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
		const enemiesContainer = container.children[4];
		const enemyContainer = enemiesContainer.children[0];
		// ルートコンテナの最上位に追加されたツールチップ
		const tooltipContainer = container.children.at(-1);

		expect(tooltipContainer?.visible).toBe(false);
		enemyContainer.emit("pointerover", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(true);
		enemyContainer.emit("pointerout", {} as FederatedPointerEvent);
		expect(tooltipContainer?.visible).toBe(false);
	});

	it("ツールチップコンテナがルートコンテナの最上位に追加される", () => {
		const renderer = new MapRenderer();
		const container = renderer.getContainer();
		const lastChild = container.children.at(-1);
		// ツールチップは初期状態で非表示
		expect(lastChild?.visible).toBe(false);
		// ツールチップコンテナはイベントを受け取らない
		expect(lastChild?.eventMode).toBe("none");
	});
});
