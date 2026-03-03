/**
 * イベントハンドラ設定
 */

import { JUMP_DISTANCE } from "../constants";
import {
	endPlayerTurn,
	executeAttack,
	executeJump,
	executeMove,
	executeStrongAttack,
	executeWait,
	returnToTitle,
	startNewGame,
	startNewGameAtFloor,
	startPlayerTurn,
} from "../game";
import { buildQueuedCardIndexMap, canEnqueueCard } from "../game/cardQueue";
import { getComboBonus } from "../game/combo";
import { resetDebugCheats } from "../game/debugCheats";
import {
	applyTileEffectWithDebug,
	executeEnemyTurnWithDebug,
} from "../game/debugMiddleware";
import { reorderHand } from "../game/deck";
import { endSession, startSession } from "../game/playStats";
import { buildResultData } from "../game/resultBuilder";
import { setDeck } from "../game/state";
import type { GameContext } from "../gameContext";
import type {
	Card,
	ComboType,
	Direction,
	Position,
	SpecialTileType,
} from "../types";
import { DIRECTION_DELTA } from "../types";
import {
	clearPlaySessions,
	loadPlaySessions,
	savePlaySession,
} from "../utils/statsStorage";
import { deleteSaveData, hasSaveData, loadGame } from "../utils/storage";
import {
	createChainComboParticleConfig,
	createChargeComboParticleConfig,
	createHealParticleConfig,
	createJumpParticleConfig,
	createTrapDamageParticleConfig,
} from "./battleParticles";
import { setupCameraControls } from "./cameraControls";
import { animateComboPopup } from "./comboPopup";
import { gridToParticlePosition } from "./coordinates";
import { detectEnemyMoves } from "./enemyMoveDetector";
import { executeExchangeFlow } from "./exchangeFlow";
import {
	executeNextFloorTransition,
	updateStateWithStairsAnimation,
} from "./floorTransition";
import {
	getScreenSize,
	updateStateWithAttackAnimation,
	updateStateWithBumpAnimation,
	updateStateWithMissAnimation,
	updateStateWithMoveAnimation,
} from "./gameAnimations";
import {
	applyState,
	render,
	renderGameScreen,
	updateState,
} from "./gameRenderer";
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

	const particleOrigin = gridToParticlePosition(
		gridPos,
		ctx.ui.mapRenderer.getContainer(),
		ctx.ui.particleSystem.getContainer(),
	);
	const particleConfig =
		tileType === "trap"
			? createTrapDamageParticleConfig(particleOrigin)
			: createHealParticleConfig(particleOrigin);

	await Promise.all([
		ctx.ui.mapRenderer.animateTileEffectPopup(tileType, amount, gridPos),
		ctx.ui.particleSystem.emit(particleConfig),
	]);
}

/**
 * カードキューをクリアする
 */
function clearCardQueue(ctx: GameContext): void {
	ctx.cardQueue = [];
	ctx.ui.handRenderer.setQueuedCards(new Map());
	ctx.ui.handRenderer.setComboHistory(ctx.state.comboHistory);
	ctx.ui.handRenderer.setUsedCardIds(new Set(ctx.state.deck.usedCardIds));
	ctx.ui.handRenderer.render(ctx.state.deck.hand);
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
		bodySlam,
	} = executeMove(ctx.state, cardId, direction, {
		applyTileEffectFn: applyTileEffectWithDebug,
	});
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
			ctx.resultData = buildResultData(next, "death");
			const session = endSession("death", "trap");
			if (session) savePlaySession(session);
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, next);
			});
		}
	} else if (bodySlam) {
		if (gameOver) {
			// gameOver時もバンプ/HP演出中はゲーム画面を維持（暗転後に切り替え）
			shouldContinueQueue(ctx, false, true);
			ctx.isAnimating = true;
			ctx.ui.cameraDragController.reset(false);
			applyState(ctx, next);
			renderGameScreen(ctx, false, true);
			try {
				await ctx.ui.mapRenderer.animatePlayerBump(direction);
			} finally {
				ctx.isAnimating = false;
			}
			await ctx.ui.statusBar.animateHpChange(
				prevHp,
				next.player.hp,
				next.player.maxHp,
				(ratio) => ctx.ui.mapRenderer.updatePlayerHpGauge(ratio),
			);
			ctx.resultData = buildResultData(next, "death");
			const session = endSession("death", "body_slam");
			if (session) savePlaySession(session);
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, next);
			});
		} else {
			await updateStateWithBumpAnimation(ctx, next, direction);
			await ctx.ui.statusBar.animateHpChange(
				prevHp,
				next.player.hp,
				next.player.maxHp,
				(ratio) => ctx.ui.mapRenderer.updatePlayerHpGauge(ratio),
			);
			// カードドロップがある場合、交換UIを順次表示
			let currentState = next;
			while (currentState.cardExchangeQueue.length > 0) {
				currentState = await executeExchangeFlow(ctx, currentState);
				applyState(ctx, currentState);
				render(ctx);
			}
		}
	} else {
		await updateStateWithBumpAnimation(ctx, next, direction);
	}
}

/**
 * コンボ発動時の演出（ポップアップ + パーティクル）を発火
 * 攻撃アニメーションと並列で実行するためPromiseを返す
 */
function emitComboEffects(
	ctx: GameContext,
	comboType: ComboType,
): Promise<void> {
	const playerPos = ctx.state.player.position;
	const mapContainer = ctx.ui.mapRenderer.getContainer();

	// ポップアップ（マップコンテナ上）
	const popupPromise = animateComboPopup(mapContainer, playerPos, comboType);

	// パーティクル
	const particleOrigin = gridToParticlePosition(
		playerPos,
		mapContainer,
		ctx.ui.particleSystem.getContainer(),
	);
	const particleConfig =
		comboType === "charge"
			? createChargeComboParticleConfig(particleOrigin)
			: createChainComboParticleConfig(particleOrigin);
	const particlePromise = ctx.ui.particleSystem.emit(particleConfig);

	return Promise.all([popupPromise, particlePromise]).then(() => {});
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
		overkill,
		comboType,
		levelBonus,
	} = executeAttack(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;

	// コンボ演出（攻撃アニメーションと並列で発火、awaitしない）
	const comboEffectPromise = comboType
		? emitComboEffects(ctx, comboType)
		: undefined;

	if (hit && enemyId) {
		const comboBonus = comboType ? getComboBonus(comboType) : 0;
		await updateStateWithAttackAnimation(ctx, next, enemyId, "attack", {
			overkill,
			comboBonus,
			levelBonus,
		});
	} else {
		await updateStateWithMissAnimation(ctx, next, direction);
	}

	// コンボ演出の完了を待機
	await comboEffectPromise;
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
		overkill,
		levelBonus,
	} = executeStrongAttack(ctx.state, cardId, direction);
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (hit && enemyId) {
		await updateStateWithAttackAnimation(ctx, next, enemyId, "strong_attack", {
			overkill,
			levelBonus,
		});
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
	const center = gridToParticlePosition(
		originPos,
		ctx.ui.mapRenderer.getContainer(),
		ctx.ui.particleSystem.getContainer(),
	);
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
	const result = executeJump(ctx.state, cardId, direction, {
		applyTileEffectFn: applyTileEffectWithDebug,
	});
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
		for (const { tile, position, hpBefore, hpAfter } of result.tileEffects) {
			await showTileEffectPopup(ctx, tile, hpBefore, hpAfter, position);
		}
		if (result.gameOver) {
			shouldContinueQueue(ctx, false, true);
			ctx.resultData = buildResultData(result.state, "death");
			const session = endSession("death", "trap");
			if (session) savePlaySession(session);
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
		ctx.ui.handRenderer.setQueuedCards(buildQueuedCardIndexMap(ctx.cardQueue));

		// 手札に該当カードが存在し、使用済みでないか検証
		if (
			!ctx.state.deck.hand.some((c) => c.id === entry.card.id) ||
			ctx.state.deck.usedCardIds.includes(entry.card.id)
		) {
			clearCardQueue(ctx);
			return;
		}

		await executeCard(ctx, entry.card, entry.direction);
	}
}

let escKeyListenerRegistered = false;

export function setupEventHandlers(ctx: GameContext): void {
	// Escキーでカードキューをクリア（重複登録を防止）
	if (!escKeyListenerRegistered) {
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && ctx.cardQueue.length > 0) {
				clearCardQueue(ctx);
			}
		});
		escKeyListenerRegistered = true;
	}

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

	// 手札並べ替えのコールバック設定
	ctx.ui.handRenderer.setOnReorder((fromIndex, toIndex) => {
		const newDeck = reorderHand(ctx.state.deck, fromIndex, toIndex);
		updateState(ctx, setDeck(ctx.state, newDeck));
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
			// 使用済み・重複カード検証
			if (!canEnqueueCard(ctx.cardQueue, card, ctx.state.deck)) {
				return false;
			}
			// キューに追加
			ctx.cardQueue.push({ card, direction });
			ctx.ui.handRenderer.setQueuedCards(
				buildQueuedCardIndexMap(ctx.cardQueue),
			);
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
		startSession();
		try {
			const newState = startNewGame(ctx.state);
			await ctx.ui.screenTransition.fadeTransition(() => {
				applyState(ctx, newState);
				relayoutUI(ctx);
				render(ctx);
			});
		} finally {
			ctx.isAnimating = false;
		}
	});

	ctx.ui.titleScreen.setOnDebugStartFloor(async (floor) => {
		if (ctx.isAnimating) return;
		ctx.isAnimating = true;
		startSession(floor);
		try {
			const newState = startNewGameAtFloor(ctx.state, floor);
			await ctx.ui.screenTransition.fadeTransition(() => {
				applyState(ctx, newState);
				relayoutUI(ctx);
				render(ctx);
			});
		} finally {
			ctx.isAnimating = false;
		}
	});

	ctx.ui.titleScreen.setOnContinue(async () => {
		if (ctx.isAnimating) return;
		const savedState = loadGame();
		if (savedState) {
			ctx.isAnimating = true;
			startSession(savedState.floor);
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

	// リザルト画面のコールバック設定
	ctx.ui.resultScreen.setOnReturnToTitle(async () => {
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

	// 統計画面のコールバック設定
	ctx.ui.titleScreen.setOnStats(() => {
		if (ctx.isAnimating) return;
		const sessions = loadPlaySessions();
		const screen = getScreenSize(ctx);
		ctx.ui.statsScreen.render(sessions, screen.width, screen.height);
		ctx.ui.statsScreen.show();
	});

	ctx.ui.statsScreen.setOnClose(() => {
		ctx.ui.statsScreen.hide();
	});

	ctx.ui.statsScreen.setOnReset(() => {
		const confirmed = window.confirm(
			"プレイ統計データをすべてリセットしますか？",
		);
		if (confirmed) {
			clearPlaySessions();
			const sessions = loadPlaySessions();
			const screen = getScreenSize(ctx);
			ctx.ui.statsScreen.render(sessions, screen.width, screen.height);
		}
	});

	// デバッグモードトグルのコールバック設定
	ctx.ui.titleScreen.setOnDebugModeChange((enabled) => {
		ctx.debugMode = enabled;
		if (!enabled) {
			resetDebugCheats();
		}
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
							ctx.resultData = buildResultData(result.state, "death");
							const session = endSession("death", "unknown");
							if (session) savePlaySession(session);
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

	// デバッグチートパネルのコールバック設定（DEV環境限定）
	if (import.meta.env.DEV && ctx.ui.debugCheatPanel) {
		ctx.ui.debugCheatPanel.setOnToggle(() => {
			render(ctx);
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
		// ターン終了時にキューとドラッグオフセットをクリア（ズームは維持）
		clearCardQueue(ctx);
		ctx.ui.cameraDragController.reset(false);
		ctx.isAnimating = true;

		try {
			let next = endPlayerTurn(ctx.state);

			// 敵ターン状態を即座に反映（StatusBar/TurnEndButtonに反映）
			applyState(ctx, next);
			ctx.ui.statusBar.render(ctx.state.floor, ctx.state.isCleared);
			ctx.ui.turnEndButton.render(ctx.state.turn);

			// 敵ターンバナー表示
			await ctx.ui.turnBanner.showBanner("enemy");

			const enemiesBefore = next.enemies;
			const { state: enemyTurnState, totalDamage } =
				executeEnemyTurnWithDebug(next);
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
						(ratio) => ctx.ui.mapRenderer.updatePlayerHpGauge(ratio),
					),
				]);
			}

			if (next.screen !== "gameOver") {
				next = startPlayerTurn(next);

				// バナー表示前にターン状態を反映（StatusBar/TurnEndButtonに即座に反映）
				applyState(ctx, next);
				ctx.ui.statusBar.render(ctx.state.floor, ctx.state.isCleared);
				ctx.ui.turnEndButton.render(ctx.state.turn);

				// プレイヤーターンバナー表示
				await ctx.ui.turnBanner.showBanner("player");

				render(ctx);
			} else {
				ctx.resultData = buildResultData(next, "death");
				const session = endSession(
					"death",
					"enemy_attack",
					next.lastAttackerEnemyType ?? undefined,
				);
				if (session) savePlaySession(session);
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

	// カメラドラッグ・ピンチズーム制御の設定
	setupCameraControls(ctx);
}
