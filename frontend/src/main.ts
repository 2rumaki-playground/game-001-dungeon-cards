import { Application } from "pixi.js";
import {
	COLORS,
	LOG_AREA_GAP,
	LOG_AREA_WIDTH,
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
import type { Card, GameState } from "./types";
import {
	ActionLogRenderer,
	DirectionSelector,
	GameOverScreen,
	getMapPixelSize,
	HandRenderer,
	MapRenderer,
	StatusBar,
	TitleScreen,
	TurnEndButton,
} from "./ui";
import { deleteSaveData, hasSaveData, loadGame } from "./utils/storage";

/** 手札エリアの高さ */
const HAND_AREA_HEIGHT = 160;

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

/** 方向選択待ちのカード */
let pendingCard: Card | null = null;

/** アニメーション中フラグ（UI操作を無効化） */
let isAnimating = false;

/** デバッグログの有効/無効（コンソールから切替可能） */
let debugLog = import.meta.env.DEV;

/**
 * ゲーム状態を更新して再描画
 */
function updateState(newState: GameState): void {
	if (debugLog) {
		const newEntries = newState.actionLog.length - gameState.actionLog.length;
		for (let i = newEntries - 1; i >= 0; i--) {
			console.log(`[行動ログ] ${newState.actionLog[i].message}`);
		}
	}
	gameState = newState;
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
 */
function renderGameScreen(skipHand = false): void {
	titleScreen.hide();
	gameOverScreen.hide();
	statusBar.show();
	statusBar.render(gameState.player, gameState.floor);
	mapRenderer.render(gameState.map, gameState.player, gameState.enemies);
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
 */
function render(skipHand = false): void {
	switch (gameState.screen) {
		case "title":
			renderTitleScreen();
			break;
		case "game":
			renderGameScreen(skipHand);
			break;
		case "gameOver":
			renderGameOverScreen();
			break;
	}
}

/**
 * ゲーム状態を更新して手札配布アニメーション付きで再描画
 * @param newState 新しいゲーム状態
 * @param newCardCount 新しく引いたカードの枚数
 */
async function updateStateWithDealAnimation(
	newState: GameState,
	newCardCount: number,
): Promise<void> {
	if (debugLog) {
		const newEntries = newState.actionLog.length - gameState.actionLog.length;
		for (let i = newEntries - 1; i >= 0; i--) {
			console.log(`[行動ログ] ${newState.actionLog[i].message}`);
		}
	}
	gameState = newState;

	// アニメーション中フラグをセット
	isAnimating = true;

	try {
		// 手札以外を描画
		render(true);

		// 手札配布アニメーション
		await handRenderer.renderWithAnimation(
			gameState.deck.hand,
			gameState.player.ap,
			newCardCount,
		);
	} finally {
		// アニメーション完了（エラー時も確実にフラグを戻す）
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
	handContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_HEIGHT / 2 - 60;
	app.stage.addChild(handContainer);

	// ターン終了ボタンを初期化
	turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x = mapSize.width - 136;
	turnEndContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_HEIGHT - 52;
	app.stage.addChild(turnEndContainer);

	// 行動ログレンダラーを初期化
	actionLogRenderer = new ActionLogRenderer(totalHeight);
	const logContainer = actionLogRenderer.getContainer();
	logContainer.x = mapSize.width + LOG_AREA_GAP;
	logContainer.y = 0;
	app.stage.addChild(logContainer);

	// 方向選択UIを初期化
	directionSelector = new DirectionSelector();
	const directionContainer = directionSelector.getContainer();
	directionContainer.x = mapSize.width / 2;
	directionContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_HEIGHT / 2 - 60;
	app.stage.addChild(directionContainer);
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
				const prevFloor = gameState.floor;
				const next = executeMove(gameState, pendingCard.id, direction);
				// 階層遷移が発生した場合はアニメーション付きで描画
				if (next.floor !== prevFloor) {
					directionSelector.hide();
					pendingCard = null;
					await updateStateWithDealAnimation(next, next.deck.hand.length);
					return;
				}
				updateState(next);
			} else if (pendingCard.type === "attack") {
				updateState(executeAttack(gameState, pendingCard.id, direction));
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
				const prevFloor = gameState.floor;
				const next = executeMove(gameState, card.id, direction);
				// 階層遷移が発生した場合はアニメーション付きで描画
				if (next.floor !== prevFloor) {
					// 階層遷移時は方向選択状態をクリア
					directionSelector.hide();
					pendingCard = null;
					await updateStateWithDealAnimation(next, next.deck.hand.length);
				} else {
					updateState(next);
				}
			} else if (card.type === "attack") {
				updateState(executeAttack(gameState, card.id, direction));
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
		const newState = startNewGame(gameState);
		// 新規ゲーム開始時は全カードがアニメーション対象
		await updateStateWithDealAnimation(newState, newState.deck.hand.length);
	});

	titleScreen.setOnContinue(() => {
		if (isAnimating) return;
		const savedState = loadGame();
		if (savedState) {
			updateState(savedState);
		} else {
			alert("セーブデータの読み込みに失敗しました。");
			const totalWidth =
				mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
			titleScreen.render(totalWidth, totalHeight, hasSaveData());
		}
	});

	// ゲームオーバー画面のコールバック設定
	gameOverScreen.setOnReturnToTitle(() => {
		if (isAnimating) return; // アニメーション中は無効
		updateState(returnToTitle(gameState));
		const totalWidth =
			mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
		titleScreen.render(totalWidth, totalHeight, hasSaveData());
	});

	// ターン終了ボタンのコールバック設定
	turnEndButton.setOnEndTurn(async () => {
		if (isAnimating) return; // アニメーション中は無効

		let next = endPlayerTurn(gameState);
		next = executeEnemyTurn(next);

		if (next.screen !== "gameOver") {
			next = startPlayerTurn(next);
			// 新しく引いたカードの枚数（ターン終了で手札は空になるため全カードが対象）
			const newCardCount = next.deck.hand.length;
			await updateStateWithDealAnimation(next, newCardCount);
		} else {
			deleteSaveData();
			updateState(next);
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
