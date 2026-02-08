/**
 * パーティクルエフェクトシステムのテスト
 */

import { describe, expect, it, vi } from "vitest";
import type { ParticleConfig } from "./particleLogic";

// Ticker をモック化
let tickerCallbacks: Array<(tick: { deltaMS: number }) => void> = [];
vi.mock("pixi.js", async () => {
	const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");

	const MockTicker = {
		shared: {
			add: (fn: (tick: { deltaMS: number }) => void) => {
				tickerCallbacks.push(fn);
			},
			remove: (fn: (tick: { deltaMS: number }) => void) => {
				tickerCallbacks = tickerCallbacks.filter((cb) => cb !== fn);
			},
		},
	};

	return {
		...actual,
		Ticker: MockTicker,
	};
});

import { ParticleSystem } from "./particleSystem";

const baseConfig: ParticleConfig = {
	count: 5,
	origin: { x: 100, y: 100 },
	color: 0xff0000,
	speed: { min: 0.1, max: 0.1 },
	life: { min: 300, max: 300 },
	size: { min: 4, max: 4 },
	pattern: { type: "radial" },
};

describe("ParticleSystem", () => {
	it("getContainer()がContainerを返す", () => {
		const system = new ParticleSystem();
		const container = system.getContainer();
		expect(container).toBeDefined();
		expect(container.children).toHaveLength(0);
	});

	it("emit()がTickerにコールバックを登録する", () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		system.emit(baseConfig);
		expect(tickerCallbacks).toHaveLength(1);
	});

	it("emit()がcontainerにGraphicsを追加する", () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		system.emit(baseConfig);
		expect(system.getContainer().children).toHaveLength(1);
	});

	it("全パーティクル消滅後にPromiseがresolveする", async () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		const promise = system.emit(baseConfig);

		// 寿命300msのパーティクルを一気に消滅させる
		for (const cb of [...tickerCallbacks]) {
			cb({ deltaMS: 400 });
		}

		await promise;
		expect(system.getContainer().children).toHaveLength(0);
	});

	it("全パーティクル消滅後にTickerコールバックが解除される", async () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		const promise = system.emit(baseConfig);

		for (const cb of [...tickerCallbacks]) {
			cb({ deltaMS: 400 });
		}

		await promise;
		expect(tickerCallbacks).toHaveLength(0);
	});

	it("複数のemit()を並列実行できる", async () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		const p1 = system.emit(baseConfig);
		const p2 = system.emit(baseConfig);

		expect(tickerCallbacks).toHaveLength(2);
		expect(system.getContainer().children).toHaveLength(2);

		for (const cb of [...tickerCallbacks]) {
			cb({ deltaMS: 400 });
		}

		await Promise.all([p1, p2]);
		expect(system.getContainer().children).toHaveLength(0);
		expect(tickerCallbacks).toHaveLength(0);
	});

	it("clear()で全エフェクトが即時破棄される", () => {
		tickerCallbacks = [];
		const system = new ParticleSystem();
		system.emit(baseConfig);
		system.emit(baseConfig);

		expect(system.getContainer().children).toHaveLength(2);

		system.clear();
		expect(system.getContainer().children).toHaveLength(0);
	});
});
