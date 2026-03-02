/**
 * 勝利画面表示・演出
 */

import { STATUS_BAR_HEIGHT } from "../constants";
import { returnToTitle } from "../game";
import { endSession } from "../game/playStats";
import { buildResultData } from "../game/resultBuilder";
import type { GameContext } from "../gameContext";
import type { GameState } from "../types";
import { savePlaySession } from "../utils/statsStorage";
import { deleteSaveData, hasSaveData } from "../utils/storage";
import { getScreenSize } from "./gameAnimations";
import { applyState, render, updateState } from "./gameRenderer";
import { createConfettiConfig, createGlowConfig } from "./victoryParticles";

/** 紙吹雪の繰り返し発射間隔（ミリ秒） */
const CONFETTI_INTERVAL = 3000;

/**
 * 勝利画面を表示し、ユーザーの選択を待機する
 * @returns "continue" で次フロアへ、"title" でタイトルに戻る
 */
export function showVictoryScreen(
	ctx: GameContext,
	state: GameState,
): Promise<"continue" | "title"> {
	return new Promise((resolve) => {
		ctx.resultData = buildResultData(state, "clear");
		const victoryState: GameState = { ...state, screen: "victory" };
		applyState(ctx, victoryState);
		render(ctx);

		const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);
		const particleHeight = screenHeight - STATUS_BAR_HEIGHT;
		const ps = ctx.ui.particleSystem;

		// パーティクル発射: 光の粒子（初回のみ）+ 紙吹雪（繰り返し）
		let confettiTimer: number | undefined;
		if (ps) {
			ps.emit(createGlowConfig(screenWidth, particleHeight));
			ps.emit(createConfettiConfig(screenWidth));
			confettiTimer = setInterval(() => {
				ps.emit(createConfettiConfig(screenWidth));
			}, CONFETTI_INTERVAL);
		}

		// 元のコールバックを保存し、勝利フロー終了時に復元する
		const prevOnContinue = ctx.ui.resultScreen.getOnContinue();
		const prevOnReturnToTitle = ctx.ui.resultScreen.getOnReturnToTitle();

		const cleanup = (): void => {
			if (confettiTimer !== undefined) {
				clearInterval(confettiTimer);
			}
			ps?.clear();
			ctx.resultData = null;
			if (prevOnContinue) ctx.ui.resultScreen.setOnContinue(prevOnContinue);
			if (prevOnReturnToTitle)
				ctx.ui.resultScreen.setOnReturnToTitle(prevOnReturnToTitle);
		};

		ctx.ui.resultScreen.setOnContinue(() => {
			cleanup();
			// ゲーム画面に戻す
			const continueState: GameState = { ...state, screen: "game" };
			applyState(ctx, continueState);
			render(ctx);
			resolve("continue");
		});

		ctx.ui.resultScreen.setOnReturnToTitle(async () => {
			cleanup();
			const session = endSession("clear", null);
			if (session) savePlaySession(session);
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, returnToTitle(ctx.state));
				const screen = getScreenSize(ctx);
				ctx.ui.titleScreen.render(screen.width, screen.height, hasSaveData());
			});
			resolve("title");
		});
	});
}
