/**
 * パーティクル生成・更新の純粋関数群（PixiJS依存なし）
 */

export type Vec2 = { x: number; y: number };

export type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	initialSize: number;
	color: number;
};

export type EmitPattern =
	| { type: "radial" }
	| { type: "directional"; angle: number; spread: number }
	| { type: "random" };

export type ParticleConfig = {
	count: number;
	origin: Vec2;
	color: number | number[];
	speed: { min: number; max: number };
	life: { min: number; max: number };
	size: { min: number; max: number };
	pattern: EmitPattern;
	gravity?: number;
};

/** 乱数関数の型（テスト注入用） */
type RandomFn = () => number;

/** min〜maxの範囲でランダム値を生成 */
function lerp(min: number, max: number, t: number): number {
	return min + (max - min) * t;
}

/**
 * パターン別の初期速度を計算
 */
export function calcEmitVelocity(
	pattern: EmitPattern,
	speed: { min: number; max: number },
	random: RandomFn,
): Vec2 {
	const s = lerp(speed.min, speed.max, random());

	switch (pattern.type) {
		case "radial": {
			const angle = random() * Math.PI * 2;
			return { x: Math.cos(angle) * s, y: Math.sin(angle) * s };
		}
		case "directional": {
			const halfSpread = pattern.spread / 2;
			const angle = pattern.angle + lerp(-halfSpread, halfSpread, random());
			return { x: Math.cos(angle) * s, y: Math.sin(angle) * s };
		}
		case "random": {
			const vx = (random() - 0.5) * 2 * s;
			const vy = (random() - 0.5) * 2 * s;
			return { x: vx, y: vy };
		}
	}
}

/**
 * 設定からパーティクル配列を生成
 */
export function createParticles(
	config: ParticleConfig,
	random: RandomFn = Math.random,
): Particle[] {
	const particles: Particle[] = [];
	const colors = Array.isArray(config.color) ? config.color : [config.color];

	if (colors.length === 0) {
		throw new Error("ParticleConfig.color must not be an empty array");
	}

	for (let i = 0; i < config.count; i++) {
		const velocity = calcEmitVelocity(config.pattern, config.speed, random);
		const life = lerp(config.life.min, config.life.max, random());
		const size = lerp(config.size.min, config.size.max, random());
		const colorIndex = Math.min(
			Math.floor(random() * colors.length),
			colors.length - 1,
		);
		const color = colors[colorIndex];

		particles.push({
			x: config.origin.x,
			y: config.origin.y,
			vx: velocity.x,
			vy: velocity.y,
			life,
			maxLife: life,
			size,
			initialSize: size,
			color,
		});
	}

	return particles;
}

/**
 * パーティクルの位置・寿命・サイズを更新し、死亡パーティクルを除外
 */
export function updateParticles(
	particles: Particle[],
	deltaMS: number,
	gravity = 0,
): Particle[] {
	const alive: Particle[] = [];

	for (const p of particles) {
		const life = p.life - deltaMS;
		if (life <= 0) continue;

		const lifeRatio = life / p.maxLife;
		alive.push({
			...p,
			x: p.x + p.vx * deltaMS,
			y: p.y + p.vy * deltaMS,
			vy: p.vy + gravity * deltaMS,
			life,
			size: p.initialSize * lifeRatio,
		});
	}

	return alive;
}

/**
 * 全パーティクルが消滅したかを判定
 */
export function isAllDead(particles: Particle[]): boolean {
	return particles.length === 0;
}
