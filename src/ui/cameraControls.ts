/**
 * カメラドラッグ・ピンチズーム制御
 * キャンバス上でのポインタ操作によるマップスクロールとズームを管理する
 */

import {
	STATUS_BAR_HEIGHT,
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_WHEEL_STEP,
} from "../constants";
import type { GameContext } from "../gameContext";
import type { Position } from "../types";
import {
	calculateCameraOffset,
	clampCameraOffset,
	getViewportPixelSize,
} from "./coordinates";
import { applyCameraOffset, renderGameScreen } from "./gameRenderer";
import { BUTTON_HEIGHT, RETURN_TO_PLAYER_BUTTON_WIDTH } from "./layout";

/**
 * カメラ制御のイベントリスナーを設定する
 * ドラッグ移動・ホイールズーム・ピンチズーム・「プレイヤーへ戻る」ボタンを含む
 */
export function setupCameraControls(ctx: GameContext): void {
	const cameraDrag = ctx.ui.cameraDragController;
	cameraDrag.setCanDrag(
		() =>
			ctx.state.screen === "game" &&
			ctx.state.turn === "player" &&
			!ctx.isAnimating &&
			!ctx.isCardActionAnimating,
	);

	const canvas = ctx.app.canvas;
	const viewportSize = getViewportPixelSize();

	// ピンチズーム（タッチデバイス対応）
	let pinchStartDistance = 0;
	let pinchStartZoom = 1.0;
	const activeTouches = new Map<number, { x: number; y: number }>();
	let capturedPointerId: number | null = null;
	let cachedRect: DOMRect | null = null;

	canvas.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		// ピンチ中はドラッグを無効化
		if (activeTouches.size >= 2) return;

		// マップ表示領域（ビューポート）内でのみカメラドラッグを開始する
		const x = e.offsetX;
		const y = e.offsetY;
		if (
			x < 0 ||
			x > viewportSize.width ||
			y < STATUS_BAR_HEIGHT ||
			y > STATUS_BAR_HEIGHT + viewportSize.height
		) {
			return;
		}

		// ReturnToPlayerButton の矩形上ではドラッグを開始しない
		const btnContainer = ctx.ui.returnToPlayerButton.getContainer();
		if (
			btnContainer.visible &&
			x >= btnContainer.x &&
			x <= btnContainer.x + RETURN_TO_PLAYER_BUTTON_WIDTH &&
			y >= btnContainer.y &&
			y <= btnContainer.y + BUTTON_HEIGHT
		) {
			return;
		}

		const started = cameraDrag.handlePointerDown(x, y);
		if (started) {
			// canvas外でpointerupしてもイベントを受け取れるようにする
			canvas.setPointerCapture(e.pointerId);
			capturedPointerId = e.pointerId;
		}
	});

	canvas.addEventListener("pointermove", (e) => {
		// ピンチ中はドラッグを無効化
		if (activeTouches.size >= 2) return;
		cameraDrag.handlePointerMove(e.offsetX, e.offsetY);
		if (cameraDrag.isCurrentlyDragging()) {
			applyCameraOffset(ctx);
		}
	});

	canvas.addEventListener("pointerup", (e) => {
		cameraDrag.handlePointerUp();
		capturedPointerId = null;
		if (canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
	});

	canvas.addEventListener("pointerleave", () => {
		cameraDrag.handlePointerUp();
		if (
			capturedPointerId !== null &&
			canvas.hasPointerCapture(capturedPointerId)
		) {
			canvas.releasePointerCapture(capturedPointerId);
		}
		capturedPointerId = null;
	});

	canvas.addEventListener("pointercancel", () => {
		cameraDrag.handlePointerUp();
		if (
			capturedPointerId !== null &&
			canvas.hasPointerCapture(capturedPointerId)
		) {
			canvas.releasePointerCapture(capturedPointerId);
		}
		capturedPointerId = null;
	});

	/** pivot基点でズームを適用し、dragOffsetを更新する */
	const applyZoomAtPoint = (
		pivot: Position,
		newZoom: number,
		oldZoom: number,
	) => {
		const mapWidth = ctx.state.map[0]?.length ?? 0;
		const mapHeight = ctx.state.map.length;
		const oldBase = calculateCameraOffset(
			ctx.state.player.position,
			mapWidth,
			mapHeight,
			oldZoom,
		);
		const oldDrag = cameraDrag.getDragOffset();
		const posBefore = clampCameraOffset(
			oldBase,
			oldDrag,
			mapWidth,
			mapHeight,
			oldZoom,
		);

		cameraDrag.setZoomLevel(newZoom);

		const ratio = newZoom / oldZoom;
		const desiredTotal = {
			x: pivot.x - (pivot.x - posBefore.x) * ratio,
			y: pivot.y - (pivot.y - posBefore.y) * ratio,
		};
		const newBase = calculateCameraOffset(
			ctx.state.player.position,
			mapWidth,
			mapHeight,
			newZoom,
		);
		cameraDrag.setDragOffset({
			x: desiredTotal.x - newBase.x,
			y: desiredTotal.y - newBase.y,
		});

		applyCameraOffset(ctx);
	};

	// マウスホイールによるカメラズーム
	canvas.addEventListener(
		"wheel",
		(e) => {
			if (!cameraDrag.canInteract()) return;

			const x = e.offsetX;
			const y = e.offsetY;
			if (
				x < 0 ||
				x > viewportSize.width ||
				y < STATUS_BAR_HEIGHT ||
				y > STATUS_BAR_HEIGHT + viewportSize.height
			) {
				return;
			}

			if (e.deltaY === 0) return;

			const oldZoom = cameraDrag.getZoomLevel();
			const direction = e.deltaY > 0 ? -1 : 1;
			const newZoom = Math.max(
				ZOOM_MIN,
				Math.min(ZOOM_MAX, oldZoom + direction * ZOOM_WHEEL_STEP),
			);
			if (newZoom === oldZoom) return;

			e.preventDefault();

			applyZoomAtPoint({ x, y: y - STATUS_BAR_HEIGHT }, newZoom, oldZoom);
		},
		{ passive: false },
	);

	canvas.addEventListener(
		"touchstart",
		(e) => {
			cachedRect = canvas.getBoundingClientRect();
			const rect = cachedRect;
			for (const touch of e.changedTouches) {
				activeTouches.set(touch.identifier, {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				});
			}
			if (activeTouches.size === 2 && cameraDrag.canInteract()) {
				e.preventDefault();
				// ドラッグ中だった場合はピンチに切り替えるため解除
				cameraDrag.handlePointerUp();
				if (
					capturedPointerId !== null &&
					canvas.hasPointerCapture(capturedPointerId)
				) {
					canvas.releasePointerCapture(capturedPointerId);
				}
				capturedPointerId = null;
				const touches = [...activeTouches.values()];
				pinchStartDistance = Math.hypot(
					touches[1].x - touches[0].x,
					touches[1].y - touches[0].y,
				);
				pinchStartZoom = cameraDrag.getZoomLevel();
			}
		},
		{ passive: false },
	);

	canvas.addEventListener(
		"touchmove",
		(e) => {
			const rect = cachedRect ?? canvas.getBoundingClientRect();
			for (const touch of e.changedTouches) {
				activeTouches.set(touch.identifier, {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				});
			}
			if (
				activeTouches.size === 2 &&
				pinchStartDistance > 0 &&
				cameraDrag.canInteract()
			) {
				e.preventDefault();
				const touches = [...activeTouches.values()];
				const currentDistance = Math.hypot(
					touches[1].x - touches[0].x,
					touches[1].y - touches[0].y,
				);
				const targetZoom = Math.max(
					ZOOM_MIN,
					Math.min(
						ZOOM_MAX,
						pinchStartZoom * (currentDistance / pinchStartDistance),
					),
				);
				const oldZoom = cameraDrag.getZoomLevel();
				if (targetZoom === oldZoom) return;

				const centerX = (touches[0].x + touches[1].x) / 2;
				const centerY = (touches[0].y + touches[1].y) / 2 - STATUS_BAR_HEIGHT;

				if (
					centerX >= 0 &&
					centerX <= viewportSize.width &&
					centerY >= 0 &&
					centerY <= viewportSize.height
				) {
					applyZoomAtPoint({ x: centerX, y: centerY }, targetZoom, oldZoom);
				}
			}
		},
		{ passive: false },
	);

	canvas.addEventListener("touchend", (e) => {
		for (const touch of e.changedTouches) {
			activeTouches.delete(touch.identifier);
		}
		if (activeTouches.size === 2 && cameraDrag.canInteract()) {
			// 3本指以上→2本指に戻った場合、ピンチ開始状態を再初期化
			const touches = [...activeTouches.values()];
			pinchStartDistance = Math.hypot(
				touches[1].x - touches[0].x,
				touches[1].y - touches[0].y,
			);
			pinchStartZoom = cameraDrag.getZoomLevel();
		} else if (activeTouches.size < 2) {
			pinchStartDistance = 0;
			cachedRect = null;
		}
	});

	canvas.addEventListener("touchcancel", (e) => {
		for (const touch of e.changedTouches) {
			activeTouches.delete(touch.identifier);
		}
		if (activeTouches.size === 2 && cameraDrag.canInteract()) {
			// 3本指以上→2本指に戻った場合、ピンチ開始状態を再初期化
			const touches = [...activeTouches.values()];
			pinchStartDistance = Math.hypot(
				touches[1].x - touches[0].x,
				touches[1].y - touches[0].y,
			);
			pinchStartZoom = cameraDrag.getZoomLevel();
		} else if (activeTouches.size < 2) {
			pinchStartDistance = 0;
			cachedRect = null;
		}
	});

	// 「プレイヤーへ戻る」ボタンのコールバック設定
	ctx.ui.returnToPlayerButton.setOnClick(() => {
		if (ctx.state.screen !== "game") return;
		cameraDrag.reset();
		renderGameScreen(ctx);
	});
}
