import { Application, Container, Graphics } from "pixi.js";
import {
	COLORS,
	LOG_AREA_GAP,
	LOG_AREA_WIDTH,
	STATUS_BAR_HEIGHT,
} from "./constants";
import { createTitleScreenState } from "./game";
import type { GameContext, UIComponents } from "./gameContext";
import type { GameState } from "./types";
import {
	ActionLogRenderer,
	CameraDragController,
	DeckViewer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
	getViewportPixelSize,
	HandRenderer,
	MapRenderer,
	NextFloorButton,
	ParticleSystem,
	ReturnToPlayerButton,
	RewardScreen,
	ScreenTransition,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
	TurnOverlay,
	VictoryScreen,
} from "./ui";
import { loadGameAssets } from "./ui/assetLoader";
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
	NEXT_FLOOR_BUTTON_WIDTH,
	RETURN_TO_PLAYER_BUTTON_WIDTH,
	TURN_END_BUTTON_WIDTH,
} from "./ui/layout";
import { hasSaveData } from "./utils/storage";

/** アプリケーションコンテキスト */
let ctx: GameContext;

/**
 * UIコンポーネントを初期化してステージに追加
 */
async function initializeUIComponents(
	app: Application,
	viewportSize: { width: number; height: number },
	totalHeight: number,
): Promise<UIComponents> {
	const titleScreen = new TitleScreen();
	app.stage.addChild(titleScreen.getContainer());

	const gameOverScreen = new GameOverScreen();
	app.stage.addChild(gameOverScreen.getContainer());

	const statusBar = new StatusBar();

	// ビューポートラッパー: マップをタイル領域にクリッピング
	const mapViewport = new Container();
	mapViewport.y = STATUS_BAR_HEIGHT;
	const viewportMask = new Graphics();
	viewportMask.rect(0, 0, viewportSize.width, viewportSize.height);
	viewportMask.fill(0xffffff);
	mapViewport.mask = viewportMask;

	const mapRenderer = new MapRenderer();
	const mapContainer = mapRenderer.getContainer();
	mapViewport.addChild(mapContainer);
	app.stage.addChild(mapViewport);

	// ターンオーバーレイ（マップの上、ステータスバーの下）
	const turnOverlay = new TurnOverlay(viewportSize.width, totalHeight);
	app.stage.addChild(turnOverlay.getContainer());

	// statusBarはmapViewportの後に追加（前面に描画するため）
	app.stage.addChild(statusBar.getContainer());

	// パーティクルはマスクなし（勝利画面の紙吹雪は全画面表示）
	const particleSystem = new ParticleSystem();
	const particleContainer = particleSystem.getContainer();
	particleContainer.y = STATUS_BAR_HEIGHT;
	app.stage.addChild(particleContainer);

	const handRenderer = new HandRenderer(particleSystem);
	const handContainer = handRenderer.getContainer();
	handContainer.x = viewportSize.width / 2;
	handContainer.y =
		STATUS_BAR_HEIGHT + viewportSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(handContainer);

	const turnEndButton = new TurnEndButton();
	const turnEndContainer = turnEndButton.getContainer();
	turnEndContainer.x =
		viewportSize.width - TURN_END_BUTTON_WIDTH - BUTTON_RIGHT_MARGIN;
	turnEndContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(turnEndContainer);

	const nextFloorButton = new NextFloorButton();
	const nextFloorContainer = nextFloorButton.getContainer();
	nextFloorContainer.x =
		turnEndContainer.x - NEXT_FLOOR_BUTTON_WIDTH - BUTTON_GAP;
	nextFloorContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(nextFloorContainer);

	const deckViewer = new DeckViewer();
	const deckButtonContainer = deckViewer.getButtonContainer();
	deckButtonContainer.x = nextFloorContainer.x - DECK_BUTTON_WIDTH - BUTTON_GAP;
	deckButtonContainer.y = totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;
	app.stage.addChild(deckButtonContainer);

	// カメラドラッグ制御
	const cameraDragController = new CameraDragController();

	// 「プレイヤーへ戻る」ボタン（ビューポート右上に配置）
	const returnToPlayerButton = new ReturnToPlayerButton();
	const returnBtnContainer = returnToPlayerButton.getContainer();
	returnBtnContainer.x = viewportSize.width - RETURN_TO_PLAYER_BUTTON_WIDTH - 8;
	returnBtnContainer.y = STATUS_BAR_HEIGHT + 8;
	app.stage.addChild(returnBtnContainer);

	const actionLogRenderer = new ActionLogRenderer(totalHeight);
	const logContainer = actionLogRenderer.getContainer();
	logContainer.x = viewportSize.width + LOG_AREA_GAP;
	logContainer.y = 0;
	app.stage.addChild(logContainer);

	const turnBanner = new TurnBanner(
		viewportSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth(),
		totalHeight,
	);
	app.stage.addChild(turnBanner.getContainer());

	const directionSelector = new DirectionSelector();
	const directionContainer = directionSelector.getContainer();
	directionContainer.x = viewportSize.width / 2;
	directionContainer.y =
		STATUS_BAR_HEIGHT + viewportSize.height + HAND_AREA_TOP_PADDING;
	app.stage.addChild(directionContainer);

	app.stage.addChild(deckViewer.getContainer());

	const rewardScreen = new RewardScreen();
	rewardScreen.setParticleSystem(particleSystem);
	app.stage.addChild(rewardScreen.getContainer());

	const victoryScreen = new VictoryScreen();
	app.stage.addChild(victoryScreen.getContainer());

	const totalWidth =
		viewportSize.width + LOG_AREA_GAP + actionLogRenderer.getWidth();
	const screenTransition = new ScreenTransition(totalWidth, totalHeight);
	app.stage.addChild(screenTransition.getContainer());

	const floorBanner = new FloorBanner(totalWidth, totalHeight);
	screenTransition.getContainer().addChild(floorBanner.getContainer());

	// デバッグUI（DEV環境限定）
	let debugCardRenderer:
		| import("./ui/debugCardRenderer").DebugCardRenderer
		| null = null;
	let debugTargetSelector:
		| import("./ui/debugTargetSelector").DebugTargetSelector
		| null = null;

	if (import.meta.env.DEV) {
		const { DebugCardRenderer } = await import("./ui/debugCardRenderer");
		const { DebugTargetSelector } = await import("./ui/debugTargetSelector");

		debugCardRenderer = new DebugCardRenderer();
		const debugCardContainer = debugCardRenderer.getContainer();
		debugCardContainer.x =
			deckButtonContainer.x -
			BUTTON_GAP -
			debugCardRenderer.getTotalWidth() / 2;
		debugCardContainer.y =
			totalHeight - debugCardRenderer.getTotalHeight() - BUTTON_BOTTOM_MARGIN;
		const deckViewerIndex = app.stage.getChildIndex(deckViewer.getContainer());
		app.stage.addChildAt(debugCardContainer, deckViewerIndex);

		debugTargetSelector = new DebugTargetSelector();
		const targetSelectorContainer = debugTargetSelector.getContainer();
		mapRenderer.getContainer().addChild(targetSelectorContainer);
	}

	return {
		titleScreen,
		gameOverScreen,
		statusBar,
		mapRenderer,
		handRenderer,
		directionSelector,
		turnEndButton,
		nextFloorButton,
		deckViewer,
		actionLogRenderer,
		turnBanner,
		turnOverlay,
		rewardScreen,
		screenTransition,
		floorBanner,
		particleSystem,
		victoryScreen,
		cameraDragController,
		returnToPlayerButton,
		debugCardRenderer,
		debugTargetSelector,
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
	// ビューポートタイル数に基づいた固定キャンバス
	const viewportSize = getViewportPixelSize();
	const totalHeight =
		viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;

	await app.init({
		width: viewportSize.width + LOG_AREA_GAP + LOG_AREA_WIDTH,
		height: totalHeight,
		backgroundColor: COLORS.background,
	});

	document.body.appendChild(app.canvas);

	// ゲームアセットをプリロード
	await loadGameAssets();

	// UIコンポーネントをビューポートサイズで初期化
	const ui = await initializeUIComponents(app, viewportSize, totalHeight);

	// コンテキスト初期化
	ctx = {
		app,
		state: createTitleScreenState(),
		isAnimating: false,
		pendingCard: null,
		cardQueue: [],
		isCardActionAnimating: false,
		debugLog: import.meta.env.DEV,
		debugMode: false,
		ui,
	};

	// イベントハンドラの設定
	setupEventHandlers(ctx);

	// タイトル画面を描画
	const totalWidth =
		viewportSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
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
