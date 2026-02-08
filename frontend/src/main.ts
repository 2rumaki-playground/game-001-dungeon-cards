import { Application } from "pixi.js";
import {
	COLORS,
	getMapSize,
	LOG_AREA_GAP,
	LOG_AREA_WIDTH,
	STATUS_BAR_HEIGHT,
} from "./constants";
import { createTitleScreenState } from "./game";
import type { GameContext, UIComponents } from "./gameContext";
import type { GameState } from "./types";
import {
	ActionLogRenderer,
	DeckViewer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
	getMapPixelSize,
	HandRenderer,
	MapRenderer,
	ParticleSystem,
	RewardScreen,
	ScreenTransition,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
} from "./ui";
import { setupEventHandlers } from "./ui/eventHandlers";
import { render, updateState } from "./ui/gameRenderer";
import {
	BUTTON_BOTTOM_MARGIN,
	BUTTON_GAP,
	BUTTON_HEIGHT,
	BUTTON_RIGHT_MARGIN,
	DECK_BUTTON_WIDTH,
	HAND_AREA_HEIGHT,
	HAND_AREA_TOP_PADDING,
	TURN_END_BUTTON_WIDTH,
} from "./ui/layout";
import { hasSaveData } from "./utils/storage";

/** アプリケーションコンテキスト */
let ctx: GameContext;

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

	const particleSystem = new ParticleSystem();
	const particleContainer = particleSystem.getContainer();
	particleContainer.y = STATUS_BAR_HEIGHT;
	app.stage.addChild(particleContainer);

	const handRenderer = new HandRenderer();
	const handContainer = handRenderer.getContainer();
	handContainer.x = mapSize.width / 2;
	handContainer.y = STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(handContainer);

	const turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x =
		mapSize.width - TURN_END_BUTTON_WIDTH - BUTTON_RIGHT_MARGIN;
	turnEndContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(turnEndContainer);

	const deckViewer = new DeckViewer();
	const deckButtonContainer = deckViewer.getButtonContainer();
	deckButtonContainer.x = turnEndContainer.x - DECK_BUTTON_WIDTH - BUTTON_GAP;
	deckButtonContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(deckButtonContainer);

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

	app.stage.addChild(deckViewer.getContainer());

	const rewardScreen = new RewardScreen();
	app.stage.addChild(rewardScreen.getContainer());

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
		deckViewer,
		actionLogRenderer,
		turnBanner,
		rewardScreen,
		screenTransition,
		floorBanner,
		particleSystem,
	};
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
	// 最大マップサイズ（15x15）でキャンバスを確保
	const maxSize = getMapSize(Infinity);
	const maxMapSize = getMapPixelSize(maxSize.width, maxSize.height);
	const maxTotalHeight =
		maxMapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;

	await app.init({
		width: maxMapSize.width + LOG_AREA_GAP + LOG_AREA_WIDTH,
		height: maxTotalHeight,
		backgroundColor: COLORS.background,
	});

	document.body.appendChild(app.canvas);

	// UIコンポーネントは最大サイズで初期化
	const ui = initializeUIComponents(app, maxMapSize, maxTotalHeight);

	// コンテキスト初期化
	ctx = {
		app,
		state: createTitleScreenState(),
		isAnimating: false,
		pendingCard: null,
		debugLog: import.meta.env.DEV,
		ui,
	};

	// イベントハンドラの設定
	setupEventHandlers(ctx);

	// タイトル画面を描画
	const totalWidth =
		maxMapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
	ctx.ui.titleScreen.render(totalWidth, maxTotalHeight, hasSaveData());
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
