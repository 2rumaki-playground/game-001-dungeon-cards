/**
 * 戦闘パーティクル設定
 * カードタイプ別のパーティクルエフェクト設定を生成する純粋関数群
 */

import type { CardType } from "../types/card";
import type { ParticleConfig, Vec2 } from "./particleLogic";

/** 攻撃ヒット時に使用可能なカードタイプ */
export type AttackCardType = Extract<CardType, "attack" | "strong_attack">;

/**
 * 攻撃カード用パーティクル設定を生成
 * オレンジ系の火花エフェクト
 */
export function createAttackParticleConfig(origin: Vec2): ParticleConfig {
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
 * 強攻撃カード用パーティクル設定を生成
 * 赤系の衝撃波・爆発エフェクト
 */
export function createStrongAttackParticleConfig(origin: Vec2): ParticleConfig {
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
 * 突進カード用パーティクル設定を生成
 * 紫系のスピードラインエフェクト（移動方向の逆向きに発射）
 * @param origin パーティクル発生位置
 * @param moveAngle 移動方向の角度（ラジアン）
 */
export function createRushParticleConfig(
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
 * カードタイプからヒット時パーティクル設定を取得
 */
export function getAttackParticleConfig(
	cardType: AttackCardType,
	origin: Vec2,
): ParticleConfig {
	switch (cardType) {
		case "attack":
			return createAttackParticleConfig(origin);
		case "strong_attack":
			return createStrongAttackParticleConfig(origin);
		default: {
			const _exhaustiveCheck: never = cardType;
			throw new Error(
				`未対応の AttackCardType が指定されました: ${_exhaustiveCheck}`,
			);
		}
	}
}
