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
		on: vi.fn(),
	} as unknown as Container & {
		eventMode: string;
		cursor: string;
		on: ReturnType<typeof vi.fn>;
	};
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
		const registeredCallback = container.on.mock.calls[0][1] as (
			e: FederatedPointerEvent,
		) => void;
		registeredCallback(mockEvent);

		expect(onClick).not.toHaveBeenCalled();
	});
});
