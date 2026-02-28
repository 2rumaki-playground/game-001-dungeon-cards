/**
 * 戦闘システム（ダメージ・死亡処理）
 * @see docs/spec/mvp/rules.md
 */

import { ENEMY_ACQUISITION_CONDITIONS, ENEMY_TYPE_LABEL } from "../constants";
import type { EnemyType, GameState } from "../types";
import {
	checkAcquisitionCondition,
	updateDefeatCounter,
	updateHitCounter,
} from "./cardAcquisition";
import { awardExpToCard } from "./cardLevel";
import { recordDamageDealt, recordDamageTaken } from "./playStats";
import {
	addActionLog,
	addRemnant,
	changeScreen,
	removeEnemy,
	updateEnemy,
	updatePlayer,
} from "./state";
import { checkVictory } from "./victory";

/** 敵ダメージ適用の結果 */
export type DamageResult = {
	state: GameState;
	/** 超過ダメージ量（Math.max(0, damage - enemy.hp)、非撃破時は自然に0となる） */
	overkill: number;
	/** 敵が撃破されたか */
	defeated: boolean;
};

/**
 * HP0以下で撃破判定
 */
export function isDefeated(hp: number): boolean {
	return hp <= 0;
}

/**
 * 敵にダメージを適用
 *
 * - 敵HPからダメージを減算
 * - HP0以下なら敵をマップから除去
 * - 行動ログを記録
 */
export function applyDamageToEnemy(
	state: GameState,
	enemyId: string,
	damage: number,
	attackCardId?: string,
): DamageResult {
	// 対象の敵が存在しない場合は何もしない
	const enemy = state.enemies.find((e) => e.id === enemyId);
	if (!enemy) {
		return { state, overkill: 0, defeated: false };
	}

	const overkill = Math.max(0, damage - enemy.hp);

	recordDamageDealt(Math.min(damage, enemy.hp));

	let next = updateEnemy(state, enemyId, (e) => ({
		...e,
		hp: e.hp - damage,
	}));

	const target = next.enemies.find((e) => e.id === enemyId);
	if (target && isDefeated(target.hp)) {
		next = addRemnant(next, target.position);
		next = removeEnemy(next, enemyId);

		// 撃破カウンターを更新
		const updatedCounters = updateDefeatCounter(
			next.acquisitionCounters,
			target.type,
		);
		next = {
			...next,
			rng: next.rng.clone(),
			defeatedEnemyCount: next.defeatedEnemyCount + 1,
			acquisitionCounters: updatedCounters,
		};

		// 攻撃カードへのXP付与
		if (attackCardId) {
			next = awardExpToCard(next, attackCardId);
		}

		// カード獲得条件の判定（既存のcardExchangeStateがある場合は維持）
		if (
			next.cardExchangeState === null &&
			checkAcquisitionCondition(updatedCounters, target.type)
		) {
			const config = ENEMY_ACQUISITION_CONDITIONS[target.type];
			next = {
				...next,
				cardExchangeState: {
					acquiredCardType: config.cardType,
					defeatedEnemyType: target.type,
				},
			};
			const label = ENEMY_TYPE_LABEL[target.type];
			next = addActionLog(
				next,
				`${label}を倒してカード交換が可能になった`,
				"system",
			);
		} else {
			next = addActionLog(next, "敵を倒した", "system");
		}

		next = checkVictory(next, target.type);
		return { state: next, overkill, defeated: true };
	}

	return {
		state: addActionLog(next, "敵にダメージを与えた", "system"),
		overkill: 0,
		defeated: false,
	};
}

/**
 * プレイヤーにダメージを適用
 *
 * - プレイヤーHPからダメージを減算
 * - 行動ログを記録
 * - ゲームオーバー判定は別関数（checkGameOver）で行う
 */
export function applyDamageToPlayer(
	state: GameState,
	damage: number,
): GameState {
	const actualDamage = Math.min(damage, state.player.hp);
	recordDamageTaken(actualDamage);

	let next = updatePlayer(state, (p) => ({
		...p,
		hp: p.hp - damage,
	}));

	next = addActionLog(next, "プレイヤーがダメージを受けた", "system");

	return next;
}

/**
 * 敵からプレイヤーへのダメージ適用 + 被弾カウンター更新
 *
 * - applyDamageToPlayer でダメージを適用
 * - lastAttackerEnemyType を記録
 * - HPが実際に減少した場合のみ hitCounter を更新
 */
export function applyEnemyDamageToPlayer(
	state: GameState,
	damage: number,
	enemyType: EnemyType,
): GameState {
	const hpBefore = state.player.hp;
	let next = applyDamageToPlayer(state, damage);
	next = {
		...next,
		lastAttackerEnemyType: enemyType,
		...(next.player.hp < hpBefore && {
			acquisitionCounters: updateHitCounter(
				next.acquisitionCounters,
				enemyType,
			),
		}),
	};
	return next;
}

/**
 * プレイヤー死亡判定とゲームオーバー遷移
 *
 * - HP0以下ならゲームオーバー画面に遷移
 * - HP1以上なら状態を変更せずそのまま返す
 */
export function checkGameOver(state: GameState): GameState {
	if (!isDefeated(state.player.hp)) {
		return state;
	}

	let next = changeScreen(state, "gameOver");
	next = addActionLog(next, "ゲームオーバー", "system");

	return next;
}
