/**
 * 画面シェイク・フラッシュ・点滅エフェクト関数
 */

import { type Container, Graphics, Ticker } from "pixi.js";
import { CELL_SIZE } from "../constants";
import { tween } from "../utils/tween";
import {
	FLASH_COLOR,
	FLASH_DURATION,
	PLAYER_BLINK_COUNT,
	PLAYER_BLINK_INTERVAL,
	SCREEN_SHAKE_DURATION,
} from "./mapAnimationConstants";

/** 画面シェイク強度の基本値 */
export const BASE_SHAKE_INTENSITY = 4;

/** 画面シェイク強度の最大値 */
const MAX_SHAKE_INTENSITY = 10;

/** 表示数値1あたりのシェイク強度増加量 */
const SHAKE_INTENSITY_PER_AMOUNT = 1.5;

/**
 * 表示数値（amount）に応じた画面シェイク強度を計算
 * 数値が大きいほどシェイクが強い（上限あり）
 */
export function calcScreenShakeIntensity(amount: number): number {
	const extra = Math.max(0, amount - 1) * SHAKE_INTENSITY_PER_AMOUNT;
	return Math.min(BASE_SHAKE_INTENSITY + extra, MAX_SHAKE_INTENSITY);
}

/**
 * 対象に白フラッシュエフェクトを適用
 * 白い矩形オーバーレイをフェードアウトさせる
 */
export async function animateFlash(target: Container): Promise<void> {
	const parent = target.parent;
	if (!parent) return;

	const overlay = new Graphics();
	overlay.rect(0, 0, CELL_SIZE, CELL_SIZE);
	overlay.fill(FLASH_COLOR);
	overlay.x = target.x;
	overlay.y = target.y;
	parent.addChild(overlay);

	await tween(overlay, { alpha: 0 }, { duration: FLASH_DURATION });

	parent.removeChild(overlay);
	overlay.destroy();
}

/**
 * 画面全体のシェイクエフェクト
 * コンテナのx,yをランダムにオフセットして振動させる
 * @param container シェイクさせるコンテナ
 * @param baseIntensity シェイク振幅（省略時はデフォルト値）
 */
export function animateScreenShake(
	container: Container,
	baseIntensity = BASE_SHAKE_INTENSITY,
): Promise<void> {
	return new Promise((resolve) => {
		const originX = container.x;
		const originY = container.y;
		let elapsed = 0;
		const ticker = Ticker.shared;

		const update = (tick: Ticker): void => {
			elapsed += tick.deltaMS;

			if (elapsed >= SCREEN_SHAKE_DURATION) {
				container.x = originX;
				container.y = originY;
				ticker.remove(update);
				resolve();
				return;
			}

			const decay = 1 - elapsed / SCREEN_SHAKE_DURATION;
			const intensity = baseIntensity * decay;
			container.x = originX + (Math.random() * 2 - 1) * intensity;
			container.y = originY + (Math.random() * 2 - 1) * intensity;
		};

		ticker.add(update);
	});
}

/**
 * プレイヤー被ダメージ時の点滅エフェクト
 * コンテナのalphaを複数回点滅させる
 * @param target 点滅させるコンテナ
 */
export async function animatePlayerBlink(target: Container): Promise<void> {
	for (let i = 0; i < PLAYER_BLINK_COUNT; i++) {
		await tween(
			target,
			{ alpha: 0.2 },
			{ duration: PLAYER_BLINK_INTERVAL / 2 },
		);
		await tween(target, { alpha: 1 }, { duration: PLAYER_BLINK_INTERVAL / 2 });
	}
	target.alpha = 1;
}
