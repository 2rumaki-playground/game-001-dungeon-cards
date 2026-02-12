/**
 * デバッグ用のカスタムゲーム開始機能
 */

import { CARD_COST, ENEMY_PARAMS } from "../constants";
import type {
	CardType,
	DeckState,
	Enemy,
	EnemyType,
	GameState,
	Position,
} from "../types";
import type {
	DebugDeckComposition,
	DebugEnemyComposition,
	DebugStartParams,
} from "../types/debug";
import type { RNG } from "../utils/rng";
import { createCard, createInitialDeckState, drawCards } from "./deck";
import { createInitialGameState } from "./state";

/**
 * デバッグ用デッキを生成
 *
 * compositionで指定されたカード種別・枚数に基づいてデッキを構築し、シャッフルして返す。
 */
export function createDebugDeckState(
	composition: DebugDeckComposition,
	rng: RNG,
): DeckState {
	const validCardTypes = Object.keys(CARD_COST);
	const cards = Object.entries(composition).flatMap(([type, count]) => {
		if (!validCardTypes.includes(type)) {
			throw new Error(
				`createDebugDeckState: 不正なカードタイプが指定されました: "${type}"`,
			);
		}
		if (!Number.isInteger(count) || count < 0) {
			throw new Error(
				`createDebugDeckState: countは非負整数である必要があります: "${type}" = ${count}`,
			);
		}
		return Array.from({ length: count }, () => createCard(type as CardType));
	});
	return {
		drawPile: rng.shuffle(cards),
		hand: [],
		discardPile: [],
	};
}

/**
 * デバッグ用の敵配置を生成
 *
 * compositionで指定された敵タイプ・数に基づいて敵を配置する。
 * マップの敵位置数を超える場合は切り詰める。
 */
export function createDebugEnemies(
	positions: Position[],
	composition: DebugEnemyComposition,
): Enemy[] {
	const types: EnemyType[] = Object.entries(composition).flatMap(
		([type, count]) => Array.from({ length: count }, () => type as EnemyType),
	);

	return positions.slice(0, types.length).map((position, index) => {
		const type = types[index];
		const { hp } = ENEMY_PARAMS[type];
		return { id: `enemy-${index + 1}`, type, position, hp, maxHp: hp };
	});
}

/**
 * デバッグパラメータを指定して新規ゲームを開始
 *
 * 各パラメータが未指定の場合はデフォルト挙動にフォールバックする。
 */
export function startNewGameWithDebugParams(
	state: GameState,
	params: DebugStartParams,
): GameState {
	const seed = params.seed ?? state.rng.seed;
	const floor = params.floor;

	// ベースとなるGameStateを生成（マップ・敵位置を含む）
	const base = createInitialGameState(seed, floor);

	// デッキ: 指定があればカスタム、なければデフォルト
	const deck = params.deck
		? createDebugDeckState(params.deck, base.rng)
		: createInitialDeckState(base.rng);

	// 敵: 指定があればカスタム、なければベースのまま
	const enemies = params.enemies
		? createDebugEnemies(
				base.enemies.map((e) => e.position),
				params.enemies,
			)
		: base.enemies;

	// プレイヤーパラメータの上書き
	const maxHp = params.playerMaxHp ?? base.player.maxHp;
	const hp = params.playerHp ?? maxHp;
	const ap = params.playerAp ?? base.player.ap;

	const player = {
		...base.player,
		hp,
		maxHp,
		ap,
		maxAp: base.player.maxAp,
	};

	// 手札を補充
	const deckWithHand = drawCards(deck, base.rng);

	return {
		...base,
		enemies,
		deck: deckWithHand,
		player,
	};
}
