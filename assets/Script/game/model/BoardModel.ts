import { BoardState, CellValue, ColorId, createNormalTile } from '../types/BoardTypes';

export type RandomProvider = () => number;

export default class BoardModel {
    readonly rows: number;
    readonly cols: number;
    private readonly grid: BoardState;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];

        for (let row = 0; row < this.rows; row++) {
            const line: CellValue[] = [];
            for (let col = 0; col < this.cols; col++) {
                line.push(null);
            }
            this.grid.push(line);
        }
    }

    inBounds(row: number, col: number) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    get(row: number, col: number): CellValue {
        if (!this.inBounds(row, col)) {
            return null;
        }
        return this.grid[row][col];
    }

    set(row: number, col: number, value: CellValue) {
        if (!this.inBounds(row, col)) {
            return;
        }
        this.grid[row][col] = value;
    }

    swap(aRow: number, aCol: number, bRow: number, bCol: number) {
        if (!this.inBounds(aRow, aCol) || !this.inBounds(bRow, bCol)) {
            return;
        }
        const a = this.grid[aRow][aCol];
        this.grid[aRow][aCol] = this.grid[bRow][bCol];
        this.grid[bRow][bCol] = a;
    }

    forEachColumn(visitor: (col: number, cells: CellValue[]) => void) {
        for (let col = 0; col < this.cols; col++) {
            const cells: CellValue[] = [];
            for (let row = 0; row < this.rows; row++) {
                cells.push(this.grid[row][col]);
            }
            visitor(col, cells);
        }
    }

    cloneState(): BoardState {
        return this.grid.map((line) => [...line]);
    }

    fillRandom(colorCount: number, random: RandomProvider) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.grid[row][col] = createNormalTile(this.randomColor(colorCount, random));
            }
        }
    }

    getFilledCount() {
        let count = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col] !== null) {
                    count++;
                }
            }
        }
        return count;
    }

    getNullCount() {
        return this.rows * this.cols - this.getFilledCount();
    }

    private randomColor(colorCount: number, random: RandomProvider): ColorId {
        const roll = random();
        return Math.floor(roll * colorCount) % colorCount;
    }
}
