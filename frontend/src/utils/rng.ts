/**
 * シード対応乱数生成器
 * Mulberry32アルゴリズムを使用
 * @see docs/spec/mvp/rules.md - ランダム配置の再現性方針
 */

/**
 * 乱数生成器クラス
 */
export class RNG {
	private state: number;
	readonly seed: number;

	/**
	 * @param seed シード値（省略時はランダムなシードを生成）
	 */
	constructor(seed?: number) {
		this.seed = seed ?? this.generateRandomSeed();
		this.state = this.seed;
	}

	/**
	 * ランダムなシード値を生成
	 */
	private generateRandomSeed(): number {
		return Math.floor(Math.random() * 0xffffffff);
	}

	/**
	 * 0以上1未満の乱数を生成
	 */
	random(): number {
		// Mulberry32アルゴリズム
		this.state += 0x6d2b79f5;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
	}

	/**
	 * min以上max未満の整数を生成
	 */
	randomInt(min: number, max: number): number {
		return Math.floor(this.random() * (max - min)) + min;
	}

	/**
	 * 配列をシャッフル（Fisher-Yates）
	 * 元の配列は変更せず、新しい配列を返す
	 */
	shuffle<T>(array: readonly T[]): T[] {
		const result = [...array];
		for (let i = result.length - 1; i > 0; i--) {
			const j = this.randomInt(0, i + 1);
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	/**
	 * 配列からランダムに1つ選択
	 */
	pick<T>(array: readonly T[]): T {
		if (array.length === 0) {
			throw new Error("Cannot pick from empty array");
		}
		return array[this.randomInt(0, array.length)];
	}

	/**
	 * 配列からランダムにn個選択（重複なし）
	 */
	sample<T>(array: readonly T[], n: number): T[] {
		if (n < 0) {
			throw new Error(`Cannot sample negative count: ${n}`);
		}
		if (n > array.length) {
			throw new Error(
				`Cannot sample ${n} items from array of length ${array.length}`,
			);
		}
		return this.shuffle(array).slice(0, n);
	}
}
