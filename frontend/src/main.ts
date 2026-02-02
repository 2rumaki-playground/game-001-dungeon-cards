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
import type { Card, Direction, GameState, Position } from "./types";
import { DIRECTION_DELTA } from "./types";
import {
	ActionLogRenderer,
	DirectionSelector,
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
import { deleteSaveData, hasSaveData, loadGame } from "./utils/storage";

/** 手札エリアの高さ */
const HAND_AREA_HEIGHT = 200;

/** 手札エリア上部のパディング */
const HAND_AREA_TOP_PADDING = 20;

/** ターン終了ボタンの高さ */
const BUTTON_HEIGHT = 36;

/** ターン終了ボタン下部のマージン */
const BUTTON_BOTTOM_MARGIN = 12;

/** 現在のゲーム状態 */
let gameState: GameState;

/** タイトル画面 */
let titleScreen: TitleScreen;

/** ゲームオーバー画面 */
let gameOverScreen: GameOverScreen;

/** ステータスバー */
let statusBar: StatusBar;

/** マップレンダラー */
let mapRenderer: MapRenderer;

/** 手札レンダラー */
let handRenderer: HandRenderer;

/** 方向選択UI */
let directionSelector: DirectionSelector;

/** ターン終了ボタン */
let turnEndButton: TurnEndButton;

/** 行動ログレンダラー */
let actionLogRenderer: ActionLogRenderer;

/** ターンバナー */
let turnBanner: TurnBanner;

/** 画面遷移トランジション */
let screenTransition: ScreenTransition;

/** 方向選択待ちのカード */
let pendingCard: Card | null = null;

/** アニメーション中フラグ（UI操作を無効化） */
let isAnimating = false;

/** デバッグログの有効/無効（コンソールから切替可能） */
let debugLog = import.meta.env.DEV;

/**
 * 行動ログの差分を出力してゲーム状態を反映する
 * @param newState 新しいゲーム状態
 */
function applyState(newState: GameState): void {
	if (debugLog) {
		const newEntries = newState.actionLog.length - gameState.actionLog.length;
		for (let i = newEntries - 1; i >= 0; i--) {
			console.log(`[行動ログ] ${newState.actionLog[i].message}`);
		}
	}
	gameState = newState;
}

/**
 * ゲーム状態を更新して再描画
 */
function updateState(newState: GameState): void {
	applyState(newState);
	render();
}

/**
 * タイトル画面の描画
 */
function renderTitleScreen(): void {
	titleScreen.show();
	gameOverScreen.hide();
	statusBar.hide();
	turnEndButton.hide();
	actionLogRenderer.hide();
	mapRenderer.clear();
	handRenderer.clear();
}

/**
 * ゲーム画面の描画
 * @param skipHand trueの場合、手札描画をスキップ（アニメーション中に使用）
 * @param skipPlayer trueの場合、プレイヤー描画をスキップ（移動アニメーション中に使用）
 * @param skipEnemies trueの場合、敵描画をスキップ（敵移動アニメーション中に使用）
 */
function renderGameScreen(
	skipHand = false,
	skipPlayer = false,
	skipEnemies = false,
): void {
	titleScreen.hide();
	gameOverScreen.hide();
	statusBar.show();
	statusBar.render(gameState.player, gameState.floor);
	mapRenderer.render(
		gameState.map,
		gameState.player,
		gameState.enemies,
		skipPlayer,
		skipEnemies,
	);
	if (!skipHand) {
		handRenderer.render(gameState.deck.hand, gameState.player.ap);
	}
	turnEndButton.show();
	turnEndButton.render(gameState.turn);
	actionLogRenderer.show();
	actionLogRenderer.render(gameState.actionLog);
}

/**
 * ゲームオーバー画面の描画
 */
function renderGameOverScreen(): void {
	titleScreen.hide();
	statusBar.hide();
	turnEndButton.hide();
	actionLogRenderer.hide();
	mapRenderer.clear();
	handRenderer.clear();
	const size = getMapPixelSize();
	const width = size.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
	const height = size.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;
	gameOverScreen.render(gameState.floor, width, height);
	gameOverScreen.show();
}

/**
 * 画面に応じた描画
 * @param skipHand trueの場合、手札描画をスキップ
 * @param skipPlayer trueの場合、プレイヤー描画をスキップ
 * @param skipEnemies trueの場合、敵描画をスキップ
 */
function render(
	skipHand = false,
	skipPlayer = false,
	skipEnemies = false,
): void {
	switch (gameState.screen) {
		case "title":
			renderTitleScreen();
			break;
		case "game":
			renderGameScreen(skipHand, skipPlayer, skipEnemies);
			break;
		case "gameOver":
			renderGameOverScreen();
			break;
	}
}

/**
 * ゲーム状態を更新してプレイヤー移動アニメーション付きで再描画
 * @param newState 新しいゲーム状態
 * @param targetGridPos 移動先のグリッド座標
 */
async function updateStateWithMoveAnimation(
	newState: GameState,
	targetGridPos: Position,
): Promise<void> {
	if (isAnimating) return;
	isAnimating = true;

	applyState(newState);

	try {
		// プレイヤー以外を描画
		render(false, true);
		// プレイヤー移動アニメーション
		await mapRenderer.animatePlayerMove(targetGridPos);
	} finally {
		isAnimating = false;
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
	if (isAnimating) return;
	isAnimating = true;

	try {
		// 1. 現在のマップ上で階段マスへ移動アニメーション
		await mapRenderer.animatePlayerMove(stairsGridPos);

		// 2. 状態を新しい階層に更新
		applyState(newState);

		// 3. 新しい階層を描画（手札なし）して手札配布アニメーション
		render(true);
		await handRenderer.renderWithAnimation(
			gameState.deck.hand,
			gameState.player.ap,
			newState.deck.hand.length,
		);
	} finally {
		isAnimating = false;
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
	if (isAnimating) return;
	isAnimating = true;

	applyState(newState);

	try {
		render(false, true);
		await mapRenderer.animatePlayerBump(direction);
	} finally {
		isAnimating = false;
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
	if (isAnimating) return;
	isAnimating = true;

	const defeated = !newState.enemies.some((e) => e.id === hitEnemyId);
	applyState(newState);

	try {
		// 撃破時は敵の再描画をスキップ（アニメーション用にGraphicsを保持）
		render(false, false, defeated);

		// ヒットエフェクト
		await mapRenderer.animateAttackHit(hitEnemyId, PLAYER_ATTACK_DAMAGE);

		// 撃破演出
		if (defeated) {
			await mapRenderer.animateEnemyDefeat(hitEnemyId);
			// 撃破後、敵描画を反映
			render();
		}
	} finally {
		isAnimating = false;
	}
}

/**
 * UIコンポーネントを初期化してステージに追加
 */
function initializeUIComponents(
	app: Application,
	mapSize: { width: number; height: number },
	totalHeight: number,
): void {
	// タイトル画面を初期化
	titleScreen = new TitleScreen();
	app.stage.addChild(titleScreen.getContainer());

	// ゲームオーバー画面を初期化
	gameOverScreen = new GameOverScreen();
	app.stage.addChild(gameOverScreen.getContainer());

	// ステータスバーを初期化
	statusBar = new StatusBar();
	app.stage.addChild(statusBar.getContainer());

	// マップレンダラーを初期化
	mapRenderer = new MapRenderer();
	const mapContainer = mapRenderer.getContainer();
	mapContainer.y = STATUS_BAR_HEIGHT;
	app.stage.addChild(mapContainer);

	// 手札レンダラーを初期化
	handRenderer = new HandRenderer();
	const handContainer = handRenderer.getContainer();
	handContainer.x = mapSize.width / 2;
	handContainer.y = STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(handContainer);

	// ターン終了ボタンを初期化
	turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x = mapSize.width - 136;
	turnEndContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(turnEndContainer);

	// 行動ログレンダラーを初期化
	actionLogRenderer = new ActionLogRenderer(totalHeight);
	const logContainer = actionLogRenderer.getContainer();
	logContainer.x = mapSize.width + LOG_AREA_GAP;
	logContainer.y = 0;
	app.stage.addChild(logContainer);

	// ターンバナーを初期化（最前面に表示）
	turnBanner = new TurnBanner(
		mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth(),
		totalHeight,
	);
	app.stage.addChild(turnBanner.getContainer());

	// 方向選択UIを初期化
	directionSelector = new DirectionSelector();
	const directionContainer = directionSelector.getContainer();
	directionContainer.x = mapSize.width / 2;
	directionContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(directionContainer);

	// 画面遷移トランジションを初期化（最前面に配置）
	screenTransition = new ScreenTransition(
		mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth(),
		totalHeight,
	);
	app.stage.addChild(screenTransition.getContainer());
}

/**
 * イベントハンドラを設定
 */
function setupEventHandlers(
	mapSize: { width: number; height: number },
	totalHeight: number,
): void {
	// 方向選択UIのコールバック設定
	directionSelector.setOnDirectionSelect(async (direction) => {
		if (isAnimating) return; // アニメーション中は無効
		if (pendingCard) {
			if (pendingCard.type === "move") {
				const prevPosition = gameState.player.position;
				const prevFloor = gameState.floor;
				const next = executeMove(gameState, pendingCard.id, direction);
				const moved =
					next.player.position.x !== prevPosition.x ||
					next.player.position.y !== prevPosition.y;
				directionSelector.hide();
				pendingCard = null;
				if (next.floor !== prevFloor) {
					// 階段マスへ移動アニメーション → 階層遷移
					const stairsPos = {
						x: prevPosition.x + DIRECTION_DELTA[direction].x,
						y: prevPosition.y + DIRECTION_DELTA[direction].y,
					};
					await updateStateWithStairsAnimation(next, stairsPos);
				} else if (moved) {
					await updateStateWithMoveAnimation(next, next.player.position);
				} else {
					// 壁にぶつかった
					await updateStateWithBumpAnimation(next, direction);
				}
				return;
			} else if (pendingCard.type === "attack") {
				const {
					state: next,
					hit,
					enemyId,
				} = executeAttack(gameState, pendingCard.id, direction);
				directionSelector.hide();
				pendingCard = null;
				if (hit && enemyId) {
					await updateStateWithAttackAnimation(next, enemyId);
				} else {
					updateState(next);
				}
				return;
			}
		}
		directionSelector.hide();
		pendingCard = null;
	});

	directionSelector.setOnCancel(() => {
		if (isAnimating) return; // アニメーション中は無効
		directionSelector.hide();
		pendingCard = null;
	});

	// 手札選択のコールバック設定
	// 方向パラメータを持つカードはクリック位置で方向が決まる
	handRenderer.setOnCardSelect(async (card, direction) => {
		if (isAnimating) return; // アニメーション中は無効
		if (card.type === "wait") {
			updateState(executeWait(gameState, card.id));
		} else if (direction) {
			// 方向が指定されている場合は即座に実行
			if (card.type === "move") {
				const prevPosition = gameState.player.position;
				const prevFloor = gameState.floor;
				const next = executeMove(gameState, card.id, direction);
				const moved =
					next.player.position.x !== prevPosition.x ||
					next.player.position.y !== prevPosition.y;
				if (next.floor !== prevFloor) {
					// 階段マスへ移動アニメーション → 階層遷移
					directionSelector.hide();
					pendingCard = null;
					const stairsPos = {
						x: prevPosition.x + DIRECTION_DELTA[direction].x,
						y: prevPosition.y + DIRECTION_DELTA[direction].y,
					};
					await updateStateWithStairsAnimation(next, stairsPos);
				} else if (moved) {
					await updateStateWithMoveAnimation(next, next.player.position);
				} else {
					// 壁にぶつかった
					await updateStateWithBumpAnimation(next, direction);
				}
			} else if (card.type === "attack") {
				const {
					state: next,
					hit,
					enemyId,
				} = executeAttack(gameState, card.id, direction);
				if (hit && enemyId) {
					await updateStateWithAttackAnimation(next, enemyId);
				} else {
					updateState(next);
				}
			}
		} else {
			// 方向が指定されていない場合は方向選択UIを表示（フォールバック）
			pendingCard = card;
			directionSelector.show();
		}
	});

	// タイトル画面のコールバック設定
	titleScreen.setOnNewGame(async () => {
		if (isAnimating) return;
		isAnimating = true;
		try {
			const newState = startNewGame(gameState);
			await screenTransition.fadeTransition(() => {
				applyState(newState);
				// 手札はフェードイン後に配布アニメーションで表示するためスキップ
				render(true);
			});
			// フェードイン後に手札配布アニメーション
			await handRenderer.renderWithAnimation(
				gameState.deck.hand,
				gameState.player.ap,
				newState.deck.hand.length,
			);
		} finally {
			isAnimating = false;
		}
	});

	titleScreen.setOnContinue(async () => {
		if (isAnimating) return;
		const savedState = loadGame();
		if (savedState) {
			isAnimating = true;
			try {
				await screenTransition.fadeTransition(() => {
					updateState(savedState);
				});
			} finally {
				isAnimating = false;
			}
		} else {
			alert("セーブデータの読み込みに失敗しました。");
			const totalWidth =
				mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
			titleScreen.render(totalWidth, totalHeight, hasSaveData());
		}
	});

	// ゲームオーバー画面のコールバック設定
	gameOverScreen.setOnReturnToTitle(async () => {
		if (isAnimating) return;
		isAnimating = true;
		try {
			await screenTransition.fadeTransition(() => {
				updateState(returnToTitle(gameState));
				const totalWidth =
					mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
				titleScreen.render(totalWidth, totalHeight, hasSaveData());
			});
		} finally {
			isAnimating = false;
		}
	});

	// ターン終了ボタンのコールバック設定
	turnEndButton.setOnEndTurn(async () => {
		if (isAnimating) return; // アニメーション中は無効
		isAnimating = true;

		try {
			let next = endPlayerTurn(gameState);

			// 敵ターンバナー表示
			await turnBanner.showBanner("enemy");

			const enemiesBefore = next.enemies;
			const { state: enemyTurnState, attackCount } = executeEnemyTurn(next);
			next = enemyTurnState;
			const enemyMoves = detectEnemyMoves(enemiesBefore, next.enemies);
			const playerWasAttacked = attackCount > 0;

			// 敵移動アニメーション
			if (enemyMoves.length > 0) {
				if (next.screen !== "gameOver") {
					applyState(next);
					render(true, false, true); // 手札・敵スキップ
				}
				mapRenderer.renderEnemies(next.enemies);
				await mapRenderer.animateEnemyMoves(enemyMoves);
			}

			// 敵攻撃アニメーション
			if (playerWasAttacked) {
				applyState(next);
				render();
				await mapRenderer.animateEnemyAttackHit(
					ENEMY_ATTACK_DAMAGE * attackCount,
				);
			}

			if (next.screen !== "gameOver") {
				next = startPlayerTurn(next);

				// プレイヤーターンバナー表示
				await turnBanner.showBanner("player");

				applyState(next);
				render(true);
				await handRenderer.renderWithAnimation(
					gameState.deck.hand,
					gameState.player.ap,
					next.deck.hand.length,
				);
			} else {
				deleteSaveData();
				await screenTransition.fadeTransition(() => {
					updateState(next);
				});
			}
		} finally {
			isAnimating = false;
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
	debugWindow.gameState = gameState;
	debugWindow.updateState = updateState;
	Object.defineProperty(debugWindow, "debugLog", {
		get: () => debugLog,
		set: (v: boolean) => {
			debugLog = v;
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

	// UIコンポーネントの初期化
	initializeUIComponents(app, mapSize, totalHeight);

	// イベントハンドラの設定
	setupEventHandlers(mapSize, totalHeight);

	// タイトル画面状態で初期化
	gameState = createTitleScreenState();
	const totalWidth =
		mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
	titleScreen.render(totalWidth, totalHeight, hasSaveData());
	render();

	// デバッグ用グローバル変数の設定
	setupDebugGlobals();
}

main().catch((error) => {
	console.error("アプリケーションの初期化に失敗しました:", error);
	alert(
		"アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。",
	);
});
