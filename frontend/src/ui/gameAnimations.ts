/**
 * アニメーション付きゲーム状態更新関数群
 */

import { PLAYER_ATTACK_DAMAGE } from "../constants";
import type { GameContext } from "../gameContext";
import type { Direction, GameState, Position } from "../types";
import { applyState, render } from "./gameRenderer";

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
 * 階段への移動アニメーション後に階層遷移する
 */
export async function updateStateWithStairsAnimation(
	ctx: GameContext,
	newState: GameState,
	stairsGridPos: Position,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	try {
		// 1. 現在のマップ上で階段マスへ移動アニメーション
		await ctx.ui.mapRenderer.animatePlayerMove(stairsGridPos);

		// 2. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(newState.floor);
			applyState(ctx, newState);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 3. フェードイン後に手札配布アニメーション
		await ctx.ui.handRenderer.renderWithAnimation(
			ctx.state.deck.hand,
			ctx.state.player.ap,
			newState.deck.hand.length,
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
 * 1マス目への移動→2マス目（階段）への移動→フェードトランジション→階層遷移
 */
export async function animateRushWithStairs(
	ctx: GameContext,
	newState: GameState,
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

		// 3. フェードトランジション（暗転中に階層バナー表示 + 状態更新）
		await ctx.ui.screenTransition.fadeTransition(async () => {
			await ctx.ui.floorBanner.show(newState.floor);
			applyState(ctx, newState);
			render(ctx, true);
			await ctx.ui.floorBanner.hide();
		});

		// 4. フェードイン後に手札配布アニメーション
		await ctx.ui.handRenderer.renderWithAnimation(
			ctx.state.deck.hand,
			ctx.state.player.ap,
			newState.deck.hand.length,
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
