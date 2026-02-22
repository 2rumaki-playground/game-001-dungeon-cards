/**
 * フロア遷移アニメーション
 */

import { shouldShowVictoryScreen, transitionFloor } from "../game";
import type { GameContext } from "../gameContext";
import type { GameState, Position } from "../types";
import { saveGame } from "../utils/storage";
import { applyState, render } from "./gameRenderer";
import { relayoutUI } from "./relayout";
import { showVictoryScreen } from "./victoryFlow";

/**
 * 階層遷移の共通フロー
 * カード除去→報酬→勝利判定→階層遷移→フェード→手札配布を実行する
 */
async function executeFloorTransitionFlow(
	ctx: GameContext,
	baseState: GameState,
): Promise<void> {
	// 1. 勝利画面（クリア階層のボス撃破済みの場合）
	if (shouldShowVictoryScreen(baseState)) {
		const victoryResult = await showVictoryScreen(ctx, baseState);
		if (victoryResult === "title") return;
	}

	// 2. 階層遷移
	const transitioned = transitionFloor(baseState);

	// 3. セーブ処理
	saveGame(transitioned);

	// 5. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
	await ctx.ui.screenTransition.fadeTransition(async () => {
		await ctx.ui.floorBanner.show(transitioned.floor);
		applyState(ctx, transitioned);
		relayoutUI(ctx);
		render(ctx);
		await ctx.ui.floorBanner.hide();
	});
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
