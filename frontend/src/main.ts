import { Application } from "pixi.js";
import {
	COLORS,
	ENEMY_ATTACK_DAMAGE,
	LOG_AREA_GAP,
	LOG_AREA_WIDTH,
	PLAYER_ATTACK_DAMAGE,
	STATUS_BAR_HEIGHT,
} from "./constants";
import {
	createTitleScreenState,
	endPlayerTurn,
	executeAttack,
	executeEnemyTurn,
	executeMove,
	executeWait,
	returnToTitle,
	startNewGame,
	startPlayerTurn,
} from "./game";
import type { GameContext, UIComponents } from "./gameContext";
import type { Direction, GameState, Position } from "./types";
import { DIRECTION_DELTA } from "./types";
import {
	ActionLogRenderer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
	getMapPixelSize,
	HandRenderer,
	MapRenderer,
	ScreenTransition,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
} from "./ui";
import { detectEnemyMoves } from "./ui/enemyMoveDetector";
import {
	applyState,
	render,
	renderGameScreen,
	updateState,
} from "./ui/gameRenderer";
import {
	BUTTON_BOTTOM_MARGIN,
	BUTTON_HEIGHT,
	HAND_AREA_HEIGHT,
	HAND_AREA_TOP_PADDING,
} from "./ui/layout";
import { deleteSaveData, hasSaveData, loadGame } from "./utils/storage";

/** アプリケーションコンテキスト */
let ctx: GameContext;

/**
 * ゲーム状態を更新してプレイヤー移動アニメーション付きで再描画
 * @param newState 新しいゲーム状態
 * @param targetGridPos 移動先のグリッド座標
 */
async function updateStateWithMoveAnimation(
	newState: GameState,
	targetGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	applyState(ctx, newState);

	try {
		// プレイヤー以外を描画
		render(ctx, false, true);

		// プレイヤー移動アニメーション（AP変化があればバーアニメーションも並列実行）
		const animations: Promise<void>[] = [
			ctx.ui.mapRenderer.animatePlayerMove(targetGridPos),
		];
		if (prevAp !== newState.player.ap) {
			animations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(animations);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 階段への移動アニメーション後に階層遷移する
 * @param newState 階層遷移後のゲーム状態
 * @param stairsGridPos 階段のグリッド座標
 */
async function updateStateWithStairsAnimation(
	newState: GameState,
	stairsGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	try {
		// 1. 現在のマップ上で階段マスへ移動アニメーション
		await ctx.ui.mapRenderer.animatePlayerMove(stairsGridPos);

		// 2. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(newState.floor);
			applyState(ctx, newState);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 3. フェードイン後に手札配布アニメーション
		await ctx.ui.handRenderer.renderWithAnimation(
			ctx.state.deck.hand,
			ctx.state.player.ap,
			newState.deck.hand.length,
		);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 壁にぶつかった時のバンプアニメーション付きで状態を更新
 * @param newState 新しいゲーム状態
 * @param direction ぶつかった方向
 */
async function updateStateWithBumpAnimation(
	newState: GameState,
	direction: Direction,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	applyState(ctx, newState);

	try {
		render(ctx, false, true);

		const animations: Promise<void>[] = [
			ctx.ui.mapRenderer.animatePlayerBump(direction),
		];
		if (prevAp !== newState.player.ap) {
			animations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(animations);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * プレイヤー攻撃ヒット時のアニメーション付きで状態を更新
 * @param newState 新しいゲーム状態
 * @param hitEnemyId ヒットした敵のID
 */
async function updateStateWithAttackAnimation(
	newState: GameState,
	hitEnemyId: string,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	const defeated = !newState.enemies.some((e) => e.id === hitEnemyId);
	applyState(ctx, newState);

	try {
		// 撃破時は敵の再描画をスキップ（アニメーション用にGraphicsを保持）
		render(ctx, false, false, defeated);

		// ヒットエフェクト（AP変化があればバーアニメーションも並列実行）
		const hitAnimations: Promise<void>[] = [
			ctx.ui.mapRenderer.animateAttackHit(hitEnemyId, PLAYER_ATTACK_DAMAGE),
		];
		if (prevAp !== newState.player.ap) {
			hitAnimations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(hitAnimations);

		// 撃破演出
		if (defeated) {
			await ctx.ui.mapRenderer.animateEnemyDefeat(hitEnemyId);
			// 撃破後、敵描画を反映
			render(ctx);
		}
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * UIコンポーネントを初期化してステージに追加
 */
function initializeUIComponents(
	app: Application,
	mapSize: { width: number; height: number },
	totalHeight: number,
): UIComponents {
	const titleScreen = new TitleScreen();
	app.stage.addChild(titleScreen.getContainer());

	const gameOverScreen = new GameOverScreen();
	app.stage.addChild(gameOverScreen.getContainer());

	const statusBar = new StatusBar();
	app.stage.addChild(statusBar.getContainer());

	const mapRenderer = new MapRenderer();
	const mapContainer = mapRenderer.getContainer();
	mapContainer.y = STATUS_BAR_HEIGHT;
	app.stage.addChild(mapContainer);

	const handRenderer = new HandRenderer();
	const handContainer = handRenderer.getContainer();
	handContainer.x = mapSize.width / 2;
	handContainer.y = STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(handContainer);

	const turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x = mapSize.width - 136;
	turnEndContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(turnEndContainer);

	const actionLogRenderer = new ActionLogRenderer(totalHeight);
	const logContainer = actionLogRenderer.getContainer();
	logContainer.x = mapSize.width + LOG_AREA_GAP;
	logContainer.y = 0;
	app.stage.addChild(logContainer);

	const turnBanner = new TurnBanner(
		mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth(),
		totalHeight,
	);
	app.stage.addChild(turnBanner.getContainer());

	const directionSelector = new DirectionSelector();
	const directionContainer = directionSelector.getContainer();
	directionContainer.x = mapSize.width / 2;
	directionContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(directionContainer);

	const totalWidth =
		mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
	const screenTransition = new ScreenTransition(totalWidth, totalHeight);
	app.stage.addChild(screenTransition.getContainer());

	const floorBanner = new FloorBanner(totalWidth, totalHeight);
	screenTransition.getContainer().addChild(floorBanner.getContainer());

	return {
		titleScreen,
		gameOverScreen,
		statusBar,
		mapRenderer,
		handRenderer,
		directionSelector,
		turnEndButton,
		actionLogRenderer,
		turnBanner,
		screenTransition,
		floorBanner,
	};
}

/**
 * 移動カードの実行と対応するアニメーション
 */
async function handleMoveCardExecution(
	cardId: string,
	direction: Direction,
): Promise<void> {
	const prevPosition = ctx.state.player.position;
	const prevFloor = ctx.state.floor;
	const next = executeMove(ctx.state, cardId, direction);
	const moved =
		next.player.position.x !== prevPosition.x ||
		next.player.position.y !== prevPosition.y;
	ctx.ui.directionSelector.hide();
	ctx.pendingCard = null;
	if (next.floor !== prevFloor) {
		const stairsPos = {
			x: prevPosition.x + DIRECTION_DELTA[direction].x,
			y: prevPosition.y + DIRECTION_DELTA[direction].y,
		};
		await updateStateWithStairsAnimation(next, stairsPos);
	} else if (moved) {
		await updateStateWithMoveAnimation(next, next.player.position);
	} else {
		await updateStateWithBumpAnimation(next, direction);
	}
}

/**
 * 攻撃カードの実行と対応するアニメーション
 */
async function handleAttackCardExecution(
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
		await updateStateWithAttackAnimation(next, enemyId);
	} else {
		updateState(ctx, next);
	}
}

/**
 * イベントハンドラを設定
 */
function setupEventHandlers(
	mapSize: { width: number; height: number },
	totalHeight: number,
): void {
	// 方向選択UIのコールバック設定
	ctx.ui.directionSelector.setOnDirectionSelect(async (direction) => {
		if (ctx.isAnimating) return; // アニメーション中は無効
		if (ctx.pendingCard) {
			if (ctx.pendingCard.type === "move") {
				await handleMoveCardExecution(ctx.pendingCard.id, direction);
				return;
			}
			if (ctx.pendingCard.type === "attack") {
				await handleAttackCardExecution(ctx.pendingCard.id, direction);
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
		if (ctx.isAnimating) return; // アニメーション中は無効
		if (card.type === "wait") {
			updateState(ctx, executeWait(ctx.state, card.id));
		} else if (direction) {
			// 方向が指定されている場合は即座に実行
			if (card.type === "move") {
				await handleMoveCardExecution(card.id, direction);
			} else if (card.type === "attack") {
				await handleAttackCardExecution(card.id, direction);
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
				});
			} finally {
				ctx.isAnimating = false;
			}
		} else {
			alert("セーブデータの読み込みに失敗しました。");
			const totalWidth =
				mapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
			ctx.ui.titleScreen.render(totalWidth, totalHeight, hasSaveData());
		}
	});

	// ゲームオーバー画面のコールバック設定
	ctx.ui.gameOverScreen.setOnReturnToTitle(async () => {
		if (ctx.isAnimating) return;
		ctx.isAnimating = true;
		try {
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, returnToTitle(ctx.state));
				const totalWidth =
					mapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
				ctx.ui.titleScreen.render(totalWidth, totalHeight, hasSaveData());
			});
		} finally {
			ctx.isAnimating = false;
		}
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
			const { state: enemyTurnState, attackCount } = executeEnemyTurn(next);
			next = enemyTurnState;
			const enemyMoves = detectEnemyMoves(enemiesBefore, next.enemies);
			const playerWasAttacked = attackCount > 0;

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
					ctx.ui.mapRenderer.animateEnemyAttackHit(
						ENEMY_ATTACK_DAMAGE * attackCount,
					),
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
	});
}

/**
 * デバッグ用のグローバル変数を設定
 */
function setupDebugGlobals(): void {
	const debugWindow = window as unknown as {
		gameState: GameState;
		updateState: typeof updateState;
		debugLog: boolean;
	};
	debugWindow.gameState = ctx.state;
	debugWindow.updateState = updateState;
	Object.defineProperty(debugWindow, "debugLog", {
		get: () => ctx.debugLog,
		set: (v: boolean) => {
			ctx.debugLog = v;
		},
	});
}

async function main() {
	const app = new Application();
	const mapSize = getMapPixelSize();
	const totalHeight = mapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;

	await app.init({
		width: mapSize.width + LOG_AREA_GAP + LOG_AREA_WIDTH,
		height: totalHeight,
		backgroundColor: COLORS.background,
	});

	document.body.appendChild(app.canvas);

	// コンテキスト初期化
	ctx = {
		state: createTitleScreenState(),
		isAnimating: false,
		pendingCard: null,
		debugLog: import.meta.env.DEV,
		ui: initializeUIComponents(app, mapSize, totalHeight),
	};

	// イベントハンドラの設定
	setupEventHandlers(mapSize, totalHeight);

	// タイトル画面を描画
	const totalWidth =
		mapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
	ctx.ui.titleScreen.render(totalWidth, totalHeight, hasSaveData());
	render(ctx);

	// デバッグ用グローバル変数の設定
	setupDebugGlobals();
}

main().catch((error) => {
	console.error("アプリケーションの初期化に失敗しました:", error);
	alert(
		"アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。",
	);
});
