/**
 * デバッグチートパネルUI（DEV環境限定）
 * デバッグモードON時にビューポート左上に表示される4つのトグルボタン
 */

import { Container, Graphics, Text } from "pixi.js";
import type { DebugCheats } from "../game/debugCheats";
import { getDebugCheats, toggleDebugCheat } from "../game/debugCheats";
import { drawRoundedRect, makeInteractive } from "./graphicsHelpers";

/** パネル定数 */
const BUTTON_WIDTH = 120;
const BUTTON_HEIGHT = 24;
const BUTTON_GAP = 4;
const BUTTON_RADIUS = 4;

/** ON/OFF配色（debugModeToggle.tsと同じ） */
const COLORS_ON = { bg: 0x3a5a2a, border: 0x6a9a4a } as const;
const COLORS_OFF = { bg: 0x3a3a3a, border: 0x666666 } as const;

/** ボタン定義 */
const CHEAT_BUTTONS: { key: keyof DebugCheats; label: string }[] = [
	{ key: "invincible", label: "無敵" },
	{ key: "infiniteAp", label: "AP無限" },
	{ key: "fullMapVisible", label: "全マップ可視" },
	{ key: "skipEnemyTurn", label: "敵スキップ" },
];

/**
 * デバッグチートパネル
 */
export class DebugCheatPanel {
	private container: Container;
	private buttons: {
		key: keyof DebugCheats;
		bg: Graphics;
		label: Text;
		wrapper: Container;
	}[] = [];
	private onToggle: ((cheats: Readonly<DebugCheats>) => void) | null = null;

	constructor() {
		this.container = new Container();
		this.container.visible = false;
		this.buildButtons();
	}

	getContainer(): Container {
		return this.container;
	}

	setOnToggle(callback: (cheats: Readonly<DebugCheats>) => void): void {
		this.onToggle = callback;
	}

	render(): void {
		const cheats = getDebugCheats();
		for (const btn of this.buttons) {
			this.updateButtonVisual(btn, cheats[btn.key]);
		}
	}

	show(): void {
		this.container.visible = true;
	}

	hide(): void {
		this.container.visible = false;
	}

	private buildButtons(): void {
		for (let i = 0; i < CHEAT_BUTTONS.length; i++) {
			const def = CHEAT_BUTTONS[i];
			const wrapper = new Container();
			wrapper.y = i * (BUTTON_HEIGHT + BUTTON_GAP);

			const bg = new Graphics();
			wrapper.addChild(bg);

			const label = new Text({
				text: "",
				style: {
					fontSize: 11,
					fontFamily: "sans-serif",
					fill: 0xffffff,
					fontWeight: "bold",
				},
			});
			label.anchor.set(0.5, 0.5);
			label.x = BUTTON_WIDTH / 2;
			label.y = BUTTON_HEIGHT / 2;
			wrapper.addChild(label);

			const btn = { key: def.key, bg, label, wrapper };
			this.updateButtonVisual(btn, false);

			makeInteractive(wrapper, () => {
				toggleDebugCheat(def.key);
				this.render();
				this.onToggle?.(getDebugCheats());
			});

			this.container.addChild(wrapper);
			this.buttons.push(btn);
		}
	}

	private updateButtonVisual(
		btn: { key: keyof DebugCheats; bg: Graphics; label: Text },
		enabled: boolean,
	): void {
		const colors = enabled ? COLORS_ON : COLORS_OFF;
		const def = CHEAT_BUTTONS.find((d) => d.key === btn.key);
		const labelText = def ? def.label : btn.key;

		btn.bg.clear();
		drawRoundedRect(
			btn.bg,
			BUTTON_WIDTH,
			BUTTON_HEIGHT,
			BUTTON_RADIUS,
			colors.bg,
			{
				color: colors.border,
				width: 1,
			},
		);
		btn.label.text = `${labelText}: ${enabled ? "ON" : "OFF"}`;
	}
}
