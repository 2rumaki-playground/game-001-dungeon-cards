/**
 * マップレンダラーのテスト（攻撃エフェクト）
 */

import { describe, expect, it, vi } from "vitest";
import { MapRenderer } from "./mapRenderer";

// tween をモック化（即座にresolve、対象プロパティを適用）
vi.mock("../utils/tween", () => ({
	Easing: {
		easeOut: (t: number) => t,
		easeOutCubic: (t: number) => t,
	},
	tween: vi.fn(
		(
			target: { alpha?: number; x?: number; y?: number },
			to: { alpha?: number; x?: number; y?: number },
		) => {
			if (to.alpha !== undefined) target.alpha = to.alpha;
			if (to.x !== undefined) target.x = to.x;
			if (to.y !== undefined) target.y = to.y;
			return Promise.resolve();
		},
	),
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

describe("MapRenderer 攻撃エフェクト", () => {
	it("animateAttackHitが正常に完了する", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [{ id: "e1", position: { x: 1, y: 0 }, hp: 3, maxHp: 3 }];
		const player = {
			position: { x: 0, y: 0 },
			hp: 10,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
		};
		renderer.render(map, player, enemies);

		// 敵e1に対する攻撃エフェクトが正常に完了すること
		await expect(renderer.animateAttackHit("e1")).resolves.toBeUndefined();
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
			renderer.animateAttackHit("nonexistent"),
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
		await expect(renderer.animateEnemyAttackHit()).resolves.toBeUndefined();
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

		await renderer.animateEnemyAttackHit();

		// コンテナ内のプレイヤーグラフィックス（3番目の子要素）のalphaが1であること
		const container = renderer.getContainer();
		const playerGraphics = container.children[2];
		expect(playerGraphics.alpha).toBe(1);
	});

	it("animateAttackHit完了後にコンテナの座標が元に戻る", async () => {
		const renderer = new MapRenderer();
		const map = createTestMap();
		const enemies = [{ id: "e1", position: { x: 1, y: 0 }, hp: 3, maxHp: 3 }];
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

		await renderer.animateAttackHit("e1");

		// シェイク完了後にコンテナ座標が元に戻ること
		expect(container.x).toBe(originalX);
		expect(container.y).toBe(originalY);
	});
});
