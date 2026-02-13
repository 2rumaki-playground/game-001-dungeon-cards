/**
 * 報酬フロー・カード除去イベント
 */

import { DECK_MAX_SIZE } from "../constants";
import {
	addRewardCardToDeck,
	createRewardState,
	getTotalDeckSize,
	removeCardFromDeck,
	shouldTriggerCardRemoval,
} from "../game";
import type { GameContext } from "../gameContext";
import type { CardType, GameState } from "../types";
import { getGameAreaSize, getScreenSize } from "./gameAnimations";
import { applyState, render } from "./gameRenderer";

/**
 * 報酬フローを実行する
 *
 * 撃破数に応じた報酬カード選択肢を全て表示し、
 * ユーザーが1枚選択（またはスキップ）するまで待機する。
 * @see docs/spec/deckbuilding.md「報酬画面」
 */
export async function executeRewardFlow(
	ctx: GameContext,
	state: GameState,
): Promise<GameState> {
	const result = createRewardState(state);
	if (!result) return state;

	let current: GameState = {
		...result.updatedState,
		screen: "reward" as const,
		rewardState: result.rewardState,
	};

	// 報酬画面に遷移した状態を適用してから描画する
	applyState(ctx, current);
	render(ctx);

	const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);
	const gameArea = getGameAreaSize(ctx);

	const needsReplacement = getTotalDeckSize(current.deck) >= DECK_MAX_SIZE;

	if (needsReplacement) {
		// 入れ替えモード（仕様準拠）: まず除去カード選択→その後報酬カード選択→追加
		// スキップ時は除去も追加も行わない（デッキ枚数不変）
		// @see docs/spec/deckbuilding.md「デッキ上限到達時の入手」
		const removeResult = await showRemoveCardSelection(
			ctx,
			current,
			screenWidth,
			screenHeight,
			undefined,
			gameArea,
		);
		if (removeResult !== null) {
			const beforeRemove = current;
			current = removeCardFromDeck(current, removeResult);
			// 除去後に報酬カード選択
			const selectedIndex = await showRewardCardSelection(
				ctx,
				result.rewardState.choices,
				screenWidth,
				screenHeight,
				gameArea,
			);
			if (selectedIndex !== null) {
				current = addRewardCardToDeck(
					current,
					result.rewardState.choices[selectedIndex],
				);
			} else {
				// 報酬スキップ時は除去もロールバック（仕様: 枚数不変）
				current = beforeRemove;
			}
		}
	} else {
		// 通常モード: 選択肢から1枚選択 or スキップ
		const selectedIndex = await showRewardCardSelection(
			ctx,
			result.rewardState.choices,
			screenWidth,
			screenHeight,
			gameArea,
		);
		if (selectedIndex !== null) {
			current = addRewardCardToDeck(
				current,
				result.rewardState.choices[selectedIndex],
			);
		}
	}

	// 報酬完了: ゲーム画面に戻す
	return { ...current, screen: "game", rewardState: null };
}

/**
 * 報酬カード選択をPromiseで待機する
 *
 * 全選択肢を表示し、ユーザーが1枚選択するかスキップするまで待機する。
 * @returns 選択されたカードのインデックス（スキップ時はnull）
 */
function showRewardCardSelection(
	ctx: GameContext,
	choices: CardType[],
	screenWidth: number,
	screenHeight: number,
	gameArea?: { width: number; height: number },
): Promise<number | null> {
	return new Promise((resolve) => {
		ctx.ui.rewardScreen.render(
			choices,
			screenWidth,
			screenHeight,
			gameArea?.width,
			gameArea?.height,
		);
		ctx.ui.rewardScreen.show();

		let settled = false;
		const cleanup = () => {
			ctx.ui.rewardScreen.setOnCardSelect(() => {});
			ctx.ui.rewardScreen.setOnSkip(() => {});
			ctx.ui.rewardScreen.hide();
		};

		ctx.ui.rewardScreen.setOnCardSelect(async (index) => {
			if (settled) return;
			settled = true;
			try {
				await ctx.ui.rewardScreen.animateCardAcquire(index, choices[index]);
			} catch (error) {
				console.warn("カード取得アニメーション中にエラー:", error);
			}
			resolve(index);
			cleanup();
		});

		ctx.ui.rewardScreen.setOnSkip(() => {
			if (settled) return;
			settled = true;
			resolve(null);
			cleanup();
		});
	});
}

/**
 * カード除去選択画面をPromiseで待機する
 */
function showRemoveCardSelection(
	ctx: GameContext,
	state: GameState,
	screenWidth: number,
	screenHeight: number,
	title?: string,
	gameArea?: { width: number; height: number },
): Promise<string | null> {
	return new Promise((resolve) => {
		const allCards = [
			...state.deck.drawPile,
			...state.deck.hand,
			...state.deck.discardPile,
		];

		ctx.ui.rewardScreen.renderRemoveSelection(
			allCards,
			screenWidth,
			screenHeight,
			title,
			gameArea?.width,
			gameArea?.height,
		);
		ctx.ui.rewardScreen.show();

		let settled = false;
		const cleanup = () => {
			ctx.ui.rewardScreen.setOnRemoveCard(() => {});
			ctx.ui.rewardScreen.setOnSkip(() => {});
			ctx.ui.rewardScreen.hide();
		};

		ctx.ui.rewardScreen.setOnRemoveCard((cardId) => {
			if (settled) return;
			settled = true;
			resolve(cardId);
			cleanup();
		});

		ctx.ui.rewardScreen.setOnSkip(() => {
			if (settled) return;
			settled = true;
			resolve(null);
			cleanup();
		});
	});
}

/**
 * カード除去イベントを実行する
 *
 * 全敵撃破かつデッキ枚数が最小値を超えている場合、30%の確率で除去イベントが発生。
 * 報酬フローの前に挿入される。
 * @see docs/spec/deckbuilding.md「カード除去」
 */
export async function executeCardRemovalEvent(
	ctx: GameContext,
	state: GameState,
	screenWidth: number,
	screenHeight: number,
	gameArea?: { width: number; height: number },
): Promise<GameState> {
	const { triggered, updatedState } = shouldTriggerCardRemoval(state);
	if (!triggered) return updatedState;

	// 除去イベント中は報酬フローと同様に screen を "reward" 扱いにして描画する
	const prevScreen = updatedState.screen;
	const removalState: GameState = {
		...updatedState,
		screen: "reward",
	};
	applyState(ctx, removalState);
	render(ctx);

	const removeResult = await showRemoveCardSelection(
		ctx,
		removalState,
		screenWidth,
		screenHeight,
		"カード除去イベント",
		gameArea,
	);

	let resultState: GameState;
	if (removeResult !== null) {
		resultState = removeCardFromDeck(removalState, removeResult);
	} else {
		resultState = removalState;
	}

	// 除去イベント終了後は元の screen に戻して返す
	return {
		...resultState,
		screen: prevScreen,
	};
}
