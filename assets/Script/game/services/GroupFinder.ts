import BoardModel from '../model/BoardModel';
import { Position, getBlastColorId } from '../types/BoardTypes';

export default class GroupFinder {
    findConnectedGroup(board: BoardModel, row: number, col: number): Position[] {
        const colorId = getBlastColorId(board.get(row, col));
        if (colorId === null) {
            return [];
        }

        const visited = new Set<string>();
        const queue: Position[] = [{ row, col }];
        const group: Position[] = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                continue;
            }

            const key = `${current.row}:${current.col}`;
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);

            if (getBlastColorId(board.get(current.row, current.col)) !== colorId) {
                continue;
            }

            group.push(current);

            this.pushNeighbor(board, queue, visited, current.row - 1, current.col);
            this.pushNeighbor(board, queue, visited, current.row + 1, current.col);
            this.pushNeighbor(board, queue, visited, current.row, current.col - 1);
            this.pushNeighbor(board, queue, visited, current.row, current.col + 1);
        }

        return group;
    }

    private pushNeighbor(
        board: BoardModel,
        queue: Position[],
        visited: Set<string>,
        row: number,
        col: number
    ) {
        if (!board.inBounds(row, col)) {
            return;
        }

        const key = `${row}:${col}`;
        if (visited.has(key)) {
            return;
        }
        queue.push({ row, col });
    }
}
