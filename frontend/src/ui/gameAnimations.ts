/**
 * アニメーション付きゲーム状態更新関数群
 */

import {
	DECK_MAX_SIZE,
	LOG_AREA_GAP,
	PLAYER_ATTACK_DAMAGE,
} from "../constants";
import {
	addRewardCardToDeck,
	createRewardState,
	getTotalDeckSize,
	removeCardFromDeck,
	transitionFloor,
} from "../game";
import type { GameContext } from "../gameContext";
import type { CardType, Direction, GameState, Position } from "../types";
import { applyState, render } from "./gameRenderer";
import { HAND_AREA_HEIGHT } from "./layout";

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
 * 撃破数に応じた報酬カード選択画面を表示し、
 * ユーザーの選択が完了するまで待機する。
 */
async function executeRewardFlow(
	ctx: GameContext,
	state: GameState,
): Promise<GameState> {
	const rewardState = createRewardState(state);
	if (!rewardState) return state;

	let current: GameState = {
		...state,
		screen: "reward" as const,
		rewardState,
	};

	const mapSize = ctx.ui.mapRenderer.getContainer().parent
		? { width: ctx.ui.mapRenderer.getContainer().width, height: 0 }
		: { width: 480, height: 0 };
	const screenWidth =
		mapSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth();
	const screenHeight =
		ctx.ui.mapRenderer.getContainer().parent?.height ?? HAND_AREA_HEIGHT + 400;

	// 各選択肢を順次処理
	for (let i = 0; i < rewardState.choices.length; i++) {
		const needsReplacement = getTotalDeckSize(current.deck) >= DECK_MAX_SIZE;

		if (needsReplacement) {
			// 入れ替えモード: まず除去カード選択
			const removeResult = await showRemoveCardSelection(
				ctx,
				current,
				rewardState.choices[i],
				screenWidth,
				screenHeight,
			);
			if (removeResult === null) {
				// スキップ
				continue;
			}
			// カード除去
			current = removeCardFromDeck(current, removeResult);
			// 報酬カード追加
			current = addRewardCardToDeck(current, rewardState.choices[i]);
		} else {
			// 通常モード: 選択 or スキップ
			const selected = await showRewardCardSelection(
				ctx,
				current,
				rewardState,
				i,
				screenWidth,
				screenHeight,
			);
			if (selected) {
				current = addRewardCardToDeck(current, rewardState.choices[i]);
				rewardState.selectedCards[i] = rewardState.choices[i];
			}
		}

		// 状態を更新して再描画
		current = { ...current, rewardState: { ...rewardState } };
		applyState(ctx, current);
		render(ctx);
	}

	// 報酬完了: ゲーム画面に戻す
	return { ...current, screen: "game", rewardState: null };
}

/**
 * 報酬カード選択をPromiseで待機する
 */
function showRewardCardSelection(
	ctx: GameContext,
	_state: GameState,
	rewardState: {
		choices: CardType[];
		selectedCards: (CardType | null)[];
	},
	currentIndex: number,
	screenWidth: number,
	screenHeight: number,
): Promise<boolean> {
	return new Promise((resolve) => {
		ctx.ui.rewardScreen.render(
			rewardState.choices,
			rewardState.selectedCards,
			screenWidth,
			screenHeight,
		);
		ctx.ui.rewardScreen.show();

		ctx.ui.rewardScreen.setOnCardSelect((index) => {
			if (index === currentIndex) {
				resolve(true);
			}
		});

		ctx.ui.rewardScreen.setOnSkip((index) => {
			if (index === currentIndex) {
				resolve(false);
			}
		});
	});
}

/**
 * 入れ替えモードのカード除去選択をPromiseで待機する
 */
function showRemoveCardSelection(
	ctx: GameContext,
	state: GameState,
	rewardCardType: CardType,
	screenWidth: number,
	screenHeight: number,
): Promise<string | null> {
	return new Promise((resolve) => {
		const allCards = [
			...state.deck.drawPile,
			...state.deck.hand,
			...state.deck.discardPile,
		];

		ctx.ui.rewardScreen.renderRemoveSelection(
			allCards,
			rewardCardType,
			screenWidth,
			screenHeight,
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

		// 2. 報酬フロー（撃破数0ならスキップ）
		applyState(ctx, stairsState);
		const afterReward = await executeRewardFlow(ctx, stairsState);

		// 3. 階層遷移
		const transitioned = transitionFloor(afterReward);

		// 4. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(transitioned.floor);
			applyState(ctx, transitioned);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 5. フェードイン後に手札配布アニメーション
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

		// 3. 報酬フロー
		applyState(ctx, stairsState);
		const afterReward = await executeRewardFlow(ctx, stairsState);

		// 4. 階層遷移
		const transitioned = transitionFloor(afterReward);

		// 5. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(transitioned.floor);
			applyState(ctx, transitioned);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 6. フェードイン後に手札配布アニメーション
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
 */
export async function updateStateWithAttackAnimation(
	ctx: GameContext,
	newState: GameState,
	hitEnemyId: string,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	const prevAp = ctx.state.player.ap;
	const defeated = !newState.enemies.some((e) => e.id === hitEnemyId);
	applyState(ctx, newState);

	try {
		// 撃破時は敵の再描画をスキップ（アニメーション用にGraphicsを保持）
		render(ctx, false, false, defeated);

		// ヒットエフェクト（AP変化があればバーアニメーションも並列実行）
		const hitAnimations: Promise<void>[] = [
			ctx.ui.mapRenderer.animateAttackHit(hitEnemyId, PLAYER_ATTACK_DAMAGE),
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
		await Promise.all(hitAnimations);

		// 撃破演出
		if (defeated) {
			await ctx.ui.mapRenderer.animateEnemyDefeat(hitEnemyId);
			// 撃破後、敵描画を反映
			render(ctx);
		}
	} finally {
		ctx.isAnimating = false;
	}
}
