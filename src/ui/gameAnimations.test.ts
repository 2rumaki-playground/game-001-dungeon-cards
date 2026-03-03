/**
 * ダメージポップアップがコンボボーナスを反映するテスト
 */

import { describe, expect, it, vi } from "vitest";
import { PLAYER_FIRE_DAMAGE, PLAYER_THUNDER_DAMAGE } from "../constants";

// gameRenderer モック（applyState, renderを無効化）
vi.mock("./gameRenderer", () => ({
	applyState: vi.fn(),
	render: vi.fn(),
}));

// exchangeFlow モック
vi.mock("./exchangeFlow", () => ({
	executeExchangeFlow: vi.fn(),
}));

// coordinates モック
vi.mock("./coordinates", () => ({
	getViewportPixelSize: () => ({ width: 800, height: 600 }),
	gridToParticlePosition: () => ({ x: 0, y: 0 }),
}));

// battleParticles モック
vi.mock("./battleParticles", () => ({
	getMagicParticleConfig: vi.fn(() => ({})),
	createDefeatParticleConfig: vi.fn(() => ({})),
}));

// layout モック
vi.mock("./layout", () => ({
	HAND_AREA_HEIGHT: 100,
}));

// tween モック
vi.mock("../utils/tween", () => ({
	Easing: { easeOutCubic: (t: number) => t },
	tweenValue: vi.fn(() => Promise.resolve()),
}));

import type { GameContext } from "../gameContext";
import type { GameState } from "../types";
import { updateStateWithAttackAnimation } from "./gameAnimations";

/**
 * テスト用の最小限GameContextモックを作成
 */
function createMockCtx(
	enemies: { id: string; position: { x: number; y: number } }[],
): {
	ctx: GameContext;
	animateAttackHitSpy: ReturnType<typeof vi.fn>;
} {
	const animateAttackHitSpy = vi.fn(() => Promise.resolve());
	const ctx = {
		isAnimating: false,
		state: {
			enemies,
		},
		ui: {
			cameraDragController: { reset: vi.fn() },
			mapRenderer: {
				getContainer: vi.fn(() => ({ x: 0, y: 0 })),
				animateAttackHit: animateAttackHitSpy,
				animateEnemyDefeat: vi.fn(() => Promise.resolve()),
			},
			particleSystem: {
				getContainer: vi.fn(() => ({ x: 0, y: 0 })),
				emit: vi.fn(() => Promise.resolve()),
			},
			actionLogRenderer: { getWidth: () => 200 },
		},
	} as unknown as GameContext;

	return { ctx, animateAttackHitSpy };
}

describe("updateStateWithAttackAnimation ダメージポップアップ", () => {
	it("通常攻撃でコンボなしの場合、基本ダメージのみをポップアップに渡す", async () => {
		const enemyId = "e1";
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 2 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "fire");

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_FIRE_DAMAGE,
		);
	});

	it("通常攻撃でコンボボーナスがある場合、合計ダメージをポップアップに渡す", async () => {
		const enemyId = "e1";
		const comboBonus = 1;
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 1 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "fire", {
			comboBonus,
		});

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_FIRE_DAMAGE + comboBonus,
		);
	});

	it("強攻撃ではコンボボーナスが加算されない（comboBonus未指定）", async () => {
		const enemyId = "e1";
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 1 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "thunder");

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_THUNDER_DAMAGE,
		);
	});

	it("通常攻撃でレベルボーナスがある場合、合計ダメージをポップアップに渡す", async () => {
		const enemyId = "e1";
		const levelBonus = 1;
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 1 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "fire", {
			levelBonus,
		});

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_FIRE_DAMAGE + levelBonus,
		);
	});

	it("強攻撃でレベルボーナスがある場合、合計ダメージをポップアップに渡す", async () => {
		const enemyId = "e1";
		const levelBonus = 2;
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 1 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "thunder", {
			levelBonus,
		});

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_THUNDER_DAMAGE + levelBonus,
		);
	});

	it("通常攻撃でレベルボーナス＋コンボボーナスがある場合、合計ダメージをポップアップに渡す", async () => {
		const enemyId = "e1";
		const comboBonus = 1;
		const levelBonus = 1;
		const { ctx, animateAttackHitSpy } = createMockCtx([
			{ id: enemyId, position: { x: 1, y: 0 } },
		]);
		const newState = {
			enemies: [{ id: enemyId, position: { x: 1, y: 0 }, hp: 1 }],
		} as unknown as GameState;

		await updateStateWithAttackAnimation(ctx, newState, enemyId, "fire", {
			comboBonus,
			levelBonus,
		});

		expect(animateAttackHitSpy).toHaveBeenCalledWith(
			enemyId,
			PLAYER_FIRE_DAMAGE + comboBonus + levelBonus,
		);
	});
});
