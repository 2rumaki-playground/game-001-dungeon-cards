import { vi } from "vitest";

type TickerCallback = (tick: { deltaMS: number }) => void;

/**
 * Ticker.sharedのモックファクトリ
 * add/removeがvi.fn()スパイなので、呼び出し検証にも対応。
 * tick()で手動時間進行、reset()でbeforeEachクリーンアップ。
 */
export function createTickerMock() {
	const callbacks: TickerCallback[] = [];

	const add = vi.fn((fn: TickerCallback) => {
		callbacks.push(fn);
	});

	const remove = vi.fn((fn: TickerCallback) => {
		const idx = callbacks.indexOf(fn);
		if (idx !== -1) callbacks.splice(idx, 1);
	});

	return {
		/** vi.mock内で `Ticker: { shared: tickerMock.shared }` として使用 */
		shared: { add, remove },
		/** 登録済みコールバックに指定deltaMSを送る */
		tick: (deltaMS: number) => {
			for (const cb of [...callbacks]) {
				cb({ deltaMS });
			}
		},
		/** コールバック配列への直接参照（lengthチェック等に使用） */
		callbacks,
		/** スパイとコールバック配列をリセット */
		reset: () => {
			callbacks.length = 0;
			add.mockClear();
			remove.mockClear();
		},
	};
}
