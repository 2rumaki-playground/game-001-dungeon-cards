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
const HAND_AREA_HEIGHT = 200;

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
 */
function renderGameScreen(): void {
	titleScreen.hide();
	gameOverScreen.hide();
	statusBar.show();
	statusBar.render(gameState.player, gameState.floor);
	mapRenderer.render(gameState.map, gameState.player, gameState.enemies);
	handRenderer.render(gameState.deck.hand, gameState.player.ap);
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
 */
function render(): void {
	switch (gameState.screen) {
		case "title":
			renderTitleScreen();
			break;
		case "game":
			renderGameScreen();
			break;
		case "gameOver":
			renderGameOverScreen();
			break;
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
	handContainer.y = STATUS_BAR_HEIGHT + mapSize.height + 20;
	app.stage.addChild(handContainer);

	// ターン終了ボタンを初期化
	turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x = mapSize.width - 136;
	turnEndContainer.y = totalHeight - 48;
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
	directionContainer.y = STATUS_BAR_HEIGHT + mapSize.height + 20;
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
	directionSelector.setOnDirectionSelect((direction) => {
		if (pendingCard) {
			if (pendingCard.type === "move") {
				updateState(executeMove(gameState, pendingCard.id, direction));
			} else if (pendingCard.type === "attack") {
				updateState(executeAttack(gameState, pendingCard.id, direction));
			}
		}
		directionSelector.hide();
		pendingCard = null;
	});

	directionSelector.setOnCancel(() => {
		directionSelector.hide();
		pendingCard = null;
	});

	// 手札選択のコールバック設定
	// 方向パラメータを持つカードはクリック位置で方向が決まる
	handRenderer.setOnCardSelect((card, direction) => {
		if (card.type === "wait") {
			updateState(executeWait(gameState, card.id));
		} else if (direction) {
			// 方向が指定されている場合は即座に実行
			if (card.type === "move") {
				updateState(executeMove(gameState, card.id, direction));
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
	titleScreen.setOnNewGame(() => {
		updateState(startNewGame(gameState));
	});

	titleScreen.setOnContinue(() => {
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
		updateState(returnToTitle(gameState));
		const totalWidth =
			mapSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
		titleScreen.render(totalWidth, totalHeight, hasSaveData());
	});

	// ターン終了ボタンのコールバック設定
	turnEndButton.setOnEndTurn(() => {
		let next = endPlayerTurn(gameState);
		next = executeEnemyTurn(next);

		if (next.screen !== "gameOver") {
			next = startPlayerTurn(next);
		} else {
			deleteSaveData();
		}

		updateState(next);
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
