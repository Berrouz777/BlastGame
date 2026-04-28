import BoardModel from '../model/BoardModel';
import { getBlastColorId } from '../types/BoardTypes';
import GroupFinder from './GroupFinder';

export default class MoveAvailabilityService {
    constructor(private readonly groupFinder: GroupFinder) {}

    hasAnyValidGroup(board: BoardModel, minGroupSize: number) {
        for (let row = 0; row < board.rows; row++) {
            for (let col = 0; col < board.cols; col++) {
                const tile = board.get(row, col);
                if (tile !== null && tile.kind !== 'normal') {
                    return true;
                }

                if (getBlastColorId(tile) === null) {
                    continue;
                }

                const group = this.groupFinder.findConnectedGroup(board, row, col);
                if (group.length >= minGroupSize) {
                    return true;
                }
            }
        }
        return false;
    }
}
