import { describe, expect, it } from "vitest";
import { createTickerMock } from "./mockPixi";

describe("createTickerMock", () => {
	it("add()でコールバックが登録される", () => {
		const mock = createTickerMock();
		const fn = () => {};
		mock.shared.add(fn);
		expect(mock.callbacks).toHaveLength(1);
		expect(mock.shared.add).toHaveBeenCalledWith(fn);
	});

	it("remove()でコールバックが解除される", () => {
		const mock = createTickerMock();
		const fn = () => {};
		mock.shared.add(fn);
		mock.shared.remove(fn);
		expect(mock.callbacks).toHaveLength(0);
		expect(mock.shared.remove).toHaveBeenCalledWith(fn);
	});

	it("remove()で未登録のコールバックを渡してもエラーにならない", () => {
		const mock = createTickerMock();
		mock.shared.remove(() => {});
		expect(mock.callbacks).toHaveLength(0);
	});

	it("tick()で登録済みコールバックにdeltaMSが渡される", () => {
		const mock = createTickerMock();
		let received = -1;
		mock.shared.add((tick) => {
			received = tick.deltaMS;
		});
		mock.tick(16);
		expect(received).toBe(16);
	});

	it("tick()中にremoveされたコールバックは安全にスキップされる", () => {
		const mock = createTickerMock();
		let callCount = 0;
		const fn = () => {
			callCount++;
			mock.shared.remove(fn);
		};
		mock.shared.add(fn);
		mock.tick(16);
		expect(callCount).toBe(1);
		expect(mock.callbacks).toHaveLength(0);
	});

	it("reset()でコールバックとスパイがクリアされる", () => {
		const mock = createTickerMock();
		mock.shared.add(() => {});
		mock.shared.remove(() => {});
		expect(mock.callbacks).toHaveLength(1);

		mock.reset();
		expect(mock.callbacks).toHaveLength(0);
		expect(mock.shared.add).not.toHaveBeenCalled();
		expect(mock.shared.remove).not.toHaveBeenCalled();
	});
});
