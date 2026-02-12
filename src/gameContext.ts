/**
 * アプリケーション全体の共有状態とUIコンポーネント参照
 */

import type { Application } from "pixi.js";
import type { QueuedCard } from "./game/cardQueue";
import type { Card, GameState } from "./types";
import type {
	ActionLogRenderer,
	CameraDragController,
	DeckViewer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
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
import type { DebugCardRenderer } from "./ui/debugCardRenderer";
import type { DebugTargetSelector } from "./ui/debugTargetSelector";

/** UIコンポーネント参照 */
export interface UIComponents {
	titleScreen: TitleScreen;
	gameOverScreen: GameOverScreen;
	statusBar: StatusBar;
	mapRenderer: MapRenderer;
	handRenderer: HandRenderer;
	directionSelector: DirectionSelector;
	turnEndButton: TurnEndButton;
	nextFloorButton: NextFloorButton;
	deckViewer: DeckViewer;
	actionLogRenderer: ActionLogRenderer;
	turnBanner: TurnBanner;
	turnOverlay: TurnOverlay;
	rewardScreen: RewardScreen;
	screenTransition: ScreenTransition;
	floorBanner: FloorBanner;
	particleSystem: ParticleSystem;
	victoryScreen: VictoryScreen;
	cameraDragController: CameraDragController;
	returnToPlayerButton: ReturnToPlayerButton;
	debugCardRenderer: DebugCardRenderer | null;
	debugTargetSelector: DebugTargetSelector | null;
}

/** アプリケーションの共有状態 */
export interface GameContext {
	app: Application;
	state: GameState;
	isAnimating: boolean;
	pendingCard: Card | null;
	/** カード予約キュー（プレイヤーターン中のアニメーション中に積まれる） */
	cardQueue: QueuedCard[];
	/** カードアクション（move/attack/jump等）のアニメーション中フラグ */
	isCardActionAnimating: boolean;
	debugLog: boolean;
	debugMode: boolean;
	ui: UIComponents;
}
