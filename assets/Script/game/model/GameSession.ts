export type GameStatus = 'playing' | 'win' | 'lose';

export default class GameSession {
    movesLeft: number;
    score: number;
    readonly targetScore: number;
    readonly maxShuffleAttempts: number;
    shuffleAttemptsUsed: number = 0;
    status: GameStatus = 'playing';

    constructor(opts: { movesLeft: number; targetScore: number; maxShuffleAttempts: number }) {
        this.movesLeft = opts.movesLeft;
        this.targetScore = opts.targetScore;
        this.maxShuffleAttempts = opts.maxShuffleAttempts;
        this.score = 0;
    }

    addScore(groupSize: number, multiplier: number) {
        this.score += groupSize * groupSize * multiplier;
    }

    consumeMove() {
        this.movesLeft = Math.max(0, this.movesLeft - 1);
    }

    setWin() {
        this.status = 'win';
    }

    setLose() {
        this.status = 'lose';
    }

    canShuffle() {
        return this.shuffleAttemptsUsed < this.maxShuffleAttempts;
    }

    consumeShuffleAttempt(count: number) {
        this.shuffleAttemptsUsed = Math.min(this.maxShuffleAttempts, this.shuffleAttemptsUsed + Math.max(0, count));
    }

    isPlaying() {
        return this.status === 'playing';
    }
}
