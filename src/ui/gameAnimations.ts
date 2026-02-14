/**
 * アニメーション付きゲーム状態更新関数群
 */

import {
	LOG_AREA_GAP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_STRONG_ATTACK_DAMAGE,
	STATUS_BAR_HEIGHT,
} from "../constants";
import type { GameContext } from "../gameContext";
import type { Direction, GameState, Position } from "../types";
import { DIRECTION_DELTA } from "../types";
import { Easing, tweenValue } from "../utils/tween";
import {
	type AttackCardType,
	createDefeatParticleConfig,
	getAttackParticleConfig,
} from "./battleParticles";
import { getViewportPixelSize, gridToParticlePosition } from "./coordinates";
import { executeExchangeFlow } from "./exchangeFlow";
import { applyState, render } from "./gameRenderer";
import { HAND_AREA_HEIGHT } from "./layout";

/**
 * 固定ビューポートサイズから画面サイズを計算
 */
export function getScreenSize(ctx: GameContext): {
	width: number;
	height: number;
} {
	const viewportSize = getViewportPixelSize();
	return {
		width:
			viewportSize.width + LOG_AREA_GAP + ctx.ui.actionLogRenderer.getWidth(),
		height: viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
	};
}

/**
 * ゲームエリア（ログエリアを除いた領域）のサイズを計算
 */
export function getGameAreaSize(_ctx: GameContext): {
	width: number;
	height: number;
} {
	const viewportSize = getViewportPixelSize();
	return {
		width: viewportSize.width,
		height: viewportSize.height + HAND_AREA_HEIGHT + STATUS_BAR_HEIGHT,
	};
}

/** カメラ追従アニメーションの時間（ミリ秒） */
const CAMERA_FOLLOW_DURATION = 250;

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

	// ドラッグオフセットをリセット（カメラをプレイヤー中心に復帰、ズームは維持）
	ctx.ui.cameraDragController.reset(false);

	const prevAp = ctx.state.player.ap;

	// render前にカメラ位置を保存
	const mapContainer = ctx.ui.mapRenderer.getContainer();
	const savedCameraX = mapContainer.x;
	const savedCameraY = mapContainer.y;

	applyState(ctx, newState);

	// render後の新しいカメラ位置（失敗時もfinallyでスナップするためtryの外で保持）
	let newCameraX = savedCameraX;
	let newCameraY = savedCameraY;

	try {
		// プレイヤー以外を描画（renderでカメラが新位置にジャンプする）
		render(ctx, false, true);

		// render後の新しいカメラ位置を取得し、移動中は旧位置に復元
		newCameraX = mapContainer.x;
		newCameraY = mapContainer.y;
		mapContainer.x = savedCameraX;
		mapContainer.y = savedCameraY;

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

		// カメラ追従アニメーション（位置が変わっている場合のみ）
		if (savedCameraX !== newCameraX || savedCameraY !== newCameraY) {
			await tweenValue({
				duration: CAMERA_FOLLOW_DURATION,
				easing: Easing.easeOutCubic,
				onUpdate: (progress) => {
					mapContainer.x =
						savedCameraX + (newCameraX - savedCameraX) * progress;
					mapContainer.y =
						savedCameraY + (newCameraY - savedCameraY) * progress;
				},
			});
		}
	} finally {
		// アニメーション失敗時もカメラを正しい位置にスナップ
		mapContainer.x = newCameraX;
		mapContainer.y = newCameraY;
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

	// ドラッグオフセットをリセット（ズームは維持）
	ctx.ui.cameraDragController.reset(false);

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
 * プレイヤー攻撃ヒット時のアニメーション付きで状態を更新
 * @param cardType 使用したカードタイプ（ダメージ値算出・パーティクル演出に使用）
 * @param overkill 超過ダメージ量（0で従来同等、正値で撃破演出が段階的に強化される）
 */
export async function updateStateWithAttackAnimation(
	ctx: GameContext,
	newState: GameState,
	hitEnemyId: string,
	cardType: AttackCardType = "attack",
	overkill = 0,
): Promise<void> {
	if (ctx.isAnimating) return;
	ctx.isAnimating = true;

	// ドラッグオフセットをリセット（ズームは維持）
	ctx.ui.cameraDragController.reset(false);

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
			const center = gridToParticlePosition(
				hitEnemy.position,
				ctx.ui.mapRenderer.getContainer(),
				ctx.ui.particleSystem.getContainer(),
			);
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
				const center = gridToParticlePosition(
					hitEnemy.position,
					ctx.ui.mapRenderer.getContainer(),
					ctx.ui.particleSystem.getContainer(),
				);
				defeatAnimations.push(
					ctx.ui.particleSystem.emit(
						createDefeatParticleConfig(center, overkill),
					),
				);
			}
			await Promise.all(defeatAnimations);
			// 撃破後、敵描画を反映
			render(ctx);

			// カード交換条件達成時に交換UIを表示
			if (newState.cardExchangeState) {
				const exchangedState = await executeExchangeFlow(ctx, newState);
				applyState(ctx, exchangedState);
				render(ctx);
			}
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

	// ドラッグオフセットをリセット（ズームは維持）
	ctx.ui.cameraDragController.reset(false);

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
