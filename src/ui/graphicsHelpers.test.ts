import type { Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import {
	createOverlay,
	drawRoundedRect,
	makeInteractive,
} from "./graphicsHelpers";

function createMockGraphics() {
	const calls: { method: string; args: unknown[] }[] = [];
	return {
		_calls: calls,
		eventMode: "passive" as string,
		rect: vi.fn((...args: unknown[]) => {
			calls.push({ method: "rect", args });
		}),
		roundRect: vi.fn((...args: unknown[]) => {
			calls.push({ method: "roundRect", args });
		}),
		fill: vi.fn((...args: unknown[]) => {
			calls.push({ method: "fill", args });
		}),
		stroke: vi.fn((...args: unknown[]) => {
			calls.push({ method: "stroke", args });
		}),
	} as unknown as Graphics & {
		_calls: { method: string; args: unknown[] }[];
		eventMode: string;
		rect: ReturnType<typeof vi.fn>;
	};
}

describe("drawRoundedRect", () => {
	it("roundRect→fill→roundRect→strokeの順に呼び出される", () => {
		const g = createMockGraphics();

		drawRoundedRect(g, 100, 50, 8, 0x334455, { color: 0xaabbcc, width: 2 });

		expect(g._calls).toEqual([
			{ method: "roundRect", args: [0, 0, 100, 50, 8] },
			{ method: "fill", args: [0x334455] },
			{ method: "roundRect", args: [0, 0, 100, 50, 8] },
			{ method: "stroke", args: [{ color: 0xaabbcc, width: 2 }] },
		]);
	});

	it("オブジェクト形式のfillColorに対応する", () => {
		const g = createMockGraphics();

		drawRoundedRect(
			g,
			200,
			100,
			6,
			{ color: 0x112233, alpha: 0.5 },
			{
				color: 0x445566,
				width: 1,
			},
		);

		expect(g._calls).toEqual([
			{ method: "roundRect", args: [0, 0, 200, 100, 6] },
			{ method: "fill", args: [{ color: 0x112233, alpha: 0.5 }] },
			{ method: "roundRect", args: [0, 0, 200, 100, 6] },
			{ method: "stroke", args: [{ color: 0x445566, width: 1 }] },
		]);
	});
});

describe("createOverlay", () => {
	it("指定サイズの矩形を描画する", () => {
		const g = createMockGraphics();

		createOverlay(g, 800, 600);

		expect(g.rect).toHaveBeenCalledWith(0, 0, 800, 600);
	});

	it("半透明の黒で塗りつぶす", () => {
		const g = createMockGraphics();

		createOverlay(g, 800, 600);

		expect(g.fill).toHaveBeenCalledWith({ color: 0x000000, alpha: 0.7 });
	});

	it("eventModeをstaticに設定する", () => {
		const g = createMockGraphics();

		createOverlay(g, 800, 600);

		expect(g.eventMode).toBe("static");
	});
});

function createMockContainer() {
	return {
		eventMode: "passive" as string,
		cursor: "default" as string,
		alpha: 1 as number,
		on: vi.fn(),
	} as unknown as Container & {
		eventMode: string;
		cursor: string;
		alpha: number;
		on: ReturnType<typeof vi.fn>;
	};
}

/** on()に登録されたコールバックをイベント名で取得する */
function getRegisteredCallback(
	container: ReturnType<typeof createMockContainer>,
	eventName: string,
): ((...args: unknown[]) => void) | undefined {
	const call = container.on.mock.calls.find(
		(c: unknown[]) => c[0] === eventName,
	);
	return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

describe("makeInteractive", () => {
	it("eventModeをstaticに設定する", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		expect(container.eventMode).toBe("static");
	});

	it("cursorをpointerに設定する", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		expect(container.cursor).toBe("pointer");
	});

	it("pointerdownイベントリスナーを登録する", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		expect(container.on).toHaveBeenCalledWith(
			"pointerdown",
			expect.any(Function),
		);
	});

	it("コールバックにFederatedPointerEventが渡される", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		const mockEvent = {
			button: 0,
			stopPropagation: vi.fn(),
		} as unknown as FederatedPointerEvent;
		const registeredCallback = container.on.mock.calls[0][1] as (
			e: FederatedPointerEvent,
		) => void;
		registeredCallback(mockEvent);

		expect(onClick).toHaveBeenCalledWith(mockEvent);
	});

	it("右クリック（button=2）ではコールバックを呼ばない", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		const mockEvent = {
			button: 2,
			stopPropagation: vi.fn(),
		} as unknown as FederatedPointerEvent;
		const registeredCallback = container.on.mock.calls[0][1] as (
			e: FederatedPointerEvent,
		) => void;
		registeredCallback(mockEvent);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("中クリック（button=1）ではコールバックを呼ばない", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		const mockEvent = {
			button: 1,
			stopPropagation: vi.fn(),
		} as unknown as FederatedPointerEvent;
		const registeredCallback = getRegisteredCallback(
			container,
			"pointerdown",
		) as (e: FederatedPointerEvent) => void;
		registeredCallback(mockEvent);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("pointeroverイベントリスナーを登録する", () => {
		const container = createMockContainer();

		makeInteractive(container, vi.fn());

		expect(container.on).toHaveBeenCalledWith(
			"pointerover",
			expect.any(Function),
		);
	});

	it("pointeroutイベントリスナーを登録する", () => {
		const container = createMockContainer();

		makeInteractive(container, vi.fn());

		expect(container.on).toHaveBeenCalledWith(
			"pointerout",
			expect.any(Function),
		);
	});

	it("ホバー時にalphaが0.8になる", () => {
		const container = createMockContainer();

		makeInteractive(container, vi.fn());

		const pointerover = getRegisteredCallback(container, "pointerover");
		expect(pointerover).toBeDefined();
		pointerover?.();

		expect(container.alpha).toBe(0.8);
	});

	it("ホバー解除時にホバー前のalphaに戻る", () => {
		const container = createMockContainer();

		makeInteractive(container, vi.fn());

		const pointerover = getRegisteredCallback(container, "pointerover");
		const pointerout = getRegisteredCallback(container, "pointerout");
		expect(pointerover).toBeDefined();
		expect(pointerout).toBeDefined();
		pointerover?.();
		pointerout?.();

		expect(container.alpha).toBe(1);
	});

	it("ホバー中にalphaが外部変更された場合、pointeroutで復元しない", () => {
		const container = createMockContainer();

		makeInteractive(container, vi.fn());

		const pointerover = getRegisteredCallback(container, "pointerover");
		const pointerout = getRegisteredCallback(container, "pointerout");
		expect(pointerover).toBeDefined();
		expect(pointerout).toBeDefined();
		pointerover?.();
		expect(container.alpha).toBe(0.8);

		// 外部要因（tween等）でalphaが変化
		container.alpha = 1.0;
		pointerout?.();

		// 外部変更後の値が維持される（ホバー前の値に巻き戻さない）
		expect(container.alpha).toBe(1.0);
	});

	it("初期alphaが1以外の場合もホバー解除時に元の値に戻る", () => {
		const container = createMockContainer();
		container.alpha = 0.5;

		makeInteractive(container, vi.fn());

		const pointerover = getRegisteredCallback(container, "pointerover");
		const pointerout = getRegisteredCallback(container, "pointerout");
		expect(pointerover).toBeDefined();
		expect(pointerout).toBeDefined();
		pointerover?.();
		// alphaBeforeHover(0.5) < HOVER_ALPHA(0.8) なのでalphaは増加しない
		expect(container.alpha).toBe(0.5);
		pointerout?.();

		expect(container.alpha).toBe(0.5);
	});
});
