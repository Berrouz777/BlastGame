import BoardModel, { RandomProvider } from '../model/BoardModel';
import { CellValue } from '../types/BoardTypes';
import MoveAvailabilityService from './MoveAvailabilityService';

export type ShuffleResult = Readonly<{
    shuffled: boolean;
    success: boolean;
    attemptsUsed: number;
}>;

export default class ShuffleService {
    constructor(private readonly availabilityService: MoveAvailabilityService) {}

    shuffleOnceAndCheck(board: BoardModel, minGroupSize: number, random: RandomProvider): ShuffleResult {
        this.shuffleOnce(board, random);
        const success = this.availabilityService.hasAnyValidGroup(board, minGroupSize);
        return {
            shuffled: true,
            success,
            attemptsUsed: 1
        };
    }

    private shuffleOnce(board: BoardModel, random: RandomProvider) {
        const values: CellValue[] = [];

        for (let row = 0; row < board.rows; row++) {
            for (let col = 0; col < board.cols; col++) {
                values.push(board.get(row, col));
            }
        }

        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            const tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }

        let index = 0;
        for (let row = 0; row < board.rows; row++) {
            for (let col = 0; col < board.cols; col++) {
                board.set(row, col, values[index]);
                index++;
            }
        }
    }
}
