/**
 * デバッグモードON/OFFトグルUI（DEV環境限定）
 * 動的importで読み込まれるため、プロダクションビルドに含まれない
 */

import { Container, Graphics, Text } from "pixi.js";
import { makeInteractive } from "./graphicsHelpers";

/** トグルUI定数 */
const TOGGLE_WIDTH = 220;
const TOGGLE_HEIGHT = 28;

/**
 * デバッグモードトグルUIを生成
 */
export function createDebugModeToggle(
	centerX: number,
	y: number,
	initialValue: boolean,
	onChange: (enabled: boolean) => void,
): Container {
	let enabled = initialValue;

	const wrapper = new Container();
	wrapper.x = centerX;
	wrapper.y = y;

	const bg = new Graphics();
	const label = new Text({
		text: getLabel(enabled),
		style: {
			fontSize: 14,
			fontFamily: "sans-serif",
			fill: 0xffcc00,
			fontWeight: "bold",
		},
	});
	label.anchor.set(0.5, 0.5);
	label.x = 0;
	label.y = TOGGLE_HEIGHT / 2;

	function updateVisual(): void {
		bg.clear();
		bg.roundRect(-TOGGLE_WIDTH / 2, 0, TOGGLE_WIDTH, TOGGLE_HEIGHT, 4);
		bg.fill(enabled ? 0x3a5a2a : 0x3a3a3a);
		bg.roundRect(-TOGGLE_WIDTH / 2, 0, TOGGLE_WIDTH, TOGGLE_HEIGHT, 4);
		bg.stroke({ color: enabled ? 0x6a9a4a : 0x666666, width: 1 });
		label.text = getLabel(enabled);
	}

	wrapper.addChild(bg);
	wrapper.addChild(label);
	updateVisual();

	makeInteractive(wrapper, () => {
		enabled = !enabled;
		updateVisual();
		onChange(enabled);
	});

	return wrapper;
}

function getLabel(enabled: boolean): string {
	return enabled ? "[DEV] デバッグモード ON" : "[DEV] デバッグモード OFF";
}
