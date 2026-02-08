/**
 * マップレンダラーのテスト（攻撃エフェクト）
 */

import { describe, expect, it, vi } from "vitest";
import { createTweenMock, mockEasing } from "../test-utils/mockTween";
import { MapRenderer } from "./mapRenderer";

vi.mock("../utils/tween", () => ({
	Easing: mockEasing,
	tween: createTweenMock(),
}));

// Ticker をモック化（addされたコールバックを即座に実行して完了）
vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");

	const MockTicker = {
		shared: {
			add: (fn: (tick: { deltaMS: number }) => void) => {
				// シェイクを即完了させるため、duration分の時間を一気に進める
				fn({ deltaMS: 300 });
			},
			remove: () => {},
		},
	};

	return {
		...actual,
		Ticker: MockTicker,
	};
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

describe("MapRenderer ダメージポップアップ", () => {
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
		await expect(renderer.animateAttackHit("e1", 1)).resolves.toBeUndefined();
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
		await expect(renderer.animateEnemyAttackHit(1)).resolves.toBeUndefined();
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
		await expect(renderer.animateAttackHit("e1", 1)).resolves.toBeUndefined();
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
		await expect(renderer.animateEnemyAttackHit(1)).resolves.toBeUndefined();
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

		await renderer.animateEnemyAttackHit(1);

		// コンテナ内のプレイヤーグラフィックス（3番目の子要素）のalphaが1であること
		const container = renderer.getContainer();
		const playerGraphics = container.children[2];
		expect(playerGraphics.alpha).toBe(1);
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

		await renderer.animateAttackHit("e1", 1);

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
		const enemiesContainer = container.children[1];
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
		const enemiesContainer = container.children[1];
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
		const enemiesContainer = container.children[1];
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
		const enemiesContainer = container.children[1];
		expect(enemiesContainer.children.length).toBe(3);
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

		await expect(
			renderer.animateAttackHit("e-scout", 1),
		).resolves.toBeUndefined();
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

	it("撃破アニメーション完了後に敵Graphicsが削除される", async () => {
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

		// enemiesContainerに敵Graphicsが存在すること
		const container = renderer.getContainer();
		const enemiesContainer = container.children[1];
		expect(enemiesContainer.children.length).toBe(1);

		await renderer.animateEnemyDefeat("e1");

		// 撃破後、敵Graphicsが削除されていること
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
