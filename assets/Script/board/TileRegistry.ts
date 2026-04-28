import { Position } from '../game/types/BoardTypes';

export default class TileRegistry {
    private readonly tileNodes: Array<Array<cc.Node | null>> = [];
    private readonly nodeToPos: Map<cc.Node, Position> = new Map();

    constructor(private readonly rows: number, private readonly cols: number) {
        this.reset();
    }

    reset() {
        this.nodeToPos.clear();
        this.tileNodes.length = 0;

        for (let row = 0; row < this.rows; row++) {
            const line: Array<cc.Node | null> = [];
            for (let col = 0; col < this.cols; col++) {
                line.push(null);
            }
            this.tileNodes.push(line);
        }
    }

    set(row: number, col: number, node: cc.Node) {
        const prev = this.tileNodes[row][col];
        if (prev) {
            this.nodeToPos.delete(prev);
        }

        this.tileNodes[row][col] = node;
        this.nodeToPos.set(node, { row, col });
    }

    get(row: number, col: number) {
        return this.tileNodes[row][col];
    }

    forEach(visitor: (row: number, col: number, node: cc.Node) => void) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const node = this.tileNodes[row][col];
                if (node) {
                    visitor(row, col, node);
                }
            }
        }
    }

    remove(row: number, col: number) {
        const node = this.tileNodes[row][col];
        if (!node) {
            return null;
        }

        this.tileNodes[row][col] = null;
        this.nodeToPos.delete(node);
        return node;
    }

    move(fromRow: number, fromCol: number, toRow: number, toCol: number) {
        const node = this.tileNodes[fromRow][fromCol];
        if (!node) {
            return null;
        }

        this.tileNodes[fromRow][fromCol] = null;
        this.tileNodes[toRow][toCol] = node;
        this.nodeToPos.set(node, { row: toRow, col: toCol });
        return node;
    }

    swap(aRow: number, aCol: number, bRow: number, bCol: number) {
        const a = this.tileNodes[aRow][aCol];
        const b = this.tileNodes[bRow][bCol];
        if (!a || !b) {
            return null;
        }

        this.tileNodes[aRow][aCol] = b;
        this.tileNodes[bRow][bCol] = a;
        this.nodeToPos.set(a, { row: bRow, col: bCol });
        this.nodeToPos.set(b, { row: aRow, col: aCol });

        return { a, b };
    }

    getPositionByNode(node: cc.Node) {
        return this.nodeToPos.get(node) || null;
    }

    count() {
        let total = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.tileNodes[row][col]) {
                    total++;
                }
            }
        }
        return total;
    }
}
