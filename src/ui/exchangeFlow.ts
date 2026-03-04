/**
 * 宝箱スクロール獲得時のカード交換フロー
 * @see docs/spec/constants.md 「宝箱ドロップ」節
 */

import { exchangeCardInDeck } from "../game/cardAcquisition";
import { addRunEvent } from "../game/eventLog";
import { getCurrentSession } from "../game/playStats";
import { addSpeechLog } from "../game/speech";
import type { GameContext } from "../gameContext";
import type { CardType, GameState } from "../types";
import { CARD_TYPE_NAME } from "./cardConstants";
import { getGameAreaSize, getScreenSize } from "./gameAnimations";
import { applyState, render } from "./gameRenderer";

/**
 * カード交換画面のタイトルを生成
 */
export function buildExchangeTitle(acquiredCardType: CardType): string {
	const cardName = CARD_TYPE_NAME[acquiredCardType];
	return `宝箱から${cardName}のスクロールを獲得！`;
}

/**
 * カード交換フローを実行する（キューの先頭1件を処理）
 *
 * @returns 交換後のGameState（キューから処理済みエントリを除去）
 */
export async function executeExchangeFlow(
	ctx: GameContext,
	state: GameState,
): Promise<GameState> {
	if (state.cardExchangeQueue.length === 0) return state;

	const exchange = state.cardExchangeQueue[0];
	const remaining = state.cardExchangeQueue.slice(1);

	const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);
	const gameArea = getGameAreaSize(ctx);

	const title = buildExchangeTitle(exchange.acquiredCardType);

	state = addSpeechLog(state, "card_acquired");

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
		let newState = exchangeCardInDeck(
			state,
			exchangeResult,
			exchange.acquiredCardType,
		);
		newState = addRunEvent(newState, {
			type: "card_acquired",
			floor: newState.floor,
			turn: getCurrentSession()?.playerTurnCount ?? 0,
			detail: { cardType: exchange.acquiredCardType },
		});
		return {
			...newState,
			cardExchangeQueue: remaining,
		};
	}

	// スキップ（交換しない）
	const skippedState = addSpeechLog(state, "card_skipped");
	return {
		...skippedState,
		cardExchangeQueue: remaining,
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

		ctx.ui.cardRemoveScreen.renderRemoveSelection(
			allCards,
			screenWidth,
			screenHeight,
			title,
			gameArea?.width,
			gameArea?.height,
			acquiredCardType,
		);
		ctx.ui.cardRemoveScreen.show();

		let settled = false;
		const cleanup = () => {
			ctx.ui.cardRemoveScreen.setOnRemoveCard(() => {});
			ctx.ui.cardRemoveScreen.setOnSkip(() => {});
			ctx.ui.cardRemoveScreen.hide();
		};

		ctx.ui.cardRemoveScreen.setOnRemoveCard((cardId) => {
			if (settled) return;
			settled = true;
			resolve(cardId);
			cleanup();
		});

		ctx.ui.cardRemoveScreen.setOnSkip(() => {
			if (settled) return;
			settled = true;
			resolve(null);
			cleanup();
		});
	});
}
