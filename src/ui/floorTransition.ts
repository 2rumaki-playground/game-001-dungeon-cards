/**
 * フロア遷移アニメーション
 */

import { shouldShowVictoryScreen, transitionFloor } from "../game";
import type { GameContext } from "../gameContext";
import type { GameState, Position } from "../types";
import { getGameAreaSize, getScreenSize } from "./gameAnimations";
import { applyState, render } from "./gameRenderer";
import { relayoutUI } from "./relayout";
import { executeCardRemovalEvent, executeRewardFlow } from "./rewardFlow";
import { showVictoryScreen } from "./victoryFlow";

/**
 * 階層遷移の共通フロー
 * カード除去→報酬→勝利判定→階層遷移→フェード→手札配布を実行する
 */
async function executeFloorTransitionFlow(
	ctx: GameContext,
	baseState: GameState,
): Promise<void> {
	const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);
	const gameArea = getGameAreaSize(ctx);

	// 1. カード除去イベント（報酬フローの前）
	const afterRemoval = await executeCardRemovalEvent(
		ctx,
		baseState,
		screenWidth,
		screenHeight,
		gameArea,
	);

	// 2. 報酬フロー（撃破数0ならスキップ）
	const afterReward = await executeRewardFlow(ctx, afterRemoval);

	// 3. 勝利画面（クリア階層のボス撃破済みの場合）
	if (shouldShowVictoryScreen(afterReward)) {
		const victoryResult = await showVictoryScreen(ctx, afterReward);
		if (victoryResult === "title") return;
	}

	// 4. 階層遷移
	const transitioned = transitionFloor(afterReward);

	// 5. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
	await ctx.ui.screenTransition.fadeTransition(async () => {
		await ctx.ui.floorBanner.show(transitioned.floor);
		applyState(ctx, transitioned);
		relayoutUI(ctx);
		render(ctx, true);
		await ctx.ui.floorBanner.hide();
	});

	// 6. フェードイン後に手札配布アニメーション
	await ctx.ui.handRenderer.renderWithAnimation(
		ctx.state.deck.hand,
		ctx.state.player.ap,
		transitioned.deck.hand.length,
	);
}

/**
 * 階段への移動アニメーション後に報酬フロー→階層遷移する
 */
export async function updateStateWithStairsAnimation(
	ctx: GameContext,
	stairsState: GameState,
	stairsGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	// ドラッグオフセットをリセット（ズームは維持）
	ctx.ui.cameraDragController.reset(false);

	try {
		await ctx.ui.mapRenderer.animatePlayerMove(stairsGridPos);
		applyState(ctx, stairsState);
		await executeFloorTransitionFlow(ctx, stairsState);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 「次の階層へ」ボタン押下時の階層遷移処理
 * 階段移動アニメーションをスキップし、カード除去→報酬→勝利判定→階層遷移を行う
 */
export async function executeNextFloorTransition(
	ctx: GameContext,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	try {
		await executeFloorTransitionFlow(ctx, ctx.state);
	} finally {
		ctx.isAnimating = false;
	}
}
