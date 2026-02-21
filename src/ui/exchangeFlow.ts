/**
 * 敵撃破時のカード交換フロー
 * @see docs/spec/deckbuilding.md
 */

import { ENEMY_TYPE_LABEL } from "../constants";
import { exchangeCardInDeck } from "../game/cardAcquisition";
import type { GameContext } from "../gameContext";
import type { CardType, GameState } from "../types";
import { CARD_TYPE_NAME } from "./cardConstants";
import { getGameAreaSize, getScreenSize } from "./gameAnimations";
import { applyState, render } from "./gameRenderer";

/**
 * カード交換フローを実行する
 *
 * 敵撃破で条件達成した場合、既存デッキカードとの交換画面を表示する。
 * @returns 交換後のGameState
 */
export async function executeExchangeFlow(
	ctx: GameContext,
	state: GameState,
): Promise<GameState> {
	const exchange = state.cardExchangeState;
	if (!exchange) return state;

	const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);
	const gameArea = getGameAreaSize(ctx);

	const cardName = CARD_TYPE_NAME[exchange.acquiredCardType];
	const enemyName = ENEMY_TYPE_LABEL[exchange.defeatedEnemyType];
	const title = `${enemyName}を倒して${cardName}を獲得！交換するカードを選択`;

	const exchangeResult = await showExchangeSelection(
		ctx,
		state,
		screenWidth,
		screenHeight,
		title,
		gameArea,
		exchange.acquiredCardType,
	);

	if (exchangeResult !== null) {
		// 交換を実行
		const newState = exchangeCardInDeck(
			state,
			exchangeResult,
			exchange.acquiredCardType,
		);
		return {
			...newState,
			cardExchangeState: null,
		};
	}

	// スキップ（交換しない）
	return {
		...state,
		cardExchangeState: null,
	};
}

/**
 * カード交換選択画面をPromiseで待機する
 */
function showExchangeSelection(
	ctx: GameContext,
	state: GameState,
	screenWidth: number,
	screenHeight: number,
	title: string,
	gameArea: { width: number; height: number } | undefined,
	acquiredCardType: CardType,
): Promise<string | null> {
	return new Promise((resolve) => {
		const allCards = [...state.deck.hand];

		// exchange画面状態に遷移
		const exchangeState: GameState = {
			...state,
			screen: "exchange",
		};
		applyState(ctx, exchangeState);
		render(ctx);

		ctx.ui.rewardScreen.renderRemoveSelection(
			allCards,
			screenWidth,
			screenHeight,
			title,
			gameArea?.width,
			gameArea?.height,
			acquiredCardType,
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
