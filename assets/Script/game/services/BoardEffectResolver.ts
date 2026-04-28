import BoardModel, { RandomProvider } from '../model/BoardModel';
import { Position, SpawnedTile, Tile, TileMove } from '../types/BoardTypes';
import GravityService from './GravityService';
import RefillService from './RefillService';

export type BoardEffectResult = Readonly<{
    removed: Position[];
    moved: TileMove[];
    spawned: SpawnedTile[];
}>;

export default class BoardEffectResolver {
    constructor(private readonly gravityService: GravityService, private readonly refillService: RefillService) {}

    resolveRemovePositions(
        board: BoardModel,
        positions: Position[],
        colorCount: number,
        random: RandomProvider,
        replacement?: { row: number; col: number; tile: Tile }
    ): BoardEffectResult {
        const removed = this.uniqueFilledPositions(board, positions);

        for (const pos of removed) {
            board.set(pos.row, pos.col, null);
        }

        const moved = this.gravityService.apply(board);
        const spawned = this.refillService.refill(board, colorCount, random);
        if (replacement && board.inBounds(replacement.row, replacement.col)) {
            board.set(replacement.row, replacement.col, replacement.tile);
        }

        return {
            removed,
            moved,
            spawned
        };
    }

    private uniqueFilledPositions(board: BoardModel, positions: Position[]) {
        const result: Position[] = [];
        const seen = new Set<string>();

        for (const pos of positions) {
            if (!board.inBounds(pos.row, pos.col) || board.get(pos.row, pos.col) === null) {
                continue;
            }

            const key = `${pos.row}:${pos.col}`;
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            result.push(pos);
        }

        return result;
    }
}
