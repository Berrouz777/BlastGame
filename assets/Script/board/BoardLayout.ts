type BoardLayoutConfig = Readonly<{
    boardFrame: cc.Node;
    cellsRoot: cc.Node;
    elementsRoot: cc.Node;
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    gapX: number;
    gapY: number;
    paddingX: number;
    paddingY: number;
    contentOffsetX: number;
    contentOffsetY: number;
}>;

export default class BoardLayout {
    constructor(private readonly config: BoardLayoutConfig) {}

    rebuildGrid() {
        this.config.cellsRoot.removeAllChildren();

        for (let row = 0; row < this.config.rows; row++) {
            for (let col = 0; col < this.config.cols; col++) {
                const cell = new cc.Node(`cell_${row}_${col}`);
                cell.setAnchorPoint(0.5, 0.5);
                cell.width = this.config.cellWidth;
                cell.height = this.config.cellHeight;

                const pos = this.getCellCenterIn(this.config.cellsRoot, row, col);
                cell.x = pos.x;
                cell.y = pos.y;
                this.config.cellsRoot.addChild(cell);
            }
        }
    }

    getGridSize() {
        const totalW = this.config.cols * this.config.cellWidth + (this.config.cols - 1) * this.config.gapX;
        const totalH = this.config.rows * this.config.cellHeight + (this.config.rows - 1) * this.config.gapY;
        return { totalW, totalH };
    }

    getFrameInnerRect() {
        const left = -this.config.boardFrame.width * this.config.boardFrame.anchorX + this.config.paddingX;
        const right = left + (this.config.boardFrame.width - this.config.paddingX * 2);
        const bottom = -this.config.boardFrame.height * this.config.boardFrame.anchorY + this.config.paddingY;
        const top = bottom + (this.config.boardFrame.height - this.config.paddingY * 2);
        return { left, right, bottom, top, width: right - left, height: top - bottom };
    }

    getCellCenterInFrame(row: number, col: number) {
        const { width, height, left, top } = this.getFrameInnerRect();
        const gridW = this.config.cols * this.config.cellWidth + (this.config.cols - 1) * this.config.gapX;
        const gridH = this.config.rows * this.config.cellHeight + (this.config.rows - 1) * this.config.gapY;

        const startX = left + (width - gridW) / 2;
        const startY = top - (height - gridH) / 2;

        const x = startX + col * (this.config.cellWidth + this.config.gapX) + this.config.cellWidth / 2 + this.config.contentOffsetX;
        const y = startY - row * (this.config.cellHeight + this.config.gapY) - this.config.cellHeight / 2 + this.config.contentOffsetY;
        return { x, y };
    }

    getCellCenterIn(root: cc.Node, row: number, col: number) {
        const p = this.getCellCenterInFrame(row, col);
        const world = this.config.boardFrame.convertToWorldSpaceAR(new cc.Vec2(p.x, p.y));
        const local = root.convertToNodeSpaceAR(world);
        return { x: local.x, y: local.y };
    }

    getCellAnchorPosIn(root: cc.Node, row: number, col: number) {
        const center = this.getCellCenterIn(root, row, col);
        return { x: center.x, y: center.y - this.config.cellHeight / 2 };
    }

    getSpawnStartYInElementsRoot(spawnOffsetRows: number) {
        const inner = this.getFrameInnerRect();
        const worldTop = this.config.boardFrame.convertToWorldSpaceAR(new cc.Vec2(0, inner.top));
        const topLocal = this.config.elementsRoot.convertToNodeSpaceAR(worldTop);
        return topLocal.y + this.config.cellHeight * spawnOffsetRows;
    }

    getBoardSpawnDistanceY() {
        const { totalH } = this.getGridSize();
        return totalH + this.config.cellHeight * 3;
    }

    getBoardExitDistanceY() {
        const inner = this.getFrameInnerRect();
        const worldTop = this.config.boardFrame.convertToWorldSpaceAR(new cc.Vec2(0, inner.top));
        const worldBottom = this.config.boardFrame.convertToWorldSpaceAR(new cc.Vec2(0, inner.bottom));
        const topLocal = this.config.elementsRoot.convertToNodeSpaceAR(worldTop);
        const bottomLocal = this.config.elementsRoot.convertToNodeSpaceAR(worldBottom);
        return Math.abs(topLocal.y - bottomLocal.y) + this.config.cellHeight * 3;
    }
}

