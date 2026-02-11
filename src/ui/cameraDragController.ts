/**
 * カメラドラッグ制御
 * 自ターン中にマップをドラッグして見渡す機能を提供
 */

import type { Position } from "../types";

/** ドラッグ確定閾値（ピクセル） */
const DRAG_THRESHOLD = 5;

export class CameraDragController {
	private dragOffset: Position = { x: 0, y: 0 };
	private isDragging = false;
	private dragStartPos: Position = { x: 0, y: 0 };
	private dragStartOffset: Position = { x: 0, y: 0 };
	private dragConfirmed = false;
	private canDrag: (() => boolean) | null = null;
	private onDragStateChange: ((active: boolean) => void) | null = null;

	getDragOffset(): Position {
		return this.dragOffset;
	}

	isDragActive(): boolean {
		return this.dragOffset.x !== 0 || this.dragOffset.y !== 0;
	}

	isCurrentlyDragging(): boolean {
		return this.isDragging && this.dragConfirmed;
	}

	reset(): void {
		this.dragOffset = { x: 0, y: 0 };
		this.isDragging = false;
		this.dragConfirmed = false;
	}

	setCanDrag(fn: () => boolean): void {
		this.canDrag = fn;
	}

	setOnDragStateChange(fn: (active: boolean) => void): void {
		this.onDragStateChange = fn;
	}

	handlePointerDown(x: number, y: number): void {
		if (!this.canDrag?.()) return;
		this.isDragging = true;
		this.dragConfirmed = false;
		this.dragStartPos = { x, y };
		this.dragStartOffset = { ...this.dragOffset };
	}

	handlePointerMove(x: number, y: number): void {
		if (!this.isDragging) return;
		const dx = x - this.dragStartPos.x;
		const dy = y - this.dragStartPos.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (!this.dragConfirmed && distance >= DRAG_THRESHOLD) {
			this.dragConfirmed = true;
			this.onDragStateChange?.(true);
		}

		if (this.dragConfirmed) {
			this.dragOffset = {
				x: this.dragStartOffset.x + dx,
				y: this.dragStartOffset.y + dy,
			};
		}
	}

	handlePointerUp(): boolean {
		const wasDrag = this.isDragging && this.dragConfirmed;
		this.isDragging = false;
		if (!wasDrag) {
			// クリック判定: ドラッグ中の一時オフセットを元に戻す
			this.dragOffset = { ...this.dragStartOffset };
		}
		return wasDrag;
	}
}
