/**
 * イベントハンドラ設定
 */

import {
	CARD_COST,
	JUMP_DISTANCE,
	STATUS_BAR_HEIGHT,
	TRAP_DAMAGE,
	TREASURE_HEAL,
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_WHEEL_STEP,
} from "../constants";
import {
	endPlayerTurn,
	executeAttack,
	executeEnemyTurn,
	executeJump,
	executeMove,
	executeStrongAttack,
	executeWait,
	returnToTitle,
	startNewGame,
	startNewGameAtFloor,
	startPlayerTurn,
} from "../game";
import { canEnqueueCard } from "../game/cardQueue";
import type { GameContext } from "../gameContext";
import type { Card, Direction, Position, SpecialTileType } from "../types";
import { DIRECTION_DELTA } from "../types";
import { deleteSaveData, hasSaveData, loadGame } from "../utils/storage";
import { createJumpParticleConfig } from "./battleParticles";
import {
	calculateCameraOffset,
	clampCameraOffset,
	getViewportPixelSize,
	gridToCenterPixel,
} from "./coordinates";
import { detectEnemyMoves } from "./enemyMoveDetector";
import {
	executeNextFloorTransition,
	getGameAreaSize,
	getScreenSize,
	updateStateWithAttackAnimation,
	updateStateWithBumpAnimation,
	updateStateWithMissAnimation,
	updateStateWithMoveAnimation,
	updateStateWithStairsAnimation,
} from "./gameAnimations";
import {
	applyCameraOffset,
	applyState,
	render,
	renderGameScreen,
	updateState,
} from "./gameRenderer";
import { BUTTON_HEIGHT, RETURN_TO_PLAYER_BUTTON_WIDTH } from "./layout";
import { relayoutUI } from "./relayout";

/**
 * タイル効果ポップアップを表示
 */
async function showTileEffectPopup(
	ctx: GameContext,
	tileType: SpecialTileType,
	hpBefore: number,
	hpAfter: number,
	gridPos: Position,
): Promise<void> {
	let amount: number;

	if (tileType === "trap") {
		amount = hpBefore - hpAfter;
	} else {
		amount = hpAfter - hpBefore;
	}

	if (amount <= 0) return;
	await ctx.ui.mapRenderer.animateTileEffectPopup(tileType, amount, gridPos);
}

/**
 * カードキューをクリアする
 */
function clearCardQueue(ctx: GameContext): void {
	ctx.cardQueue = [];
}

/**
 * カード実行後にキューの継続可否を判定
 * 階段到達・ゲームオーバーの場合はキューをクリアする
 */
function shouldContinueQueue(
	ctx: GameContext,
	reachedStairs: boolean,
	gameOver: boolean,
): void {
	if (reachedStairs || gameOver) {
		clearCardQueue(ctx);
		ctx.isCardActionAnimating = false;
	}
}

/**
 * 移動カードの実行と対応するアニメーション
 */
async function handleMoveCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const prevPosition = ctx.state.player.position;
	const prevHp = ctx.state.player.hp;
	const {
		state: next,
		reachedStairs,
		tileEffect,
		gameOver,
	} = executeMove(ctx.state, cardId, direction);
	const moved =
		next.player.position.x !== prevPosition.x ||
		next.player.position.y !== prevPosition.y;
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (reachedStairs) {
		shouldContinueQueue(ctx, true, false);
		const stairsPos = {
			x: prevPosition.x + DIRECTION_DELTA[direction].x,
			y: prevPosition.y + DIRECTION_DELTA[direction].y,
		};
		await updateStateWithStairsAnimation(ctx, next, stairsPos);
	} else if (moved) {
		await updateStateWithMoveAnimation(ctx, next, next.player.position);
		if (tileEffect) {
			await showTileEffectPopup(
				ctx,
				tileEffect,
				prevHp,
				next.player.hp,
				next.player.position,
			);
		}
		if (gameOver) {
			shouldContinueQueue(ctx, false, true);
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
		await updateStateWithAttackAnimation(ctx, next, enemyId, "attack");
	} else {
		await updateStateWithMissAnimation(ctx, next, direction);
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
		await updateStateWithAttackAnimation(ctx, next, enemyId, "strong_attack");
	} else {
		await updateStateWithMissAnimation(ctx, next, direction);
	}
}

/**
 * ジャンプパーティクル（スピードライン）を発射
 */
function emitJumpParticles(
	ctx: GameContext,
	originPos: Position,
	moveAngle: number,
): void {
	const center = gridToCenterPixel(originPos);
	ctx.ui.particleSystem.emit(createJumpParticleConfig(center, moveAngle));
}

/**
 * ジャンプカードの実行と対応するアニメーション
 */
async function handleJumpCardExecution(
	ctx: GameContext,
	cardId: string,
	direction: Direction,
): Promise<void> {
	const prevPosition = ctx.state.player.position;
	const prevHp = ctx.state.player.hp;
	const result = executeJump(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;

	const delta = DIRECTION_DELTA[direction];
	const moveAngle = Math.atan2(delta.y, delta.x);

	if (!result.jumped) {
		// ジャンプ失敗: バンプアニメーション
		await updateStateWithBumpAnimation(ctx, result.state, direction);
	} else if (result.reachedStairs) {
		// 着地先が階段: ジャンプ→階段アニメーション
		shouldContinueQueue(ctx, true, false);
		const stairsPos = {
			x: prevPosition.x + delta.x * JUMP_DISTANCE,
			y: prevPosition.y + delta.y * JUMP_DISTANCE,
		};
		emitJumpParticles(ctx, prevPosition, moveAngle);
		await updateStateWithStairsAnimation(ctx, result.state, stairsPos);
	} else {
		// ジャンプ成功: 着地先へ直接移動アニメーション
		emitJumpParticles(ctx, prevPosition, moveAngle);

		await updateStateWithMoveAnimation(
			ctx,
			result.state,
			result.state.player.position,
		);
		// 着地先の特殊タイル効果
		const maxHp = result.state.player.maxHp;
		for (const { tile, position } of result.tileEffects) {
			const hpBefore = prevHp;
			let hpAfter: number;
			if (tile === "trap") {
				hpAfter = Math.max(0, hpBefore - TRAP_DAMAGE);
			} else if (tile === "rest_area") {
				hpAfter = maxHp;
			} else {
				hpAfter = Math.min(maxHp, hpBefore + TREASURE_HEAL);
			}
			await showTileEffectPopup(ctx, tile, hpBefore, hpAfter, position);
		}
		if (result.gameOver) {
			shouldContinueQueue(ctx, false, true);
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, result.state);
			});
		}
	}
}

/**
 * カードを実行する（カードタイプに応じてハンドラを呼び分ける）
 */
async function executeCard(
	ctx: GameContext,
	card: Card,
	direction?: Direction,
): Promise<void> {
	if (card.type === "wait") {
		updateState(ctx, executeWait(ctx.state, card.id));
	} else if (direction) {
		ctx.isCardActionAnimating = true;
		try {
			if (card.type === "move") {
				await handleMoveCardExecution(ctx, card.id, direction);
			} else if (card.type === "attack") {
				await handleAttackCardExecution(ctx, card.id, direction);
			} else if (card.type === "strong_attack") {
				await handleStrongAttackCardExecution(ctx, card.id, direction);
			} else if (card.type === "jump") {
				await handleJumpCardExecution(ctx, card.id, direction);
			}
		} finally {
			ctx.isCardActionAnimating = false;
		}
	}
}

/**
 * キュー内の予約カードを順次実行する
 * 各カード実行後にキャンセル条件（階段到達、ゲームオーバー、ターン変更）をチェック
 */
async function processCardQueue(ctx: GameContext): Promise<void> {
	while (ctx.cardQueue.length > 0) {
		// キャンセル条件チェック: ゲーム画面でない、またはプレイヤーターンでない場合
		if (ctx.state.screen !== "game" || ctx.state.turn !== "player") {
			clearCardQueue(ctx);
			return;
		}

		const entry = ctx.cardQueue.shift();
		if (!entry) break;

		// 予約時点と状態が変わっている可能性があるため、AP再検証
		if (ctx.state.player.ap < CARD_COST[entry.card.type]) {
			clearCardQueue(ctx);
			return;
		}

		// 手札に該当カードが存在するか検証
		if (!ctx.state.deck.hand.some((c) => c.id === entry.card.id)) {
			clearCardQueue(ctx);
			return;
		}

		await executeCard(ctx, entry.card, entry.direction);
	}
}

export function setupEventHandlers(ctx: GameContext): void {
	// 方向選択UIのコールバック設定
	ctx.ui.directionSelector.setOnDirectionSelect(async (direction) => {
		if (ctx.isAnimating) return; // アニメーション中は無効
		if (ctx.pendingCard) {
			const card = ctx.pendingCard;
			await executeCard(ctx, card, direction);
			await processCardQueue(ctx);
			return;
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
		// カードアクションアニメーション中の予約処理
		if (ctx.isCardActionAnimating) {
			// プレイヤーターン中のみ予約可能
			if (ctx.state.turn !== "player" || ctx.state.screen !== "game") {
				return false;
			}
			// 方向が必要なカードで方向が未指定の場合は予約不可
			if (card.type !== "wait" && !direction) {
				return false;
			}
			// 既に同一カードがキューに存在する場合は重複予約しない
			if (ctx.cardQueue.some((entry) => entry.card.id === card.id)) {
				return false;
			}
			// AP検証（キュー内の合計コストを考慮）
			if (!canEnqueueCard(ctx.state.player.ap, ctx.cardQueue, card)) {
				return false;
			}
			// キューに追加
			ctx.cardQueue.push({ card, direction });
			return false; // 消費アニメーションはスキップ（予約のみ）
		}

		// カードアクション以外のアニメーション中（フロア遷移等）は無効
		if (ctx.isAnimating) return false;

		// 方向が必要なカードで方向が未指定の場合は、方向選択UIを表示して処理を保留する
		if (card.type !== "wait" && !direction) {
			ctx.pendingCard = card;
			ctx.ui.directionSelector.show();
			return false;
		}

		// 通常実行フロー
		await executeCard(ctx, card, direction);

		// カード実行後にキューを消化
		await processCardQueue(ctx);
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

	ctx.ui.titleScreen.setOnDebugStartFloor(async (floor) => {
		if (ctx.isAnimating) return;
		ctx.isAnimating = true;
		try {
			const newState = startNewGameAtFloor(ctx.state, floor);
			await ctx.ui.screenTransition.fadeTransition(() => {
				applyState(ctx, newState);
				relayoutUI(ctx);
				render(ctx, true);
			});
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
		const gameArea = getGameAreaSize(ctx);
		ctx.ui.deckViewer.render(
			ctx.state.deck,
			screen.width,
			screen.height,
			gameArea,
		);
		ctx.ui.deckViewer.show();
	});

	ctx.ui.deckViewer.setOnClose(() => {
		ctx.ui.deckViewer.hide();
	});

	// デバッグモードトグルのコールバック設定
	ctx.ui.titleScreen.setOnDebugModeChange((enabled) => {
		ctx.debugMode = enabled;
	});

	// デバッグカードのコールバック設定（DEV環境限定）
	if (import.meta.env.DEV && ctx.ui.debugCardRenderer) {
		ctx.ui.debugCardRenderer.setOnCardSelect((cardType) => {
			if (ctx.isAnimating || ctx.isCardActionAnimating) return;
			if (ctx.state.screen !== "game" || ctx.state.turn !== "player") return;

			if (cardType === "debug_oneshot_kill") {
				if (ctx.state.enemies.length === 0) return;
				ctx.ui.debugTargetSelector?.showEnemySelector(
					ctx.state.enemies,
					async (enemyId) => {
						const { executeDebugOneshotKill } = await import(
							"../game/debugAction"
						);
						const next = executeDebugOneshotKill(ctx.state, enemyId);
						updateState(ctx, next);
					},
					() => {},
				);
			} else if (cardType === "debug_teleport") {
				ctx.ui.debugTargetSelector?.showTileSelector(
					ctx.state.map,
					ctx.state.enemies,
					ctx.state.player.position,
					async (pos) => {
						const { executeDebugTeleport } = await import(
							"../game/debugAction"
						);
						const result = executeDebugTeleport(ctx.state, pos);
						if (result.reachedStairs) {
							const stairsPos = pos;
							await updateStateWithStairsAnimation(
								ctx,
								result.state,
								stairsPos,
							);
						} else if (result.gameOver) {
							deleteSaveData();
							await ctx.ui.screenTransition.fadeTransition(() => {
								updateState(ctx, result.state);
							});
						} else {
							updateState(ctx, result.state);
						}
					},
					() => {},
				);
			}
		});
	}

	// 次の階層へボタンのコールバック設定
	ctx.ui.nextFloorButton.setOnNextFloor(() => {
		if (ctx.isAnimating) return;
		if (ctx.state.enemies.length > 0) return;
		// 階層遷移前に方向選択UIと入力状態をリセット
		ctx.ui.directionSelector.hide();
		ctx.pendingCard = null;
		clearCardQueue(ctx);
		void executeNextFloorTransition(ctx).catch((error) => {
			console.error("次階層ボタンの処理に失敗しました", error);
		});
	});

	// ターン終了処理
	async function handleEndTurn(): Promise<void> {
		if (ctx.isAnimating) return; // アニメーション中は無効
		// ターン終了時にキューとドラッグオフセットをクリア
		clearCardQueue(ctx);
		ctx.ui.cameraDragController.reset();
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
				// アニメーション用の初期描画は移動前の敵配置を使用する
				ctx.ui.mapRenderer.renderEnemies(enemiesBefore, next.visitedTiles);
				await ctx.ui.mapRenderer.animateEnemyMoves(enemyMoves);
				// アニメーション完了後に移動後の敵配置で再描画する
				ctx.ui.mapRenderer.renderEnemies(next.enemies, next.visitedTiles);
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
				next = startPlayerTurn(next);

				// プレイヤーターンバナー表示
				await ctx.ui.turnBanner.showBanner("player");

				applyState(ctx, next);
				render(ctx, true);

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
	}

	// ターン終了ボタンのコールバック設定
	ctx.ui.turnEndButton.setOnEndTurn(() => {
		void handleEndTurn().catch((error) => {
			console.error("ターン終了ボタンの処理に失敗しました", error);
		});
	});

	// 右クリックでターン終了
	ctx.app.canvas.addEventListener("contextmenu", (e) => {
		if (ctx.state.screen !== "game") return;
		if (ctx.state.turn !== "player") return;
		e.preventDefault();
		void handleEndTurn().catch((error) => {
			console.error("右クリックによるターン終了処理に失敗しました", error);
		});
	});

	// カメラドラッグ制御の設定
	const cameraDrag = ctx.ui.cameraDragController;
	cameraDrag.setCanDrag(
		() =>
			ctx.state.screen === "game" &&
			ctx.state.turn === "player" &&
			!ctx.isAnimating &&
			!ctx.isCardActionAnimating,
	);

	const canvas = ctx.app.canvas;
	const viewportSize = getViewportPixelSize();

	// ピンチズーム（タッチデバイス対応）
	let pinchStartDistance = 0;
	let pinchStartZoom = 1.0;
	const activeTouches = new Map<number, { x: number; y: number }>();

	canvas.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		// ピンチ中はドラッグを無効化
		if (activeTouches.size >= 2) return;

		// マップ表示領域（ビューポート）内でのみカメラドラッグを開始する
		const x = e.offsetX;
		const y = e.offsetY;
		if (
			x < 0 ||
			x > viewportSize.width ||
			y < STATUS_BAR_HEIGHT ||
			y > STATUS_BAR_HEIGHT + viewportSize.height
		) {
			return;
		}

		// ReturnToPlayerButton の矩形上ではドラッグを開始しない
		const btnContainer = ctx.ui.returnToPlayerButton.getContainer();
		if (
			btnContainer.visible &&
			x >= btnContainer.x &&
			x <= btnContainer.x + RETURN_TO_PLAYER_BUTTON_WIDTH &&
			y >= btnContainer.y &&
			y <= btnContainer.y + BUTTON_HEIGHT
		) {
			return;
		}

		const started = cameraDrag.handlePointerDown(x, y);
		if (started) {
			// canvas外でpointerupしてもイベントを受け取れるようにする
			canvas.setPointerCapture(e.pointerId);
		}
	});

	canvas.addEventListener("pointermove", (e) => {
		// ピンチ中はドラッグを無効化
		if (activeTouches.size >= 2) return;
		cameraDrag.handlePointerMove(e.offsetX, e.offsetY);
		if (cameraDrag.isCurrentlyDragging()) {
			applyCameraOffset(ctx);
		}
	});

	canvas.addEventListener("pointerup", (e) => {
		cameraDrag.handlePointerUp();
		if (canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
	});

	canvas.addEventListener("pointerleave", () => {
		cameraDrag.handlePointerUp();
	});

	/** pivot基点でズームを適用し、dragOffsetを更新する */
	const applyZoomAtPoint = (
		pivot: Position,
		newZoom: number,
		oldZoom: number,
	) => {
		const mapWidth = ctx.state.map[0]?.length ?? 0;
		const mapHeight = ctx.state.map.length;
		const oldBase = calculateCameraOffset(
			ctx.state.player.position,
			mapWidth,
			mapHeight,
			oldZoom,
		);
		const oldDrag = cameraDrag.getDragOffset();
		const posBefore = clampCameraOffset(
			oldBase,
			oldDrag,
			mapWidth,
			mapHeight,
			oldZoom,
		);

		cameraDrag.setZoomLevel(newZoom);

		const ratio = newZoom / oldZoom;
		const desiredTotal = {
			x: pivot.x - (pivot.x - posBefore.x) * ratio,
			y: pivot.y - (pivot.y - posBefore.y) * ratio,
		};
		const newBase = calculateCameraOffset(
			ctx.state.player.position,
			mapWidth,
			mapHeight,
			newZoom,
		);
		cameraDrag.setDragOffset({
			x: desiredTotal.x - newBase.x,
			y: desiredTotal.y - newBase.y,
		});

		applyCameraOffset(ctx);
	};

	// マウスホイールによるカメラズーム
	canvas.addEventListener(
		"wheel",
		(e) => {
			if (!cameraDrag.canInteract()) return;

			const x = e.offsetX;
			const y = e.offsetY;
			if (
				x < 0 ||
				x > viewportSize.width ||
				y < STATUS_BAR_HEIGHT ||
				y > STATUS_BAR_HEIGHT + viewportSize.height
			) {
				return;
			}

			if (e.deltaY === 0) return;

			const oldZoom = cameraDrag.getZoomLevel();
			const direction = e.deltaY > 0 ? -1 : 1;
			const newZoom = Math.max(
				ZOOM_MIN,
				Math.min(ZOOM_MAX, oldZoom + direction * ZOOM_WHEEL_STEP),
			);
			if (newZoom === oldZoom) return;

			e.preventDefault();

			applyZoomAtPoint({ x, y: y - STATUS_BAR_HEIGHT }, newZoom, oldZoom);
		},
		{ passive: false },
	);

	canvas.addEventListener(
		"touchstart",
		(e) => {
			const rect = canvas.getBoundingClientRect();
			for (const touch of e.changedTouches) {
				activeTouches.set(touch.identifier, {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				});
			}
			if (activeTouches.size === 2 && cameraDrag.canInteract()) {
				e.preventDefault();
				const touches = [...activeTouches.values()];
				pinchStartDistance = Math.hypot(
					touches[1].x - touches[0].x,
					touches[1].y - touches[0].y,
				);
				pinchStartZoom = cameraDrag.getZoomLevel();
			}
		},
		{ passive: false },
	);

	canvas.addEventListener(
		"touchmove",
		(e) => {
			const rect = canvas.getBoundingClientRect();
			for (const touch of e.changedTouches) {
				activeTouches.set(touch.identifier, {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				});
			}
			if (
				activeTouches.size === 2 &&
				pinchStartDistance > 0 &&
				cameraDrag.canInteract()
			) {
				e.preventDefault();
				const touches = [...activeTouches.values()];
				const currentDistance = Math.hypot(
					touches[1].x - touches[0].x,
					touches[1].y - touches[0].y,
				);
				const targetZoom = Math.max(
					ZOOM_MIN,
					Math.min(
						ZOOM_MAX,
						pinchStartZoom * (currentDistance / pinchStartDistance),
					),
				);
				const oldZoom = cameraDrag.getZoomLevel();
				if (targetZoom === oldZoom) return;

				const centerX = (touches[0].x + touches[1].x) / 2;
				const centerY = (touches[0].y + touches[1].y) / 2 - STATUS_BAR_HEIGHT;

				if (
					centerX >= 0 &&
					centerX <= viewportSize.width &&
					centerY >= 0 &&
					centerY <= viewportSize.height
				) {
					applyZoomAtPoint({ x: centerX, y: centerY }, targetZoom, oldZoom);
				}
			}
		},
		{ passive: false },
	);

	canvas.addEventListener("touchend", (e) => {
		for (const touch of e.changedTouches) {
			activeTouches.delete(touch.identifier);
		}
		if (activeTouches.size < 2) {
			pinchStartDistance = 0;
		}
	});

	canvas.addEventListener("touchcancel", (e) => {
		for (const touch of e.changedTouches) {
			activeTouches.delete(touch.identifier);
		}
		if (activeTouches.size < 2) {
			pinchStartDistance = 0;
		}
	});

	// 「プレイヤーへ戻る」ボタンのコールバック設定
	ctx.ui.returnToPlayerButton.setOnClick(() => {
		if (ctx.state.screen !== "game") return;
		cameraDrag.reset();
		renderGameScreen(ctx);
	});
}
