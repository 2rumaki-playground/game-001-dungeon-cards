/**
 * UIリレイアウト
 * 階層遷移時にUIコンポーネントの座標を再配置する
 * キャンバスサイズは固定（VIEWPORT_TILES × VIEWPORT_TILES タイルのビューポート）のためリサイズは行わない
 */

import {
	CHARACTER_CARD_HEIGHT,
	LOG_AREA_GAP,
	STATUS_BAR_HEIGHT,
} from "../constants";
import type { GameContext } from "../gameContext";
import { getViewportPixelSize } from "./coordinates";
import {
	BUTTON_BOTTOM_MARGIN,
	BUTTON_GAP,
	BUTTON_HEIGHT,
	BUTTON_RIGHT_MARGIN,
	HAND_AREA_HEIGHT,
	HAND_AREA_TOP_PADDING,
	NEXT_FLOOR_BUTTON_WIDTH,
	TURN_END_BUTTON_WIDTH,
} from "./layout";

/**
 * 固定ビューポートサイズに基づいてUIコンポーネントを再配置する
 */
export function relayoutUI(ctx: GameContext): void {
	const viewportSize = getViewportPixelSize();
	const totalHeight =
		viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;
	const totalWidth =
		viewportSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();

	// 手札エリア
	ctx.ui.handRenderer.getContainer().x = viewportSize.width / 2;
	ctx.ui.handRenderer.getContainer().y =
		STATUS_BAR_HEIGHT + viewportSize.height + HAND_AREA_TOP_PADDING;

	// 方向選択UI
	ctx.ui.directionSelector.getContainer().x = viewportSize.width / 2;
	ctx.ui.directionSelector.getContainer().y =
		STATUS_BAR_HEIGHT + viewportSize.height + HAND_AREA_TOP_PADDING;

	// ターン終了ボタン
	ctx.ui.turnEndButton.getContainer().x =
		viewportSize.width - TURN_END_BUTTON_WIDTH - BUTTON_RIGHT_MARGIN;
	ctx.ui.turnEndButton.getContainer().y =
		totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;

	// 次の階層へボタン
	ctx.ui.nextFloorButton.getContainer().x =
		ctx.ui.turnEndButton.getContainer().x -
		NEXT_FLOOR_BUTTON_WIDTH -
		BUTTON_GAP;
	ctx.ui.nextFloorButton.getContainer().y =
		totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;

	// 行動ログ（キャラクターカード分を差し引いた高さ）
	const logHeight = totalHeight - CHARACTER_CARD_HEIGHT;
	ctx.ui.actionLogRenderer.getContainer().x = viewportSize.width + LOG_AREA_GAP;
	ctx.ui.actionLogRenderer.resize(logHeight);

	// キャラクターカード
	ctx.ui.characterCardRenderer.getContainer().x =
		viewportSize.width + LOG_AREA_GAP;
	ctx.ui.characterCardRenderer.getContainer().y = logHeight;

	// ターンバナー
	ctx.ui.turnBanner.resize(totalWidth, totalHeight);

	// 画面遷移オーバーレイ
	ctx.ui.screenTransition.resize(totalWidth, totalHeight);

	// 階層バナー
	ctx.ui.floorBanner.resize(totalWidth, totalHeight);

	// デバッグカードレンダラー（次階層ボタンの左に配置）
	if (ctx.ui.debugCardRenderer) {
		const debugContainer = ctx.ui.debugCardRenderer.getContainer();
		debugContainer.x =
			ctx.ui.nextFloorButton.getContainer().x -
			BUTTON_GAP -
			ctx.ui.debugCardRenderer.getTotalWidth() / 2;
		debugContainer.y =
			totalHeight -
			ctx.ui.debugCardRenderer.getTotalHeight() -
			BUTTON_BOTTOM_MARGIN;
	}
}
