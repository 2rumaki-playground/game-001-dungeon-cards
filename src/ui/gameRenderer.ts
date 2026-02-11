/**
 * ゲーム画面の描画関数群
 */

import { LOG_AREA_GAP, STATUS_BAR_HEIGHT } from "../constants";
import type { GameContext } from "../gameContext";
import type { GameState } from "../types";
import {
	calculateCameraOffset,
	clampCameraOffset,
	getViewportPixelSize,
} from "./coordinates";
import { HAND_AREA_HEIGHT } from "./layout";

/**
 * 行動ログの差分を出力してゲーム状態を反映する
 */
export function applyState(ctx: GameContext, newState: GameState): void {
	if (ctx.debugLog) {
		const newEntries = newState.actionLog.length - ctx.state.actionLog.length;
		for (let i = newEntries - 1; i >= 0; i--) {
			console.log(`[行動ログ] ${newState.actionLog[i].message}`);
		}
	}
	ctx.state = newState;
}

/**
 * ゲーム状態を更新して再描画
 */
export function updateState(ctx: GameContext, newState: GameState): void {
	applyState(ctx, newState);
	render(ctx);
}

/**
 * タイトル画面の描画
 */
function hideDebugUI(ctx: GameContext): void {
	ctx.ui.debugCardRenderer?.hide();
	ctx.ui.debugTargetSelector?.hide();
}

function renderTitleScreen(ctx: GameContext): void {
	ctx.ui.titleScreen.show();
	ctx.ui.gameOverScreen.hide();
	ctx.ui.victoryScreen.hide();
	ctx.ui.statusBar.hide();
	ctx.ui.turnEndButton.hide();
	ctx.ui.nextFloorButton.hide();
	ctx.ui.returnToPlayerButton.hide();
	ctx.ui.cameraDragController.reset();
	ctx.ui.deckViewer.hideButton();
	ctx.ui.actionLogRenderer.hide();
	ctx.ui.mapRenderer.clear();
	ctx.ui.handRenderer.clear();
	hideDebugUI(ctx);
}

/**
 * カメラ位置の合成・クランプ・ボタン表示判定を一括で適用
 */
export function applyCameraOffset(ctx: GameContext): void {
	const mapContainer = ctx.ui.mapRenderer.getContainer();
	const mapWidth = ctx.state.map[0]?.length ?? 0;
	const mapHeight = ctx.state.map.length;
	const baseOffset = calculateCameraOffset(
		ctx.state.player.position,
		mapWidth,
		mapHeight,
	);
	const dragOffset = ctx.ui.cameraDragController.getDragOffset();
	const offset = clampCameraOffset(baseOffset, dragOffset, mapWidth, mapHeight);
	mapContainer.x = offset.x;
	mapContainer.y = offset.y;

	const isCameraMoved = offset.x !== baseOffset.x || offset.y !== baseOffset.y;
	ctx.ui.returnToPlayerButton.render(isCameraMoved);
}

/**
 * ゲーム画面の描画
 */
export function renderGameScreen(
	ctx: GameContext,
	skipHand = false,
	skipPlayer = false,
	skipEnemies = false,
): void {
	ctx.ui.titleScreen.hide();
	ctx.ui.gameOverScreen.hide();
	ctx.ui.victoryScreen.hide();
	ctx.ui.statusBar.show();
	ctx.ui.statusBar.render(
		ctx.state.player,
		ctx.state.floor,
		ctx.state.isCleared,
	);
	ctx.ui.mapRenderer.render(
		ctx.state.map,
		ctx.state.player,
		ctx.state.enemies,
		skipPlayer,
		skipEnemies,
		ctx.state.remnants,
	);
	applyCameraOffset(ctx);
	if (!skipHand) {
		ctx.ui.handRenderer.render(ctx.state.deck.hand, ctx.state.player.ap);
	}
	ctx.ui.turnEndButton.show();
	ctx.ui.turnEndButton.render(ctx.state.turn);
	ctx.ui.nextFloorButton.render(ctx.state.enemies.length);
	ctx.ui.deckViewer.showButton();
	ctx.ui.actionLogRenderer.show();
	ctx.ui.actionLogRenderer.render(ctx.state.actionLog);

	// デバッグカード表示（DEV環境 + デバッグモードON時のみ）
	if (ctx.debugMode && ctx.ui.debugCardRenderer) {
		ctx.ui.debugCardRenderer.render();
		ctx.ui.debugCardRenderer.show();
	} else {
		ctx.ui.debugCardRenderer?.hide();
	}
}

/**
 * ゲームオーバー画面の描画
 */
function renderGameOverScreen(ctx: GameContext): void {
	ctx.ui.titleScreen.hide();
	ctx.ui.victoryScreen.hide();
	ctx.ui.statusBar.hide();
	ctx.ui.turnEndButton.hide();
	ctx.ui.nextFloorButton.hide();
	ctx.ui.returnToPlayerButton.hide();
	ctx.ui.cameraDragController.reset();
	ctx.ui.deckViewer.hideButton();
	ctx.ui.actionLogRenderer.hide();
	ctx.ui.mapRenderer.clear();
	ctx.ui.handRenderer.clear();
	const viewportSize = getViewportPixelSize();
	const width =
		viewportSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
	const height = viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;
	ctx.ui.gameOverScreen.render(ctx.state.floor, width, height);
	ctx.ui.gameOverScreen.show();
	hideDebugUI(ctx);
}

/**
 * 勝利画面の描画
 */
function renderVictoryScreen(ctx: GameContext): void {
	ctx.ui.titleScreen.hide();
	ctx.ui.gameOverScreen.hide();
	ctx.ui.statusBar.hide();
	ctx.ui.turnEndButton.hide();
	ctx.ui.nextFloorButton.hide();
	ctx.ui.returnToPlayerButton.hide();
	ctx.ui.cameraDragController.reset();
	ctx.ui.deckViewer.hideButton();
	ctx.ui.actionLogRenderer.hide();
	ctx.ui.mapRenderer.clear();
	ctx.ui.handRenderer.clear();
	const viewportSize = getViewportPixelSize();
	const width =
		viewportSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
	const height = viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;
	ctx.ui.victoryScreen.render(ctx.state.floor, width, height);
	ctx.ui.victoryScreen.show();
	hideDebugUI(ctx);
}

/**
 * 報酬画面の描画（ゲーム画面の上にオーバーレイ）
 */
function renderRewardScreen(ctx: GameContext): void {
	// ゲーム画面を背景として描画（手札は非表示）
	renderGameScreen(ctx, true);
	ctx.ui.turnEndButton.hide();
	ctx.ui.nextFloorButton.hide();
	ctx.ui.deckViewer.hideButton();
	ctx.ui.handRenderer.clear();
	// 報酬画面をオーバーレイ
	ctx.ui.rewardScreen.show();
}

/**
 * 画面に応じた描画
 */
export function render(
	ctx: GameContext,
	skipHand = false,
	skipPlayer = false,
	skipEnemies = false,
): void {
	ctx.ui.rewardScreen.hide();
	ctx.ui.deckViewer.hide();
	ctx.ui.victoryScreen.hide();
	switch (ctx.state.screen) {
		case "title":
			renderTitleScreen(ctx);
			break;
		case "game":
			renderGameScreen(ctx, skipHand, skipPlayer, skipEnemies);
			break;
		case "gameOver":
			renderGameOverScreen(ctx);
			break;
		case "reward":
			renderRewardScreen(ctx);
			break;
		case "victory":
			renderVictoryScreen(ctx);
			break;
	}
}
