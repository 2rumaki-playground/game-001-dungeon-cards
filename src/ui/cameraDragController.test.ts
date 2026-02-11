import { describe, expect, it, vi } from "vitest";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "../constants";
import { CameraDragController } from "./cameraDragController";

describe("CameraDragController", () => {
	describe("初期状態", () => {
		it("dragOffsetが(0,0)である", () => {
			const ctrl = new CameraDragController();
			expect(ctrl.getDragOffset()).toEqual({ x: 0, y: 0 });
		});

		it("isDragActiveがfalseである", () => {
			const ctrl = new CameraDragController();
			expect(ctrl.isDragActive()).toBe(false);
		});

		it("isCurrentlyDraggingがfalseである", () => {
			const ctrl = new CameraDragController();
			expect(ctrl.isCurrentlyDragging()).toBe(false);
		});
	});

	describe("ドラッグ操作", () => {
		it("閾値を超えるドラッグでオフセットが更新される", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			ctrl.handlePointerUp();
			expect(ctrl.getDragOffset()).toEqual({ x: 20, y: 30 });
			expect(ctrl.isDragActive()).toBe(true);
		});

		it("handlePointerUpがドラッグ時にtrueを返す", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			const wasDrag = ctrl.handlePointerUp();
			expect(wasDrag).toBe(true);
		});

		it("ドラッグ中はisCurrentlyDraggingがtrueになる", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			expect(ctrl.isCurrentlyDragging()).toBe(true);
		});
	});

	describe("閾値未満の操作（クリック判定）", () => {
		it("閾値未満の移動はドラッグ確定しない", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(102, 103);
			const wasDrag = ctrl.handlePointerUp();
			expect(wasDrag).toBe(false);
			expect(ctrl.getDragOffset()).toEqual({ x: 0, y: 0 });
		});

		it("移動なしのpointerupはクリック判定", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			const wasDrag = ctrl.handlePointerUp();
			expect(wasDrag).toBe(false);
		});
	});

	describe("canDrag制御", () => {
		it("canDragがfalseの場合はドラッグ開始しない", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => false);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(200, 200);
			expect(ctrl.isCurrentlyDragging()).toBe(false);
			const wasDrag = ctrl.handlePointerUp();
			expect(wasDrag).toBe(false);
		});

		it("canDragが未設定の場合もドラッグ開始しない", () => {
			const ctrl = new CameraDragController();
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(200, 200);
			expect(ctrl.isCurrentlyDragging()).toBe(false);
		});
	});

	describe("reset", () => {
		it("resetでオフセットがクリアされる", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(150, 150);
			ctrl.handlePointerUp();
			expect(ctrl.isDragActive()).toBe(true);
			ctrl.reset();
			expect(ctrl.getDragOffset()).toEqual({ x: 0, y: 0 });
			expect(ctrl.isDragActive()).toBe(false);
		});
	});

	describe("連続ドラッグ", () => {
		it("連続ドラッグでオフセットが蓄積される", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			// 1回目のドラッグ: +20, +30
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			ctrl.handlePointerUp();
			// 2回目のドラッグ: +10, +10
			ctrl.handlePointerDown(200, 200);
			ctrl.handlePointerMove(210, 210);
			ctrl.handlePointerUp();
			expect(ctrl.getDragOffset()).toEqual({ x: 30, y: 40 });
		});
	});

	describe("onDragStateChangeコールバック", () => {
		it("ドラッグ確定時にコールバックが呼ばれる", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			const callback = vi.fn();
			ctrl.setOnDragStateChange(callback);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130); // 閾値超過でドラッグ確定
			expect(callback).toHaveBeenCalledWith(true);
		});

		it("閾値未満ではコールバックが呼ばれない", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			const callback = vi.fn();
			ctrl.setOnDragStateChange(callback);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(102, 103);
			expect(callback).not.toHaveBeenCalled();
		});

		it("resetでfalse通知が発火する", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			const callback = vi.fn();
			ctrl.setOnDragStateChange(callback);
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			ctrl.handlePointerUp();
			callback.mockClear();
			ctrl.reset();
			expect(callback).toHaveBeenCalledWith(false);
		});

		it("offsetが0の状態でresetしてもfalse通知は発火しない", () => {
			const ctrl = new CameraDragController();
			const callback = vi.fn();
			ctrl.setOnDragStateChange(callback);
			ctrl.reset();
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe("ズーム機能", () => {
		describe("初期状態", () => {
			it("zoomLevelがZOOM_DEFAULTである", () => {
				const ctrl = new CameraDragController();
				expect(ctrl.getZoomLevel()).toBe(ZOOM_DEFAULT);
			});

			it("isZoomedがfalseである", () => {
				const ctrl = new CameraDragController();
				expect(ctrl.isZoomed()).toBe(false);
			});
		});

		describe("setZoomLevel", () => {
			it("ズームレベルを設定できる", () => {
				const ctrl = new CameraDragController();
				ctrl.setZoomLevel(1.5);
				expect(ctrl.getZoomLevel()).toBe(1.5);
				expect(ctrl.isZoomed()).toBe(true);
			});

			it("ZOOM_MAXを超えない", () => {
				const ctrl = new CameraDragController();
				ctrl.setZoomLevel(10.0);
				expect(ctrl.getZoomLevel()).toBe(ZOOM_MAX);
			});

			it("ZOOM_MINを下回らない", () => {
				const ctrl = new CameraDragController();
				ctrl.setZoomLevel(0.01);
				expect(ctrl.getZoomLevel()).toBe(ZOOM_MIN);
			});
		});

		describe("setDragOffset", () => {
			it("外部からdragOffsetを設定できる", () => {
				const ctrl = new CameraDragController();
				ctrl.setDragOffset({ x: 100, y: -50 });
				expect(ctrl.getDragOffset()).toEqual({ x: 100, y: -50 });
			});
		});

		describe("resetでズームもリセットされる", () => {
			it("ズーム後にresetするとデフォルトに戻る", () => {
				const ctrl = new CameraDragController();
				ctrl.setZoomLevel(1.5);
				expect(ctrl.isZoomed()).toBe(true);
				ctrl.reset();
				expect(ctrl.getZoomLevel()).toBe(ZOOM_DEFAULT);
				expect(ctrl.isZoomed()).toBe(false);
			});

			it("ズームのみの状態でresetするとfalse通知が発火する", () => {
				const ctrl = new CameraDragController();
				const callback = vi.fn();
				ctrl.setOnDragStateChange(callback);
				ctrl.setZoomLevel(1.5);
				ctrl.reset();
				expect(callback).toHaveBeenCalledWith(false);
			});
		});

		describe("isDragActive", () => {
			it("ズームのみでもtrueを返す", () => {
				const ctrl = new CameraDragController();
				ctrl.setZoomLevel(1.5);
				expect(ctrl.isDragActive()).toBe(true);
			});

			it("ズームとドラッグ両方でもtrueを返す", () => {
				const ctrl = new CameraDragController();
				ctrl.setCanDrag(() => true);
				ctrl.handlePointerDown(100, 100);
				ctrl.handlePointerMove(120, 130);
				ctrl.handlePointerUp();
				ctrl.setZoomLevel(1.5);
				expect(ctrl.isDragActive()).toBe(true);
			});
		});
	});

	describe("handlePointerUp早期return", () => {
		it("ドラッグ未開始のpointerupはfalseを返しoffsetを変更しない", () => {
			const ctrl = new CameraDragController();
			ctrl.setCanDrag(() => true);
			// ドラッグして蓄積
			ctrl.handlePointerDown(100, 100);
			ctrl.handlePointerMove(120, 130);
			ctrl.handlePointerUp();
			const offset = ctrl.getDragOffset();
			// pointerdown無しでpointerup
			const wasDrag = ctrl.handlePointerUp();
			expect(wasDrag).toBe(false);
			expect(ctrl.getDragOffset()).toEqual(offset);
		});
	});
});
