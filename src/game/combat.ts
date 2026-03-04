/**
 * 戦闘システム（ダメージ・死亡処理）
 * @see docs/spec/mvp/rules.md
 */

import { CLOSE_CALL_HP_RATIO, ENEMY_TYPE_LABEL } from "../constants";
import type { EnemyType, GameState } from "../types";
import { updateDefeatCounter, updateHitCounter } from "./cardAcquisition";
import { awardExpToCard } from "./cardLevel";
import { recordDefeat, updateMaxDamage } from "./cardStats";
import { checkChestDrop, placeChestTile } from "./chestDrop";
import { addRunEvent } from "./eventLog";
import {
	getCurrentSession,
	recordDamageDealt,
	recordDamageTaken,
} from "./playStats";
import { addSpeechLog } from "./speech";
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
		return { state, defeated: false };
	}

	// 盾持ち敵: 盾が有効なら初撃ダメージ半減（端数切り捨て）
	let effectiveDamage = damage;
	let shieldConsumed = false;
	if (enemy.type === "shielded" && enemy.shieldActive !== false) {
		effectiveDamage = Math.floor(damage / 2);
		shieldConsumed = true;
	}

	recordDamageDealt(Math.min(effectiveDamage, enemy.hp));

	let next = updateEnemy(state, enemyId, (e) => ({
		...e,
		hp: e.hp - effectiveDamage,
		...(shieldConsumed && { shieldActive: false }),
	}));

	// カード統計: 最大単発ダメージを記録（実効ダメージ = min(effectiveDamage, enemy.hp)）
	if (attackCardId) {
		next = updateMaxDamage(
			next,
			attackCardId,
			Math.min(effectiveDamage, enemy.hp),
		);
	}

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

		// 攻撃カードへのXP付与 + 撃破数記録
		if (attackCardId) {
			next = awardExpToCard(next, attackCardId);
			next = recordDefeat(next, attackCardId);
		}

		// 宝箱ドロップ判定
		const chestRarity = checkChestDrop(next.rng, target.type);
		if (chestRarity) {
			const placed = placeChestTile(
				next,
				target.position,
				chestRarity,
				target.type,
			);
			if (placed) {
				next = placed;
				const label = ENEMY_TYPE_LABEL[target.type];
				next = addActionLog(next, `${label}を倒して宝箱が出現した`, "system");
			} else {
				next = addActionLog(next, "敵を倒した", "system");
			}
		} else {
			next = addActionLog(next, "敵を倒した", "system");
		}

		// イベントログ記録
		const turn = getCurrentSession()?.playerTurnCount ?? 0;
		if (target.type === "boss") {
			next = addRunEvent(next, {
				type: "boss_defeated",
				floor: next.floor,
				turn,
				detail: { enemyType: "boss" },
			});
		} else if (target.type === "miniboss") {
			next = addRunEvent(next, {
				type: "miniboss_defeated",
				floor: next.floor,
				turn,
				detail: { enemyType: "miniboss" },
			});
		}
		if (
			next.player.hp > 0 &&
			next.player.hp / next.player.maxHp <= CLOSE_CALL_HP_RATIO
		) {
			next = addRunEvent(next, {
				type: "close_call_defeat",
				floor: next.floor,
				turn,
				detail: {
					remainingHpRatio: next.player.hp / next.player.maxHp,
					enemyType: target.type,
				},
			});
		}

		next = addSpeechLog(next, "enemy_defeated");
		next = checkVictory(next, target.type);
		return { state: next, defeated: true };
	}

	return {
		state: addActionLog(next, "敵にダメージを与えた", "system"),
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
	next = addSpeechLog(next, "damage_taken");

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
	next = addSpeechLog(next, "game_over");

	return next;
}
