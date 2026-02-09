/**
 * UIリレイアウト
 * マップサイズ変更時にUIコンポーネントの座標とキャンバスサイズを再配置
 */

import { LOG_AREA_GAP, STATUS_BAR_HEIGHT } from "../constants";
import type { GameContext } from "../gameContext";
import { getMapPixelSize } from "./coordinates";
import { CARD_HEIGHT } from "./handRenderer";
import {
	BUTTON_BOTTOM_MARGIN,
	BUTTON_GAP,
	BUTTON_HEIGHT,
	BUTTON_RIGHT_MARGIN,
	DECK_BUTTON_WIDTH,
	HAND_AREA_HEIGHT,
	HAND_AREA_TOP_PADDING,
	NEXT_FLOOR_BUTTON_WIDTH,
	TURN_END_BUTTON_WIDTH,
} from "./layout";

/**
 * 現在のマップサイズに基づいてUIコンポーネントを再配置する
 */
export function relayoutUI(ctx: GameContext): void {
	const mapWidth = ctx.state.map[0]?.length ?? 0;
	const mapHeight = ctx.state.map.length;
	const mapSize = getMapPixelSize(mapWidth, mapHeight);
	const totalHeight = mapSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT;
	const totalWidth =
		mapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();

	// キャンバスサイズ変更
	ctx.app.renderer.resize(totalWidth, totalHeight);

	// 手札エリア
	ctx.ui.handRenderer.getContainer().x = mapSize.width / 2;
	ctx.ui.handRenderer.getContainer().y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;

	// 方向選択UI
	ctx.ui.directionSelector.getContainer().x = mapSize.width / 2;
	ctx.ui.directionSelector.getContainer().y =
		STATUS_BAR_HEIGHT + mapSize.height + HAND_AREA_TOP_PADDING;

	// ターン終了ボタン
	ctx.ui.turnEndButton.getContainer().x =
		mapSize.width - TURN_END_BUTTON_WIDTH - BUTTON_RIGHT_MARGIN;
	ctx.ui.turnEndButton.getContainer().y =
		totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;

	// 次の階層へボタン
	ctx.ui.nextFloorButton.getContainer().x =
		ctx.ui.turnEndButton.getContainer().x -
		NEXT_FLOOR_BUTTON_WIDTH -
		BUTTON_GAP;
	ctx.ui.nextFloorButton.getContainer().y =
		totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;

	// デッキ閲覧ボタン
	ctx.ui.deckViewer.getButtonContainer().x =
		ctx.ui.nextFloorButton.getContainer().x - DECK_BUTTON_WIDTH - BUTTON_GAP;
	ctx.ui.deckViewer.getButtonContainer().y =
		totalHeight - BUTTON_HEIGHT - BUTTON_BOTTOM_MARGIN;

	// 行動ログ
	ctx.ui.actionLogRenderer.getContainer().x = mapSize.width + LOG_AREA_GAP;
	ctx.ui.actionLogRenderer.resize(totalHeight);

	// ターンバナー
	ctx.ui.turnBanner.resize(totalWidth, totalHeight);

	// 画面遷移オーバーレイ
	ctx.ui.screenTransition.resize(totalWidth, totalHeight);

	// 階層バナー
	ctx.ui.floorBanner.resize(totalWidth, totalHeight);

	// デバッグカードレンダラー（handRendererの子要素）
	if (ctx.ui.debugCardRenderer) {
		ctx.ui.debugCardRenderer.getContainer().y = CARD_HEIGHT + 10;
	}
}
