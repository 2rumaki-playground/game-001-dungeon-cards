/**
 * イベントハンドラ設定
 */

import {
	endPlayerTurn,
	executeAttack,
	executeEnemyTurn,
	executeMove,
	executeRush,
	executeStrongAttack,
	executeWait,
	returnToTitle,
	startNewGame,
	startPlayerTurn,
	willReshuffle,
} from "../game";
import type { GameContext } from "../gameContext";
import type { Direction } from "../types";
import { DIRECTION_DELTA } from "../types";
import { deleteSaveData, hasSaveData, loadGame } from "../utils/storage";
import { detectEnemyMoves } from "./enemyMoveDetector";
import {
	animateRushWithStairs,
	getScreenSize,
	updateStateWithAttackAnimation,
	updateStateWithBumpAnimation,
	updateStateWithMoveAnimation,
	updateStateWithStairsAnimation,
} from "./gameAnimations";
import {
	applyState,
	render,
	renderGameScreen,
	updateState,
} from "./gameRenderer";
import { relayoutUI } from "./relayout";

/**
 * 移動カードの実行と対応するアニメーション
 */
async function handleMoveCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const prevPosition = ctx.state.player.position;
	const {
		state: next,
		reachedStairs,
		gameOver,
	} = executeMove(ctx.state, cardId, direction);
	const moved =
		next.player.position.x !== prevPosition.x ||
		next.player.position.y !== prevPosition.y;
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (reachedStairs) {
		const stairsPos = {
			x: prevPosition.x + DIRECTION_DELTA[direction].x,
			y: prevPosition.y + DIRECTION_DELTA[direction].y,
		};
		await updateStateWithStairsAnimation(ctx, next, stairsPos);
	} else if (moved) {
		await updateStateWithMoveAnimation(ctx, next, next.player.position);
		if (gameOver) {
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, next);
			});
		}
	} else {
		await updateStateWithBumpAnimation(ctx, next, direction);
	}
}

/**
 * 攻撃カードの実行と対応するアニメーション
 */
async function handleAttackCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const {
		state: next,
		hit,
		enemyId,
	} = executeAttack(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (hit && enemyId) {
		await updateStateWithAttackAnimation(ctx, next, enemyId);
	} else {
		updateState(ctx, next);
	}
}

/**
 * 強攻撃カードの実行と対応するアニメーション
 */
async function handleStrongAttackCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const {
		state: next,
		hit,
		enemyId,
	} = executeStrongAttack(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (hit && enemyId) {
		await updateStateWithAttackAnimation(ctx, next, enemyId);
	} else {
		updateState(ctx, next);
	}
}

/**
 * 突進カードの実行と対応するアニメーション
 */
async function handleRushCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const prevPosition = ctx.state.player.position;
	const result = executeRush(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;

	if (result.movedDistance === 0) {
		// 移動失敗: バンプアニメーション
		await updateStateWithBumpAnimation(ctx, result.state, direction);
	} else if (result.reachedStairs && result.movedDistance === 1) {
		// 1マス目が階段: 階段アニメーション
		const stairsPos = {
			x: prevPosition.x + DIRECTION_DELTA[direction].x,
			y: prevPosition.y + DIRECTION_DELTA[direction].y,
		};
		await updateStateWithStairsAnimation(ctx, result.state, stairsPos);
	} else if (result.reachedStairs && result.intermediatePosition) {
		// 2マス目が階段: 2段階移動→階層遷移アニメーション
		const stairsPos = {
			x: result.intermediatePosition.x + DIRECTION_DELTA[direction].x,
			y: result.intermediatePosition.y + DIRECTION_DELTA[direction].y,
		};
		await animateRushWithStairs(
			ctx,
			result.state,
			result.intermediatePosition,
			stairsPos,
		);
	} else {
		// 通常移動(1or2マス): 最終位置へ直接移動アニメーション
		await updateStateWithMoveAnimation(
			ctx,
			result.state,
			result.state.player.position,
		);
		if (result.gameOver) {
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, result.state);
			});
		}
	}
}

export function setupEventHandlers(ctx: GameContext): void {
	// 方向選択UIのコールバック設定
	ctx.ui.directionSelector.setOnDirectionSelect(async (direction) => {
		if (ctx.isAnimating) return; // アニメーション中は無効
		if (ctx.pendingCard) {
			if (ctx.pendingCard.type === "move") {
				await handleMoveCardExecution(ctx, ctx.pendingCard.id, direction);
				return;
			}
			if (ctx.pendingCard.type === "attack") {
				await handleAttackCardExecution(ctx, ctx.pendingCard.id, direction);
				return;
			}
			if (ctx.pendingCard.type === "strong_attack") {
				await handleStrongAttackCardExecution(
					ctx,
					ctx.pendingCard.id,
					direction,
				);
				return;
			}
			if (ctx.pendingCard.type === "rush") {
				await handleRushCardExecution(ctx, ctx.pendingCard.id, direction);
				return;
			}
		}
		ctx.ui.directionSelector.hide();
		ctx.pendingCard = null;
	});

	ctx.ui.directionSelector.setOnCancel(() => {
		if (ctx.isAnimating) return; // アニメーション中は無効
		ctx.ui.directionSelector.hide();
		ctx.pendingCard = null;
	});

	// 手札選択のコールバック設定
	// 方向パラメータを持つカードはクリック位置で方向が決まる
	ctx.ui.handRenderer.setOnCardSelect(async (card, direction) => {
		if (ctx.isAnimating) return false; // アニメーション中は無効
		if (card.type === "wait") {
			updateState(ctx, executeWait(ctx.state, card.id));
		} else if (direction) {
			// 方向が指定されている場合は即座に実行
			if (card.type === "move") {
				await handleMoveCardExecution(ctx, card.id, direction);
			} else if (card.type === "attack") {
				await handleAttackCardExecution(ctx, card.id, direction);
			} else if (card.type === "strong_attack") {
				await handleStrongAttackCardExecution(ctx, card.id, direction);
			} else if (card.type === "rush") {
				await handleRushCardExecution(ctx, card.id, direction);
			}
		} else {
			// 方向が指定されていない場合は方向選択UIを表示（フォールバック）
			ctx.pendingCard = card;
			ctx.ui.directionSelector.show();
		}
	});

	// タイトル画面のコールバック設定
	ctx.ui.titleScreen.setOnNewGame(async () => {
		if (ctx.isAnimating) return;
		ctx.isAnimating = true;
		try {
			const newState = startNewGame(ctx.state);
			await ctx.ui.screenTransition.fadeTransition(() => {
				applyState(ctx, newState);
				relayoutUI(ctx);
				// 手札はフェードイン後に配布アニメーションで表示するためスキップ
				render(ctx, true);
			});
			// フェードイン後に手札配布アニメーション
			await ctx.ui.handRenderer.renderWithAnimation(
				ctx.state.deck.hand,
				ctx.state.player.ap,
				newState.deck.hand.length,
			);
		} finally {
			ctx.isAnimating = false;
		}
	});

	ctx.ui.titleScreen.setOnContinue(async () => {
		if (ctx.isAnimating) return;
		const savedState = loadGame();
		if (savedState) {
			ctx.isAnimating = true;
			try {
				await ctx.ui.screenTransition.fadeTransition(() => {
					updateState(ctx, savedState);
					if (savedState.screen === "game") {
						relayoutUI(ctx);
					}
				});
			} finally {
				ctx.isAnimating = false;
			}
		} else {
			alert("セーブデータの読み込みに失敗しました。");
			const screen = getScreenSize(ctx);
			ctx.ui.titleScreen.render(screen.width, screen.height, hasSaveData());
		}
	});

	// ゲームオーバー画面のコールバック設定
	ctx.ui.gameOverScreen.setOnReturnToTitle(async () => {
		if (ctx.isAnimating) return;
		ctx.isAnimating = true;
		try {
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, returnToTitle(ctx.state));
				const screen = getScreenSize(ctx);
				ctx.ui.titleScreen.render(screen.width, screen.height, hasSaveData());
			});
		} finally {
			ctx.isAnimating = false;
		}
	});

	// デッキ閲覧UIのコールバック設定
	ctx.ui.deckViewer.setOnOpen(() => {
		if (ctx.isAnimating) return;
		const screen = getScreenSize(ctx);
		ctx.ui.deckViewer.render(ctx.state.deck, screen.width, screen.height);
		ctx.ui.deckViewer.show();
	});

	ctx.ui.deckViewer.setOnClose(() => {
		ctx.ui.deckViewer.hide();
	});

	// ターン終了ボタンのコールバック設定
	ctx.ui.turnEndButton.setOnEndTurn(async () => {
		if (ctx.isAnimating) return; // アニメーション中は無効
		ctx.isAnimating = true;

		try {
			let next = endPlayerTurn(ctx.state);

			// 敵ターンバナー表示
			await ctx.ui.turnBanner.showBanner("enemy");

			const enemiesBefore = next.enemies;
			const { state: enemyTurnState, totalDamage } = executeEnemyTurn(next);
			next = enemyTurnState;
			const enemyMoves = detectEnemyMoves(enemiesBefore, next.enemies);
			const playerWasAttacked = totalDamage > 0;

			// 敵移動アニメーション
			if (enemyMoves.length > 0) {
				if (next.screen !== "gameOver") {
					applyState(ctx, next);
					render(ctx, true, false, true); // 手札・敵スキップ
				}
				ctx.ui.mapRenderer.renderEnemies(next.enemies);
				await ctx.ui.mapRenderer.animateEnemyMoves(enemyMoves);
			}

			// 敵攻撃アニメーション
			if (playerWasAttacked) {
				const prevHp = ctx.state.player.hp;
				applyState(ctx, next);
				// ゲームオーバー時も攻撃演出中はゲーム画面を維持（暗転後に切り替え）
				renderGameScreen(ctx);
				await Promise.all([
					ctx.ui.mapRenderer.animateEnemyAttackHit(totalDamage),
					ctx.ui.statusBar.animateHpChange(
						prevHp,
						next.player.hp,
						next.player.maxHp,
					),
				]);
			}

			if (next.screen !== "gameOver") {
				// リシャッフル判定（startPlayerTurn内のdrawCards前の状態で判定）
				const needsShuffle = willReshuffle(next.deck);

				next = startPlayerTurn(next);

				// プレイヤーターンバナー表示
				await ctx.ui.turnBanner.showBanner("player");

				applyState(ctx, next);
				render(ctx, true);

				// リシャッフル演出（ドロー前に実行）
				if (needsShuffle) {
					await ctx.ui.handRenderer.animateShuffle();
				}

				await ctx.ui.handRenderer.renderWithAnimation(
					ctx.state.deck.hand,
					ctx.state.player.ap,
					next.deck.hand.length,
				);
			} else {
				deleteSaveData();
				await ctx.ui.screenTransition.fadeTransition(() => {
					updateState(ctx, next);
				});
			}
		} finally {
			ctx.isAnimating = false;
		}
	});
}
