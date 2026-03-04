/**
 * 戦闘パーティクル設定
 * カードタイプ別のパーティクルエフェクト設定を生成する純粋関数群
 */

import type { CardType } from "../types";
import type { ParticleConfig, Vec2 } from "./particleLogic";

/** 魔法攻撃ヒット時に使用可能なカードタイプ */
export type MagicCardType = Extract<CardType, "fire" | "thunder">;

/**
 * ファイアボルト用パーティクル設定を生成
 * オレンジ系の火花エフェクト
 */
export function createFireParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 12,
		origin,
		color: [0xff8833, 0xffaa44, 0xff6622],
		speed: { min: 0.08, max: 0.2 },
		life: { min: 200, max: 400 },
		size: { min: 2, max: 5 },
		pattern: { type: "radial" },
	};
}

/**
 * サンダー用パーティクル設定を生成
 * 赤系の衝撃波・爆発エフェクト
 */
export function createThunderParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 25,
		origin,
		color: [0xff2222, 0xff4444, 0xcc1111, 0xff6600],
		speed: { min: 0.1, max: 0.3 },
		life: { min: 300, max: 500 },
		size: { min: 3, max: 8 },
		pattern: { type: "radial" },
	};
}

/**
 * ジャンプカード用パーティクル設定を生成
 * 紫系のスピードラインエフェクト（移動方向の逆向きに発射）
 * @param origin パーティクル発生位置
 * @param moveAngle 移動方向の角度（ラジアン）
 */
export function createJumpParticleConfig(
	origin: Vec2,
	moveAngle: number,
): ParticleConfig {
	return {
		count: 15,
		origin,
		color: [0x9944ff, 0xbb66ff, 0x7722dd],
		speed: { min: 0.15, max: 0.35 },
		life: { min: 150, max: 300 },
		size: { min: 2, max: 4 },
		pattern: {
			type: "directional",
			angle: moveAngle + Math.PI,
			spread: Math.PI / 3,
		},
	};
}

/**
 * 敵撃破時のパーティクル設定を生成
 * 白〜黄色系の散乱エフェクト
 */
export function createDefeatParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 20,
		origin,
		color: [0xffffff, 0xffdd44, 0xffaa22],
		speed: { min: 0.1, max: 0.25 },
		life: { min: 300, max: 600 },
		size: { min: 2, max: 6 },
		pattern: { type: "radial" },
		gravity: 0.0003,
	};
}

/**
 * 回復時パーティクル設定を生成
 * 緑系のキラキラ上昇エフェクト
 */
export function createHealParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 10,
		origin,
		color: [0x44cc66, 0x66ff88, 0xaaffcc],
		speed: { min: 0.05, max: 0.15 },
		life: { min: 300, max: 600 },
		size: { min: 2, max: 5 },
		pattern: { type: "directional", angle: -Math.PI / 2, spread: Math.PI / 6 },
		gravity: -0.0002,
	};
}

/**
 * 罠ダメージ時パーティクル設定を生成
 * 紫系の飛散エフェクト
 */
export function createTrapDamageParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 15,
		origin,
		color: [0x9b59b6, 0xcc66ff, 0x7733aa],
		speed: { min: 0.08, max: 0.2 },
		life: { min: 200, max: 400 },
		size: { min: 2, max: 5 },
		pattern: { type: "radial" },
	};
}

/**
 * 連撃コンボ用パーティクル設定を生成
 * シアン系の放射エフェクト
 */
export function createChainComboParticleConfig(origin: Vec2): ParticleConfig {
	return {
		count: 12,
		origin,
		color: [0x00ddff, 0x44eeff, 0x0099cc],
		speed: { min: 0.08, max: 0.2 },
		life: { min: 200, max: 400 },
		size: { min: 2, max: 5 },
		pattern: { type: "radial" },
	};
}

/**
 * カードタイプからヒット時パーティクル設定を取得
 */
export function getMagicParticleConfig(
	cardType: MagicCardType,
	origin: Vec2,
): ParticleConfig {
	switch (cardType) {
		case "fire":
			return createFireParticleConfig(origin);
		case "thunder":
			return createThunderParticleConfig(origin);
		default: {
			const _exhaustiveCheck: never = cardType;
			throw new Error(
				`未対応の MagicCardType が指定されました: ${_exhaustiveCheck}`,
			);
		}
	}
}
