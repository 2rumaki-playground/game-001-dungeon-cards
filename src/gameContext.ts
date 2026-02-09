/**
 * アプリケーション全体の共有状態とUIコンポーネント参照
 */

import type { Application } from "pixi.js";
import type { QueuedCard } from "./game/cardQueue";
import type { Card, GameState } from "./types";
import type {
	ActionLogRenderer,
	DeckViewer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
	HandRenderer,
	MapRenderer,
	ParticleSystem,
	RewardScreen,
	ScreenTransition,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
	VictoryScreen,
} from "./ui";

/** UIコンポーネント参照 */
export interface UIComponents {
	titleScreen: TitleScreen;
	gameOverScreen: GameOverScreen;
	statusBar: StatusBar;
	mapRenderer: MapRenderer;
	handRenderer: HandRenderer;
	directionSelector: DirectionSelector;
	turnEndButton: TurnEndButton;
	deckViewer: DeckViewer;
	actionLogRenderer: ActionLogRenderer;
	turnBanner: TurnBanner;
	rewardScreen: RewardScreen;
	screenTransition: ScreenTransition;
	floorBanner: FloorBanner;
	particleSystem: ParticleSystem;
	victoryScreen: VictoryScreen;
}

/** アプリケーションの共有状態 */
export interface GameContext {
	app: Application;
	state: GameState;
	isAnimating: boolean;
	pendingCard: Card | null;
	/** カード予約キュー（プレイヤーターン中のアニメーション中に積まれる） */
	cardQueue: QueuedCard[];
	debugLog: boolean;
	ui: UIComponents;
}
