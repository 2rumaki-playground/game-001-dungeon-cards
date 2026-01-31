/**
 * ステータスバーUI
 * プレイヤーHP、AP、階層番号を表示
 */

import { Container, Text } from "pixi.js";
import { STATUS_BAR_HEIGHT } from "../constants";
import type { Player } from "../types";

/** テキスト配置のX座標 */
const HP_TEXT_X = 16;
const AP_TEXT_X = 160;
const FLOOR_TEXT_X = 304;

/**
 * ステータスバーレンダラー
 */
export class StatusBar {
	private container: Container;
	private hpText: Text;
	private apText: Text;
	private floorText: Text;

	constructor() {
		this.container = new Container();

		const textStyle = {
			fontSize: 16,
			fontFamily: "sans-serif",
			fill: 0xffffff,
		};

		this.hpText = new Text({ text: "", style: textStyle });
		this.hpText.x = HP_TEXT_X;
		this.hpText.y = STATUS_BAR_HEIGHT / 2;
		this.hpText.anchor.set(0, 0.5);
		this.container.addChild(this.hpText);

		this.apText = new Text({ text: "", style: textStyle });
		this.apText.x = AP_TEXT_X;
		this.apText.y = STATUS_BAR_HEIGHT / 2;
		this.apText.anchor.set(0, 0.5);
		this.container.addChild(this.apText);

		this.floorText = new Text({ text: "", style: textStyle });
		this.floorText.x = FLOOR_TEXT_X;
		this.floorText.y = STATUS_BAR_HEIGHT / 2;
		this.floorText.anchor.set(0, 0.5);
		this.container.addChild(this.floorText);
	}

	/**
	 * ルートコンテナを取得
	 */
	getContainer(): Container {
		return this.container;
	}

	/**
	 * ステータスバーを描画
	 */
	render(player: Player, floor: number): void {
		this.hpText.text = `HP: ${player.hp}/${player.maxHp}`;
		this.apText.text = `AP: ${player.ap}/${player.maxAp}`;
		this.floorText.text = `階層: ${floor}`;
	}

	/**
	 * クリア
	 */
	clear(): void {
		this.hpText.text = "";
		this.apText.text = "";
		this.floorText.text = "";
	}

	/**
	 * 表示
	 */
	show(): void {
		this.container.visible = true;
	}

	/**
	 * 非表示
	 */
	hide(): void {
		this.container.visible = false;
	}
}
