import BoardModel from '../model/BoardModel';
import { TileMove } from '../types/BoardTypes';

export default class GravityService {
    apply(board: BoardModel): TileMove[] {
        const moves: TileMove[] = [];

        for (let col = 0; col < board.cols; col++) {
            let writeRow = board.rows - 1;

            for (let row = board.rows - 1; row >= 0; row--) {
                const tile = board.get(row, col);
                if (tile === null) {
                    continue;
                }

                if (writeRow !== row) {
                    board.set(writeRow, col, tile);
                    board.set(row, col, null);
                    moves.push({
                        fromRow: row,
                        toRow: writeRow,
                        col,
                        tile,
                        colorId: tile.colorId
                    });
                }

                writeRow--;
            }

            for (let row = writeRow; row >= 0; row--) {
                board.set(row, col, null);
            }
        }

        return moves;
    }
}
