/**
 * アプリケーション全体の共有状態とUIコンポーネント参照
 */

import type { Application } from "pixi.js";
import type { QueuedCard } from "./game/cardQueue";
import type { Card, GameState, ResultData } from "./types";
import type {
	ActionLogRenderer,
	CameraDragController,
	CharacterCardRenderer,
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
	StatsScreen,
	StatusBar,
	TitleScreen,
	TurnBanner,
	TurnEndButton,
	VictoryScreen,
} from "./ui";
import type { DebugCardRenderer } from "./ui/debugCardRenderer";
import type { DebugCheatPanel } from "./ui/debugCheatPanel";
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
	actionLogRenderer: ActionLogRenderer;
	characterCardRenderer: CharacterCardRenderer;
	turnBanner: TurnBanner;
	rewardScreen: RewardScreen;
	screenTransition: ScreenTransition;
	floorBanner: FloorBanner;
	particleSystem: ParticleSystem;
	victoryScreen: VictoryScreen;
	statsScreen: StatsScreen;
	cameraDragController: CameraDragController;
	returnToPlayerButton: ReturnToPlayerButton;
	debugCardRenderer: DebugCardRenderer | null;
	debugCheatPanel: DebugCheatPanel | null;
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
	/** リザルト画面用データ（ラン終了時に設定） */
	resultData: ResultData | null;
}
