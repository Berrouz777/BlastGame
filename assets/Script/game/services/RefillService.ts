import BoardModel, { RandomProvider } from '../model/BoardModel';
import { SpawnedTile, createNormalTile } from '../types/BoardTypes';

export default class RefillService {
    refill(board: BoardModel, colorCount: number, random: RandomProvider): SpawnedTile[] {
        const spawned: SpawnedTile[] = [];

        for (let col = 0; col < board.cols; col++) {
            let spawnOffsetRows = 0;

            for (let row = board.rows - 1; row >= 0; row--) {
                if (board.get(row, col) !== null) {
                    continue;
                }

                const colorId = Math.floor(random() * colorCount) % colorCount;
                const tile = createNormalTile(colorId);
                board.set(row, col, tile);
                spawnOffsetRows++;

                spawned.push({
                    row,
                    col,
                    tile,
                    colorId,
                    spawnOffsetRows
                });
            }
        }

        return spawned;
    }
}
