import { Application } from "pixi.js";
import { COLORS, STATUS_BAR_HEIGHT } from "./constants";
import {
	createTitleScreenState,
	executeAttack,
	executeMove,
	executeWait,
	returnToTitle,
	startNewGame,
} from "./game";
import type { Card, GameState } from "./types";
import {
	DirectionSelector,
	GameOverScreen,
	getMapPixelSize,
	HandRenderer,
	MapRenderer,
	StatusBar,
	TitleScreen,
} from "./ui";

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
 * 画面に応じた描画
 */
function render(): void {
	if (gameState.screen === "title") {
		titleScreen.show();
		gameOverScreen.hide();
		statusBar.hide();
		mapRenderer.clear();
		handRenderer.clear();
	} else if (gameState.screen === "game") {
		titleScreen.hide();
		gameOverScreen.hide();
		statusBar.show();
		statusBar.render(gameState.player, gameState.floor);
		mapRenderer.render(gameState.map, gameState.player, gameState.enemies);
		handRenderer.render(gameState.deck.hand, gameState.player.ap);
	} else if (gameState.screen === "gameOver") {
		titleScreen.hide();
		statusBar.hide();
		mapRenderer.clear();
		handRenderer.clear();
		const mapSize = getMapPixelSize();
		gameOverScreen.render(
			gameState.floor,
			mapSize.width,
			mapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
		);
		gameOverScreen.show();
	}
}

async function main() {
	const app = new Application();
	const mapSize = getMapPixelSize();

	await app.init({
		width: mapSize.width,
		height: mapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
		backgroundColor: COLORS.background,
	});

	document.body.appendChild(app.canvas);

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

	// 方向選択UIを初期化
	directionSelector = new DirectionSelector();
	const directionContainer = directionSelector.getContainer();
	directionContainer.x = mapSize.width / 2;
	directionContainer.y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_HEIGHT / 2 - 60;
	app.stage.addChild(directionContainer);

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

	handRenderer.setOnCardSelect((card) => {
		if (card.type === "wait") {
			updateState(executeWait(gameState, card.id));
		} else {
			pendingCard = card;
			directionSelector.show();
		}
	});

	// タイトル画面のコールバック設定
	titleScreen.setOnNewGame(() => {
		updateState(startNewGame(gameState));
	});

	// ゲームオーバー画面のコールバック設定
	gameOverScreen.setOnReturnToTitle(() => {
		updateState(returnToTitle(gameState));
	});

	// タイトル画面状態で初期化
	gameState = createTitleScreenState();
	titleScreen.render(
		mapSize.width,
		mapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
	);
	render();

	// デバッグ用：コンソールからゲーム状態・ログ設定を確認・変更できるようにする
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

main().catch((error) => {
	console.error("アプリケーションの初期化に失敗しました:", error);
	alert(
		"アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。",
	);
});
