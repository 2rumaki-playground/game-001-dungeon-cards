import { Application } from "pixi.js";
import { COLORS } from "./constants";
import { createInitialDeckState, createInitialGameState, drawCards } from "./game";
import type { GameState } from "./types";
import { HandRenderer, MapRenderer, getMapPixelSize } from "./ui";

/** 手札エリアの高さ */
const HAND_AREA_HEIGHT = 160;

/** 現在のゲーム状態 */
let gameState: GameState;

/** マップレンダラー */
let mapRenderer: MapRenderer;

/** 手札レンダラー */
let handRenderer: HandRenderer;

/**
 * ゲーム状態を更新して再描画
 */
function updateState(newState: GameState): void {
	gameState = newState;
	renderGame();
}

/**
 * ゲームを描画
 */
function renderGame(): void {
	if (gameState.screen === "game") {
		mapRenderer.render(gameState.map, gameState.player, gameState.enemies);
		handRenderer.render(gameState.deck.hand, gameState.player.ap);
	} else {
		mapRenderer.clear();
		handRenderer.clear();
	}
}

async function main() {
	const app = new Application();
	const mapSize = getMapPixelSize();

	await app.init({
		width: mapSize.width,
		height: mapSize.height + HAND_AREA_HEIGHT,
		backgroundColor: COLORS.background,
	});

	document.body.appendChild(app.canvas);

	// マップレンダラーを初期化
	mapRenderer = new MapRenderer();
	app.stage.addChild(mapRenderer.getContainer());

	// 手札レンダラーを初期化
	handRenderer = new HandRenderer();
	const handContainer = handRenderer.getContainer();
	handContainer.x = mapSize.width / 2;
	handContainer.y = mapSize.height + HAND_AREA_HEIGHT / 2 - 60;
	app.stage.addChild(handContainer);

	handRenderer.setOnCardSelect((card) => {
		console.log("カード選択:", card.type, card.id);
	});

	// ゲーム状態を初期化（デッキ生成＋手札ドロー込み）
	gameState = createInitialGameState();
	const deck = createInitialDeckState(gameState.rng);
	const deckWithHand = drawCards(deck, gameState.rng);
	gameState = { ...gameState, deck: deckWithHand };

	// 初回描画
	renderGame();

	// デバッグ用：コンソールからゲーム状態を確認できるようにする
	(window as unknown as { gameState: GameState }).gameState = gameState;
	(window as unknown as { updateState: typeof updateState }).updateState =
		updateState;
}

main().catch((error) => {
	console.error("アプリケーションの初期化に失敗しました:", error);
	alert(
		"アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。",
	);
});
