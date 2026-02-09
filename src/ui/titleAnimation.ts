/**
 * タイトル画面アニメーション設定
 * イントロアニメーションのタイミングや背景パーティクルの設定を管理
 */

import type { ParticleConfig } from "./particleLogic";

/** イントロアニメーションのタイミング定数（ms） */
export const INTRO_TIMING = {
	/** タイトルテキストのフェードイン開始までの遅延 */
	titleDelay: 200,
	/** タイトルテキストのフェードイン時間 */
	titleDuration: 600,
	/** ボタンのフェードイン開始までの遅延（タイトル開始からの相対値） */
	buttonDelay: 600,
	/** ボタンのフェードイン時間 */
	buttonDuration: 400,
	/** ボタン間のスタガー（ずれ） */
	buttonStagger: 150,
} as const;

/** 背景パーティクル発射間隔（ms） */
export const BG_PARTICLE_INTERVAL = 2000;

/** ホバー演出の定数 */
export const HOVER_EFFECT = {
	/** ホバー時のスケール倍率 */
	scale: 1.08,
	/** ホバーアニメーション時間（ms） */
	duration: 150,
} as const;

/** 背景パーティクルの色（ダンジョン雰囲気） */
const BG_PARTICLE_COLORS = [0x4a8cca, 0x3a6a9a, 0x2a4a6a, 0x5a9cda];

/**
 * 背景パーティクル設定を生成
 * @param screenWidth 画面幅
 * @param screenHeight 画面高さ
 * @param originY パーティクル発生Y座標（省略時は画面中央）
 */
export function createBgParticleConfig(
	screenWidth: number,
	screenHeight: number,
	originY?: number,
): ParticleConfig {
	return {
		count: 8,
		origin: { x: screenWidth / 2, y: originY ?? screenHeight / 2 },
		color: BG_PARTICLE_COLORS,
		speed: { min: 0.005, max: 0.02 },
		life: { min: 3000, max: 6000 },
		size: { min: 1, max: 3 },
		pattern: { type: "random" },
	};
}

/**
 * ボタンのフェードイン遅延を計算
 * @param index ボタンインデックス（0始まり）
 */
export function getButtonDelay(index: number): number {
	return INTRO_TIMING.buttonDelay + INTRO_TIMING.buttonStagger * index;
}
