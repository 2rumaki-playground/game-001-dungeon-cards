/**
 * パーティクルエフェクトシステムのテスト
 */

import { describe, expect, it, vi } from "vitest";
import { createTickerMock } from "../test-utils/mockPixi";
import type { ParticleConfig } from "./particleLogic";

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
		tickerMock.reset();
		const system = new ParticleSystem();
		system.emit(baseConfig);
		expect(tickerMock.callbacks).toHaveLength(1);
	});

	it("emit()がcontainerにGraphicsを追加する", () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		system.emit(baseConfig);
		expect(system.getContainer().children).toHaveLength(1);
	});

	it("全パーティクル消滅後にPromiseがresolveする", async () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		const promise = system.emit(baseConfig);

		// 寿命300msのパーティクルを一気に消滅させる
		tickerMock.tick(400);

		await promise;
		expect(system.getContainer().children).toHaveLength(0);
	});

	it("全パーティクル消滅後にTickerコールバックが解除される", async () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		const promise = system.emit(baseConfig);

		tickerMock.tick(400);

		await promise;
		expect(tickerMock.callbacks).toHaveLength(0);
	});

	it("複数のemit()を並列実行できる", async () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		const p1 = system.emit(baseConfig);
		const p2 = system.emit(baseConfig);

		expect(tickerMock.callbacks).toHaveLength(2);
		expect(system.getContainer().children).toHaveLength(2);

		tickerMock.tick(400);

		await Promise.all([p1, p2]);
		expect(system.getContainer().children).toHaveLength(0);
		expect(tickerMock.callbacks).toHaveLength(0);
	});

	it("clear()で全エフェクトが即時破棄される", () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		system.emit(baseConfig);
		system.emit(baseConfig);

		expect(system.getContainer().children).toHaveLength(2);

		system.clear();
		expect(system.getContainer().children).toHaveLength(0);
	});

	it("clear()でTickerコールバックが解除される", () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		system.emit(baseConfig);
		system.emit(baseConfig);

		expect(tickerMock.callbacks).toHaveLength(2);

		system.clear();
		expect(tickerMock.callbacks).toHaveLength(0);
	});

	it("clear()で未完了のemit() Promiseがresolveされる", async () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		const p1 = system.emit(baseConfig);
		const p2 = system.emit(baseConfig);

		system.clear();

		await Promise.all([p1, p2]);
	});

	it("count=0のemit()は即座にresolveする", async () => {
		tickerMock.reset();
		const system = new ParticleSystem();
		const config: ParticleConfig = { ...baseConfig, count: 0 };
		await system.emit(config);

		expect(tickerMock.callbacks).toHaveLength(0);
		expect(system.getContainer().children).toHaveLength(0);
	});
});
