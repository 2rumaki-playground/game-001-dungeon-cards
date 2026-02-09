/**
 * デバッグ用階層指定開始UI（DEV環境限定）
 * 動的importで読み込まれるため、プロダクションビルドに含まれない
 */

import { Container, Graphics, Text } from "pixi.js";
import { CLEAR_FLOOR, INITIAL_FLOOR } from "../constants";
import { makeInteractive } from "./graphicsHelpers";

/** スピナー定数 */
const SPINNER_WIDTH = 48;
const SPINNER_HEIGHT = 28;

/** デバッグ用階層上限（クリア階層＋余裕分） */
const DEBUG_MAX_FLOOR = CLEAR_FLOOR + 10;

/**
 * スピナーボタン（▲ / ▼）を生成
 */
function createSpinnerButton(
	label: string,
	x: number,
	y: number,
	onClick: () => void,
): Container {
	const btn = new Container();
	btn.x = x;
	btn.y = y;

	const bg = new Graphics();
	bg.roundRect(0, 0, SPINNER_WIDTH, SPINNER_HEIGHT, 4);
	bg.fill(0x3a3a3a);
	bg.roundRect(0, 0, SPINNER_WIDTH, SPINNER_HEIGHT, 4);
	bg.stroke({ color: 0x666666, width: 1 });
	btn.addChild(bg);

	const text = new Text({
		text: label,
		style: {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		},
	});
	text.anchor.set(0.5);
	text.x = SPINNER_WIDTH / 2;
	text.y = SPINNER_HEIGHT / 2;
	btn.addChild(text);

	makeInteractive(btn, onClick);
	return btn;
}

/**
 * 開始ボタンを生成
 */
function createStartButton(
	x: number,
	y: number,
	onClick: () => void,
): Container {
	const btn = new Container();
	btn.x = x;
	btn.y = y;

	const width = 80;
	const height = 28;
	const bg = new Graphics();
	bg.roundRect(0, 0, width, height, 4);
	bg.fill(0x2a5a8c);
	bg.roundRect(0, 0, width, height, 4);
	bg.stroke({ color: 0x4a8cca, width: 1 });
	btn.addChild(bg);

	const text = new Text({
		text: "開始",
		style: {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	text.anchor.set(0.5);
	text.x = width / 2;
	text.y = height / 2;
	btn.addChild(text);

	makeInteractive(btn, onClick);
	return btn;
}

/**
 * デバッグ用階層指定UIを生成
 */
export function createDebugFloorUI(
	centerX: number,
	y: number,
	onStart: (floor: number) => void,
): Container {
	let debugFloor = INITIAL_FLOOR;

	const wrapper = new Container();
	wrapper.x = centerX;
	wrapper.y = y;

	// ラベル
	const label = new Text({
		text: "[DEV] 階層指定開始",
		style: {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffcc00,
			fontWeight: "bold",
		},
	});
	label.anchor.set(0.5, 0);
	wrapper.addChild(label);

	// スピナー行: [▼] [数値] [▲] [開始ボタン]
	const spinnerY = label.height + 8;
	const textWidth = 40; // 階層テキスト用の固定幅領域
	const gap = 4;
	// 全体幅: ▼ボタン + gap + テキスト領域 + gap + ▲ボタン + gap*3 + 開始ボタン(80)
	const totalWidth =
		SPINNER_WIDTH + gap + textWidth + gap + SPINNER_WIDTH + gap * 3 + 80;
	const startX = -totalWidth / 2;

	// ▼ ボタン
	const decBtn = createSpinnerButton("▼", startX, spinnerY, () => {
		if (debugFloor > INITIAL_FLOOR) {
			debugFloor--;
			floorText.text = `${debugFloor}F`;
		}
	});
	wrapper.addChild(decBtn);

	// 階層テキスト
	const floorText = new Text({
		text: `${debugFloor}F`,
		style: {
			fontSize: 18,
			fontFamily: "sans-serif",
			fill: 0xffffff,
			fontWeight: "bold",
		},
	});
	floorText.anchor.set(0.5, 0);
	floorText.x = startX + SPINNER_WIDTH + gap + textWidth / 2;
	floorText.y = spinnerY + (SPINNER_HEIGHT - 18) / 2;
	wrapper.addChild(floorText);

	// ▲ ボタン
	const incBtn = createSpinnerButton(
		"▲",
		startX + SPINNER_WIDTH + gap + textWidth + gap,
		spinnerY,
		() => {
			if (debugFloor < DEBUG_MAX_FLOOR) {
				debugFloor++;
				floorText.text = `${debugFloor}F`;
			}
		},
	);
	wrapper.addChild(incBtn);

	// 開始ボタン
	const startBtn = createStartButton(
		startX + SPINNER_WIDTH + gap + textWidth + gap + SPINNER_WIDTH + gap * 3,
		spinnerY,
		() => onStart(debugFloor),
	);
	wrapper.addChild(startBtn);

	return wrapper;
}
