/**
 * 階層遷移バナー
 * 暗転画面上に「階層 N」を表示するコンポーネント
 */

import { Container, Text } from "pixi.js";
import { Easing, tween } from "../utils/tween";

/** テキストのフォントサイズ */
const FLOOR_TEXT_FONT_SIZE = 36;

/** テキストの色（白） */
const FLOOR_TEXT_COLOR = 0xffffff;

/** 表示フェードインの時間（ms） */
const SHOW_DURATION = 200;

/** 表示保持時間（ms） */
const HOLD_DURATION = 600;

/** 非表示フェードアウトの時間（ms） */
const HIDE_DURATION = 300;

export class FloorBanner {
	private container: Container;
	private text: Text;
	private screenWidth: number;
	private screenHeight: number;

	constructor(screenWidth: number, screenHeight: number) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;

		this.container = new Container();
		this.container.visible = false;

		this.text = new Text({
			text: "",
			style: {
				fontSize: FLOOR_TEXT_FONT_SIZE,
				fontWeight: "bold",
				fill: FLOOR_TEXT_COLOR,
			},
		});
		this.text.anchor.set(0.5, 0.5);
		this.container.addChild(this.text);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * 画面サイズ変更に対応
	 */
	resize(screenWidth: number, screenHeight: number): void {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
	}

	/**
	 * 階層バナーを表示
	 * テキスト設定 → フェードイン → 保持時間待機
	 */
	async show(floor: number): Promise<void> {
		this.text.text = `階層 ${floor}`;
		this.text.x = this.screenWidth / 2;
		this.text.y = this.screenHeight / 2;
		this.text.alpha = 0;
		this.container.visible = true;

		await tween(
			this.text,
			{ alpha: 1 },
			{ duration: SHOW_DURATION, easing: Easing.easeOut },
		);

		await new Promise((resolve) => setTimeout(resolve, HOLD_DURATION));
	}

	/**
	 * 階層バナーを非表示
	 * フェードアウト → visible=false
	 */
	async hide(): Promise<void> {
		await tween(
			this.text,
			{ alpha: 0 },
			{ duration: HIDE_DURATION, easing: Easing.easeOut },
		);
		this.container.visible = false;
	}
}
