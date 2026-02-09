/**
 * アニメーション付きゲーム状態更新関数群
 */

import {
	DECK_MAX_SIZE,
	LOG_AREA_GAP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
	STATUS_BAR_HEIGHT,
} from "../constants";
import {
	addRewardCardToDeck,
	createRewardState,
	getTotalDeckSize,
	removeCardFromDeck,
	returnToTitle,
	shouldShowVictoryScreen,
	shouldTriggerCardRemoval,
	transitionFloor,
} from "../game";
import type { GameContext } from "../gameContext";
import type { CardType, Direction, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { deleteSaveData, hasSaveData } from "../utils/storage";
import {
	type AttackCardType,
	createDefeatParticleConfig,
	getAttackParticleConfig,
} from "./battleParticles";
import { getMapPixelSize, gridToCenterPixel } from "./coordinates";
import { applyState, render, updateState } from "./gameRenderer";
import { HAND_AREA_HEIGHT } from "./layout";
import { relayoutUI } from "./relayout";

/**
 * 現在のマップサイズから画面サイズを計算
 */
export function getScreenSize(ctx: GameContext): {
	width: number;
	height: number;
} {
	const mapWidth = ctx.state.map[0]?.length ?? 0;
	const mapHeight = ctx.state.map.length;
	if (mapWidth === 0 || mapHeight === 0) {
		return {
			width: ctx.app.renderer.width,
			height: ctx.app.renderer.height,
		};
	}
	const mapPixelSize = getMapPixelSize(mapWidth, mapHeight);
	return {
		width:
			mapPixelSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth(),
		height: mapPixelSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
	};
}

/**
 * ゲーム状態を更新してプレイヤー移動アニメーション付きで再描画
 */
export async function updateStateWithMoveAnimation(
	ctx: GameContext,
	newState: GameState,
	targetGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	applyState(ctx, newState);

	try {
		// プレイヤー以外を描画
		render(ctx, false, true);

		// プレイヤー移動アニメーション（AP変化があればバーアニメーションも並列実行）
		const animations: Promise<void>[] = [
			ctx.ui.mapRenderer.animatePlayerMove(targetGridPos),
		];
		if (prevAp !== newState.player.ap) {
			animations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(animations);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 報酬フローを実行する
 *
 * 撃破数に応じた報酬カード選択肢を全て表示し、
 * ユーザーが1枚選択（またはスキップ）するまで待機する。
 * @see docs/spec/deckbuilding.md「報酬画面」
 */
async function executeRewardFlow(
	ctx: GameContext,
	state: GameState,
): Promise<GameState> {
	const result = createRewardState(state);
	if (!result) return state;

	let current: GameState = {
		...result.updatedState,
		screen: "reward" as const,
		rewardState: result.rewardState,
	};

	// 報酬画面に遷移した状態を適用してから描画する
	applyState(ctx, current);
	render(ctx);

	const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);

	const needsReplacement = getTotalDeckSize(current.deck) >= DECK_MAX_SIZE;

	if (needsReplacement) {
		// 入れ替えモード（仕様準拠）: まず除去カード選択→その後報酬カード選択→追加
		// スキップ時は除去も追加も行わない（デッキ枚数不変）
		// @see docs/spec/deckbuilding.md「デッキ上限到達時の入手」
		const removeResult = await showRemoveCardSelection(
			ctx,
			current,
			screenWidth,
			screenHeight,
		);
		if (removeResult !== null) {
			const beforeRemove = current;
			current = removeCardFromDeck(current, removeResult);
			// 除去後に報酬カード選択
			const selectedIndex = await showRewardCardSelection(
				ctx,
				result.rewardState.choices,
				screenWidth,
				screenHeight,
			);
			if (selectedIndex !== null) {
				current = addRewardCardToDeck(
					current,
					result.rewardState.choices[selectedIndex],
				);
			} else {
				// 報酬スキップ時は除去もロールバック（仕様: 枚数不変）
				current = beforeRemove;
			}
		}
	} else {
		// 通常モード: 選択肢から1枚選択 or スキップ
		const selectedIndex = await showRewardCardSelection(
			ctx,
			result.rewardState.choices,
			screenWidth,
			screenHeight,
		);
		if (selectedIndex !== null) {
			current = addRewardCardToDeck(
				current,
				result.rewardState.choices[selectedIndex],
			);
		}
	}

	// 報酬完了: ゲーム画面に戻す
	return { ...current, screen: "game", rewardState: null };
}

/**
 * 報酬カード選択をPromiseで待機する
 *
 * 全選択肢を表示し、ユーザーが1枚選択するかスキップするまで待機する。
 * @returns 選択されたカードのインデックス（スキップ時はnull）
 */
function showRewardCardSelection(
	ctx: GameContext,
	choices: CardType[],
	screenWidth: number,
	screenHeight: number,
): Promise<number | null> {
	return new Promise((resolve) => {
		ctx.ui.rewardScreen.render(choices, screenWidth, screenHeight);
		ctx.ui.rewardScreen.show();

		ctx.ui.rewardScreen.setOnCardSelect(async (index) => {
			ctx.ui.rewardScreen.setOnCardSelect(() => {});
			ctx.ui.rewardScreen.setOnSkip(() => {});
			try {
				await ctx.ui.rewardScreen.animateCardAcquire(index, choices[index]);
			} catch (error) {
				console.warn("カード取得アニメーション中にエラー:", error);
			}
			resolve(index);
		});

		ctx.ui.rewardScreen.setOnSkip(() => {
			ctx.ui.rewardScreen.setOnCardSelect(() => {});
			ctx.ui.rewardScreen.setOnSkip(() => {});
			resolve(null);
		});
	});
}

/**
 * カード除去選択画面をPromiseで待機する
 */
function showRemoveCardSelection(
	ctx: GameContext,
	state: GameState,
	screenWidth: number,
	screenHeight: number,
	title?: string,
): Promise<string | null> {
	return new Promise((resolve) => {
		const allCards = [
			...state.deck.drawPile,
			...state.deck.hand,
			...state.deck.discardPile,
		];

		ctx.ui.rewardScreen.renderRemoveSelection(
			allCards,
			screenWidth,
			screenHeight,
			title,
		);
		ctx.ui.rewardScreen.show();

		ctx.ui.rewardScreen.setOnRemoveCard((cardId) => {
			resolve(cardId);
		});

		ctx.ui.rewardScreen.setOnSkip(() => {
			resolve(null);
		});
	});
}

/**
 * カード除去イベントを実行する
 *
 * 全敵撃破かつデッキ枚数が最小値を超えている場合、30%の確率で除去イベントが発生。
 * 報酬フローの前に挿入される。
 * @see docs/spec/deckbuilding.md「カード除去」
 */
async function executeCardRemovalEvent(
	ctx: GameContext,
	state: GameState,
	screenWidth: number,
	screenHeight: number,
): Promise<GameState> {
	const { triggered, updatedState } = shouldTriggerCardRemoval(state);
	if (!triggered) return updatedState;

	// 除去イベント中は報酬フローと同様に screen を "reward" 扱いにして描画する
	const prevScreen = updatedState.screen;
	const removalState: GameState = {
		...updatedState,
		screen: "reward",
	};
	applyState(ctx, removalState);
	render(ctx);

	const removeResult = await showRemoveCardSelection(
		ctx,
		removalState,
		screenWidth,
		screenHeight,
		"カード除去イベント",
	);

	let resultState: GameState;
	if (removeResult !== null) {
		resultState = removeCardFromDeck(removalState, removeResult);
	} else {
		resultState = removalState;
	}

	// 除去イベント終了後は元の screen に戻して返す
	return {
		...resultState,
		screen: prevScreen,
	};
}

/**
 * 階段への移動アニメーション後に報酬フロー→階層遷移する
 */
export async function updateStateWithStairsAnimation(
	ctx: GameContext,
	stairsState: GameState,
	stairsGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	try {
		// 1. 現在のマップ上で階段マスへ移動アニメーション
		await ctx.ui.mapRenderer.animatePlayerMove(stairsGridPos);

		applyState(ctx, stairsState);

		const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);

		// 2. カード除去イベント（報酬フローの前）
		const afterRemoval = await executeCardRemovalEvent(
			ctx,
			stairsState,
			screenWidth,
			screenHeight,
		);

		// 3. 報酬フロー（撃破数0ならスキップ）
		const afterReward = await executeRewardFlow(ctx, afterRemoval);

		// 4. 勝利画面（クリア階層のボス撃破済みの場合）
		if (shouldShowVictoryScreen(afterReward)) {
			const victoryResult = await showVictoryScreen(ctx, afterReward);
			if (victoryResult === "title") return;
		}

		// 5. 階層遷移
		const transitioned = transitionFloor(afterReward);

		// 6. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(transitioned.floor);
			applyState(ctx, transitioned);
			relayoutUI(ctx);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 7. フェードイン後にシャッフル演出→手札配布アニメーション
		// 階層遷移時は全デッキリシャッフルが行われるため常にシャッフル演出を表示
		await ctx.ui.handRenderer.animateShuffle();
		await ctx.ui.handRenderer.renderWithAnimation(
			ctx.state.deck.hand,
			ctx.state.player.ap,
			transitioned.deck.hand.length,
		);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 壁にぶつかった時のバンプアニメーション付きで状態を更新
 */
export async function updateStateWithBumpAnimation(
	ctx: GameContext,
	newState: GameState,
	direction: Direction,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	applyState(ctx, newState);

	try {
		render(ctx, false, true);

		const animations: Promise<void>[] = [
			ctx.ui.mapRenderer.animatePlayerBump(direction),
		];
		if (prevAp !== newState.player.ap) {
			animations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(animations);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 突進で2マス目が階段の場合のアニメーション
 * 1マス目への移動→2マス目（階段）への移動→報酬フロー→フェードトランジション→階層遷移
 */
export async function animateRushWithStairs(
	ctx: GameContext,
	stairsState: GameState,
	intermediatePos: Position,
	stairsPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	try {
		// 1. 中間位置（1マス目）へ移動アニメーション
		await ctx.ui.mapRenderer.animatePlayerMove(intermediatePos);

		// 2. 階段位置（2マス目）へ移動アニメーション
		await ctx.ui.mapRenderer.animatePlayerMove(stairsPos);

		applyState(ctx, stairsState);

		const { width: screenWidth, height: screenHeight } = getScreenSize(ctx);

		// 3. カード除去イベント（報酬フローの前）
		const afterRemoval = await executeCardRemovalEvent(
			ctx,
			stairsState,
			screenWidth,
			screenHeight,
		);

		// 4. 報酬フロー
		const afterReward = await executeRewardFlow(ctx, afterRemoval);

		// 5. 勝利画面（20Fボス撃破済みの場合）
		if (shouldShowVictoryScreen(afterReward)) {
			const victoryResult = await showVictoryScreen(ctx, afterReward);
			if (victoryResult === "title") return;
		}

		// 6. 階層遷移
		const transitioned = transitionFloor(afterReward);

		// 7. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(transitioned.floor);
			applyState(ctx, transitioned);
			relayoutUI(ctx);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 8. フェードイン後にシャッフル演出→手札配布アニメーション
		// 階層遷移時は全デッキリシャッフルが行われるため常にシャッフル演出を表示
		await ctx.ui.handRenderer.animateShuffle();
		await ctx.ui.handRenderer.renderWithAnimation(
			ctx.state.deck.hand,
			ctx.state.player.ap,
			transitioned.deck.hand.length,
		);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * プレイヤー攻撃ヒット時のアニメーション付きで状態を更新
 * @param cardType 使用したカードタイプ（ダメージ値算出・パーティクル演出に使用）
 */
export async function updateStateWithAttackAnimation(
	ctx: GameContext,
	newState: GameState,
	hitEnemyId: string,
	cardType: AttackCardType = "attack",
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	const hitEnemy = ctx.state.enemies.find((e) => e.id === hitEnemyId);
	const defeated = !newState.enemies.some((e) => e.id === hitEnemyId);
	applyState(ctx, newState);

	try {
		// 撃破時は敵の再描画をスキップ（アニメーション用にGraphicsを保持）
		render(ctx, false, false, defeated);

		// ヒットエフェクト（AP変化があればバーアニメーションも並列実行）
		const damage =
			cardType === "strong_attack"
				? PLAYER_STRONG_ATTACK_DAMAGE
				: PLAYER_ATTACK_DAMAGE;
		const hitAnimations: Promise<void>[] = [
			ctx.ui.mapRenderer.animateAttackHit(hitEnemyId, damage),
		];
		if (prevAp !== newState.player.ap) {
			hitAnimations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}

		// カードタイプ別パーティクル
		if (hitEnemy) {
			const center = gridToCenterPixel(hitEnemy.position);
			hitAnimations.push(
				ctx.ui.particleSystem.emit(getAttackParticleConfig(cardType, center)),
			);
		}

		await Promise.all(hitAnimations);

		// 撃破演出
		if (defeated) {
			const defeatAnimations: Promise<void>[] = [
				ctx.ui.mapRenderer.animateEnemyDefeat(hitEnemyId),
			];
			if (hitEnemy) {
				const center = gridToCenterPixel(hitEnemy.position);
				defeatAnimations.push(
					ctx.ui.particleSystem.emit(createDefeatParticleConfig(center)),
				);
			}
			await Promise.all(defeatAnimations);
			// 撃破後、敵描画を反映
			render(ctx);
		}
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * プレイヤー攻撃ミス時のアニメーション付きで状態を更新
 */
export async function updateStateWithMissAnimation(
	ctx: GameContext,
	newState: GameState,
	direction: Direction,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	const delta = DIRECTION_DELTA[direction];
	const rawTargetX = ctx.state.player.position.x + delta.x;
	const rawTargetY = ctx.state.player.position.y + delta.y;
	const mapWidth = newState.map[0]?.length ?? 0;
	const mapHeight = newState.map.length;
	const targetGridPos: Position = {
		x: Math.max(0, Math.min(mapWidth - 1, rawTargetX)),
		y: Math.max(0, Math.min(mapHeight - 1, rawTargetY)),
	};
	applyState(ctx, newState);

	try {
		render(ctx);

		const animations: Promise<void>[] = [
			ctx.ui.mapRenderer.animateMissPopup(targetGridPos),
		];
		if (prevAp !== newState.player.ap) {
			animations.push(
				ctx.ui.statusBar.animateApChange(
					prevAp,
					newState.player.ap,
					newState.player.maxAp,
				),
			);
		}
		await Promise.all(animations);
	} finally {
		ctx.isAnimating = false;
	}
}

/**
 * 勝利画面を表示し、ユーザーの選択を待機する
 * @returns "continue" で次フロアへ、"title" でタイトルに戻る
 */
function showVictoryScreen(
	ctx: GameContext,
	state: GameState,
): Promise<"continue" | "title"> {
	return new Promise((resolve) => {
		const victoryState: GameState = { ...state, screen: "victory" };
		applyState(ctx, victoryState);
		render(ctx);

		ctx.ui.victoryScreen.setOnContinue(() => {
			ctx.ui.victoryScreen.setOnContinue(() => {});
			ctx.ui.victoryScreen.setOnReturnToTitle(() => {});
			// ゲーム画面に戻す
			const continueState: GameState = { ...state, screen: "game" };
			applyState(ctx, continueState);
			resolve("continue");
		});

		ctx.ui.victoryScreen.setOnReturnToTitle(async () => {
			ctx.ui.victoryScreen.setOnContinue(() => {});
			ctx.ui.victoryScreen.setOnReturnToTitle(() => {});
			deleteSaveData();
			await ctx.ui.screenTransition.fadeTransition(() => {
				updateState(ctx, returnToTitle(ctx.state));
				const screen = getScreenSize(ctx);
				ctx.ui.titleScreen.render(screen.width, screen.height, hasSaveData());
			});
			resolve("title");
		});
	});
}
