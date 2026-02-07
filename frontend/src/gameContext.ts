/**
 * アプリケーション全体の共有状態とUIコンポーネント参照
 */

import type { Card, GameState } from "./types";
import type {
	ActionLogRenderer,
	DeckViewer,
	DirectionSelector,
	FloorBanner,
	GameOverScreen,
	HandRenderer,
	MapRenderer,
	RewardScreen,
	ScreenTransition,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
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
}

/** アプリケーションの共有状態 */
export interface GameContext {
	state: GameState;
	isAnimating: boolean;
	pendingCard: Card | null;
	debugLog: boolean;
	ui: UIComponents;
}
