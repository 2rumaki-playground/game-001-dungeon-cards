/**
 * マップ描画関連の定数・純粋ヘルパー関数
 */

import type { Graphics } from "pixi.js";
import { CELL_SIZE } from "../constants";
import type { EnemyType } from "../types/character";
import type { ComboType } from "../types/combo";

/** プレイヤー移動アニメーションの時間（ms） */
export const PLAYER_MOVE_DURATION = 150;

/** 壁バンプアニメーションの移動距離（px） */
export const BUMP_DISTANCE = 12;

/** 壁バンプアニメーションの往路時間（ms） */
export const BUMP_FORWARD_DURATION = 60;

/** 壁バンプアニメーションの復路時間（ms） */
export const BUMP_BACK_DURATION = 80;

/** 敵移動アニメーションの時間（ms） */
export const ENEMY_MOVE_DURATION = 150;

/** 敵移動アニメーションのスタッガー遅延（ms） */
export const ENEMY_MOVE_STAGGER_DELAY = 50;

/** 白フラッシュのフェードアウト時間（ms） */
export const FLASH_DURATION = 200;

/** 白フラッシュの色 */
export const FLASH_COLOR = 0xffffff;

/** 画面シェイクの時間（ms） */
export const SCREEN_SHAKE_DURATION = 200;

/** プレイヤー被ダメージ時の点滅回数 */
export const PLAYER_BLINK_COUNT = 3;

/** プレイヤー被ダメージ時の1回の点滅時間（ms） */
export const PLAYER_BLINK_INTERVAL = 80;

/** ダメージポップアップの上昇距離（px） */
export const DAMAGE_POPUP_RISE = 28;

/** ダメージポップアップのアニメーション時間（ms） */
export const DAMAGE_POPUP_DURATION = 600;

/** ダメージポップアップのアウトライン幅 */
export const DAMAGE_POPUP_STROKE_WIDTH = 3;

/** ダメージポップアップのアウトライン色 */
export const DAMAGE_POPUP_STROKE_COLOR = 0x000000;

/** ポップアップ種別 */
export type PopupType = "damage" | "heal" | "trap_damage";

/** ポップアップ種別ごとの色 */
export const POPUP_COLORS: Record<PopupType, number> = {
	damage: 0xff4444,
	heal: 0x44cc66,
	trap_damage: 0xff8844,
};

/** ミスポップアップの色（グレー） */
export const MISS_POPUP_COLOR = 0xaaaaaa;

/** ミスポップアップのフォントサイズ */
export const MISS_POPUP_FONT_SIZE = 18;

/** ミスポップアップの上昇距離（px） */
export const MISS_POPUP_RISE = 20;

/** ミスポップアップのアニメーション時間（ms） */
export const MISS_POPUP_DURATION = 500;

/** 敵撃破アニメーションの時間（ms） */
export const DEFEAT_DURATION = 400;

/** 敵撃破アニメーションの回転量（180度） */
export const DEFEAT_ROTATION = Math.PI;

/** 敵タイプ別パディング（セルサイズからの余白） */
export const ENEMY_PADDING: Record<EnemyType, number> = {
	normal: 12, // 標準サイズ
	heavy: 8, // 大きめ（パディング小）
	scout: 16, // 小さめ（パディング大）
	miniboss: 6, // heavyより大きい
	boss: 4, // 最大サイズ
};

/** HPゲージ明部の色（床タイル 0x3a3a3a より明るいグレー） */
export const HP_GAUGE_BRIGHT_COLOR = 0x5a5a5a;

/** コンボポップアップのフォントサイズ */
export const COMBO_POPUP_FONT_SIZE = 20;

/** コンボポップアップの上昇距離（px） */
export const COMBO_POPUP_RISE = 32;

/** コンボポップアップのアニメーション時間（ms） */
export const COMBO_POPUP_DURATION = 700;

/** コンボポップアップのアウトライン幅 */
export const COMBO_POPUP_STROKE_WIDTH = 3;

/** コンボポップアップのアウトライン色 */
export const COMBO_POPUP_STROKE_COLOR = 0x000000;

/** コンボ種別ごとの表示テキスト */
export const COMBO_POPUP_TEXT: Record<ComboType, string> = {
	charge: "突撃!",
	chain: "連撃!",
};

/** コンボ種別ごとの色 */
export const COMBO_POPUP_COLORS: Record<ComboType, number> = {
	charge: 0xffd700,
	chain: 0x00ddff,
};

/** 残骸パーティクルの色 */
const REMNANT_COLOR = 0x999999;

/** 残骸パーティクルの透明度 */
const REMNANT_ALPHA = 0.4;

/** 残骸パーティクルの最小半径 */
const REMNANT_MIN_RADIUS = 2;

/** 残骸パーティクルの最大半径 */
const REMNANT_MAX_RADIUS = 4;

/**
 * 決定的な疑似乱数を生成（座標ベース）
 */
function seededRandom(seed: number): number {
	const x = Math.sin(seed * 9301 + 49297) * 233280;
	return x - Math.floor(x);
}

/**
 * 残骸オーバーレイを描画
 * 撃破数に応じてパーティクル風のドットを散らして描画
 */
export function drawRemnantOverlay(
	g: Graphics,
	px: number,
	py: number,
	count: number,
): void {
	// 撃破数に応じたパーティクル数: 1→2, 2→4, 3+→6（上限）
	const particleCount = Math.min(count * 2, 6);
	const margin = 8;
	const areaSize = CELL_SIZE - margin * 2;

	for (let i = 0; i < particleCount; i++) {
		const seed = px * 1000 + py * 100 + i;
		const rx = seededRandom(seed);
		const ry = seededRandom(seed + 1);
		const rr = seededRandom(seed + 2);

		const cx = px + margin + rx * areaSize;
		const cy = py + margin + ry * areaSize;
		const radius =
			REMNANT_MIN_RADIUS + rr * (REMNANT_MAX_RADIUS - REMNANT_MIN_RADIUS);

		g.circle(cx, cy, radius);
		g.fill({ color: REMNANT_COLOR, alpha: REMNANT_ALPHA });
	}
}
