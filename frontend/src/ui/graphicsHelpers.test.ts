import type { Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";

function createMockGraphics() {
	const calls: { method: string; args: unknown[] }[] = [];
	return {
		_calls: calls,
		roundRect: vi.fn((...args: unknown[]) => {
			calls.push({ method: "roundRect", args });
		}),
		fill: vi.fn((...args: unknown[]) => {
			calls.push({ method: "fill", args });
		}),
		stroke: vi.fn((...args: unknown[]) => {
			calls.push({ method: "stroke", args });
		}),
	} as unknown as Graphics & { _calls: { method: string; args: unknown[] }[] };
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

		expect(container.on).toHaveBeenCalledWith("pointerdown", onClick);
	});

	it("コールバックにFederatedPointerEventが渡される", () => {
		const container = createMockContainer();
		const onClick = vi.fn();

		makeInteractive(container, onClick);

		const mockEvent = {
			stopPropagation: vi.fn(),
		} as unknown as FederatedPointerEvent;
		const registeredCallback = container.on.mock.calls[0][1] as (
			e: FederatedPointerEvent,
		) => void;
		registeredCallback(mockEvent);

		expect(onClick).toHaveBeenCalledWith(mockEvent);
	});
});
