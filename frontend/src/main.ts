import { Application, Graphics } from "pixi.js";

const GRID_SIZE = 7;
const CELL_SIZE = 64;
const CELL_GAP = 4;
const GRID_COLOR = 0x3a3a3a;
const BACKGROUND_COLOR = 0x1a1a1a;

async function main() {
	const app = new Application();

	await app.init({
		width: GRID_SIZE * (CELL_SIZE + CELL_GAP) + CELL_GAP,
		height: GRID_SIZE * (CELL_SIZE + CELL_GAP) + CELL_GAP,
		backgroundColor: BACKGROUND_COLOR,
	});

	document.body.appendChild(app.canvas);

	const grid = new Graphics();

	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const x = col * (CELL_SIZE + CELL_GAP) + CELL_GAP;
			const y = row * (CELL_SIZE + CELL_GAP) + CELL_GAP;
			grid.rect(x, y, CELL_SIZE, CELL_SIZE);
			grid.fill(GRID_COLOR);
		}
	}

	app.stage.addChild(grid);
}

main().catch((error) => {
	console.error("アプリケーションの初期化に失敗しました:", error);
	alert("アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。");
});
