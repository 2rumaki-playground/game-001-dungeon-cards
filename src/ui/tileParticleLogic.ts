/**
 * タイル常駐パーティクルの純粋ロジック（PixiJS依存なし）
 */

import { COLORS } from "../constants";
import type { SpecialTileType } from "../types/map";

export type TileParticleMovement = "rise" | "orbit" | "float";

export type TileParticleShape = "circle" | "diamond";

export type TileParticleEmitterConfig = {
	movement: TileParticleMovement;
	shape: TileParticleShape;
	colors: number[];
	maxParticles: number;
	/** スポーン間隔（ms） */
	spawnInterval: number;
	lifetime: { min: number; max: number };
	size: { min: number; max: number };
	maxAlpha: number;
};

export type TileParticle = {
	age: number;
	maxLife: number;
	size: number;
	color: number;
	movement: TileParticleMovement;
	/** 振動の位相オフセット */
	phase: number;
	/** 公転の初期角度（orbit用） */
	orbitAngle: number;
	/** 初期X座標オフセット */
	initialX: number;
	/** 初期Y座標オフセット */
	initialY: number;
};

const TRAP_CONFIG: TileParticleEmitterConfig = {
	movement: "rise",
	shape: "circle",
	colors: [0x9b59b6, 0x8e44ad, 0x7d3c98, 0xaf7ac5],
	maxParticles: 5,
	spawnInterval: 400,
	lifetime: { min: 1500, max: 2500 },
	size: { min: 2, max: 4 },
	maxAlpha: 0.7,
};

const TREASURE_CONFIG: TileParticleEmitterConfig = {
	movement: "orbit",
	shape: "diamond",
	colors: [COLORS.treasure, 0xf1c40f, 0xe6b800, 0xf5d442],
	maxParticles: 6,
	spawnInterval: 350,
	lifetime: { min: 2000, max: 3000 },
	size: { min: 2, max: 3.5 },
	maxAlpha: 0.8,
};

const REST_AREA_CONFIG: TileParticleEmitterConfig = {
	movement: "float",
	shape: "circle",
	colors: [0x44aa88, 0x27ae60, 0x2ecc71, 0x1abc9c],
	maxParticles: 4,
	spawnInterval: 500,
	lifetime: { min: 2500, max: 3500 },
	size: { min: 2, max: 3.5 },
	maxAlpha: 0.6,
};

const CONFIGS: Record<SpecialTileType, TileParticleEmitterConfig> = {
	trap: TRAP_CONFIG,
	treasure: TREASURE_CONFIG,
	rest_area: REST_AREA_CONFIG,
};

export function getTileParticleEmitterConfig(
	tileType: SpecialTileType,
): TileParticleEmitterConfig {
	return CONFIGS[tileType];
}

export function spawnTileParticle(
	config: TileParticleEmitterConfig,
	cellSize: number,
	random: () => number = Math.random,
): TileParticle {
	const half = cellSize * 0.5;
	const colorIndex = Math.min(
		Math.floor(random() * config.colors.length),
		config.colors.length - 1,
	);

	let initialX = 0;
	let initialY = 0;

	switch (config.movement) {
		case "rise":
			initialX = (random() - 0.5) * half * 0.6;
			initialY = half * (0.2 + random() * 0.3);
			break;
		case "float":
			initialX = (random() - 0.5) * half * 0.4;
			initialY = (random() - 0.5) * half * 0.4;
			break;
		case "orbit":
			break;
	}

	return {
		age: 0,
		maxLife:
			config.lifetime.min +
			random() * (config.lifetime.max - config.lifetime.min),
		size: config.size.min + random() * (config.size.max - config.size.min),
		color: config.colors[colorIndex],
		movement: config.movement,
		phase: random() * Math.PI * 2,
		orbitAngle: config.movement === "orbit" ? random() * Math.PI * 2 : 0,
		initialX,
		initialY,
	};
}

export function shouldSpawn(
	particles: TileParticle[],
	config: TileParticleEmitterConfig,
	timeSinceLastSpawn: number,
): boolean {
	return (
		particles.length < config.maxParticles &&
		timeSinceLastSpawn >= config.spawnInterval
	);
}

/**
 * パーティクルのalpha値を算出（フェードイン/アウト）
 */
export function calcTileParticleAlpha(
	particle: TileParticle,
	maxAlpha: number,
): number {
	const ratio = particle.age / particle.maxLife;
	if (ratio < 0.2) return (ratio / 0.2) * maxAlpha;
	if (ratio > 0.7) return ((1 - ratio) / 0.3) * maxAlpha;
	return maxAlpha;
}

/**
 * パーティクルのタイル中心からのオフセット位置を算出
 */
export function calcTileParticlePosition(
	p: TileParticle,
	cellSize: number,
): { x: number; y: number } {
	const half = cellSize * 0.5;

	switch (p.movement) {
		case "rise": {
			const riseSpeed = half * 0.0004;
			return {
				x: p.initialX + Math.sin(p.age * 0.003 + p.phase) * half * 0.2,
				y: p.initialY - p.age * riseSpeed,
			};
		}
		case "orbit": {
			const radius = half * 0.35;
			const angle = p.orbitAngle + p.age * 0.002;
			return {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
			};
		}
		case "float": {
			return {
				x: p.initialX + Math.sin(p.age * 0.0012 + p.phase) * half * 0.25,
				y: p.initialY + Math.cos(p.age * 0.0008 + p.phase * 1.7) * half * 0.2,
			};
		}
	}
}

/**
 * パーティクルを経過時間分だけ進め、寿命が尽きたものを除去
 */
export function updateTileParticles(
	particles: TileParticle[],
	deltaMS: number,
): TileParticle[] {
	const alive: TileParticle[] = [];
	for (const p of particles) {
		const newAge = p.age + deltaMS;
		if (newAge >= p.maxLife) continue;
		alive.push({ ...p, age: newAge });
	}
	return alive;
}
