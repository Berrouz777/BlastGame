import BoardModel, { RandomProvider } from '../model/BoardModel';
import GameSession from '../model/GameSession';
import BoardEffectResolver from '../services/BoardEffectResolver';
import GravityService from '../services/GravityService';
import GroupFinder from '../services/GroupFinder';
import MoveAvailabilityService from '../services/MoveAvailabilityService';
import RefillService from '../services/RefillService';
import ShuffleService from '../services/ShuffleService';
import { Position, SpawnedTile, SpecialTileKind, TileMove, createSpecialTile } from '../types/BoardTypes';
import {
    DEFAULT_SUPER_TILE_CONFIG,
    ResolveNoMovesResult,
    ResolveTeleportResult,
    ResolveTurnResult,
    SuperTileConfig
} from '../types/GameControllerTypes';

export default class GameController {
    readonly board: BoardModel;
    readonly session: GameSession;

    private readonly groupFinder: GroupFinder;
    private readonly gravityService: GravityService;
    private readonly refillService: RefillService;
    private readonly availabilityService: MoveAvailabilityService;
    private readonly shuffleService: ShuffleService;
    private readonly effectResolver: BoardEffectResolver;

    constructor(
        rows: number,
        cols: number,
        private readonly colorCount: number,
        private readonly minGroupSize: number,
        private readonly scoreMultiplier: number,
        private readonly random: RandomProvider,
        movesLimit: number,
        targetScore: number,
        maxShuffleAttempts: number,
        private readonly superTileConfig: SuperTileConfig = DEFAULT_SUPER_TILE_CONFIG
    ) {
        this.board = new BoardModel(rows, cols);
        this.session = new GameSession({ movesLeft: movesLimit, targetScore, maxShuffleAttempts });
        this.groupFinder = new GroupFinder();
        this.gravityService = new GravityService();
        this.refillService = new RefillService();
        this.availabilityService = new MoveAvailabilityService(this.groupFinder);
        this.shuffleService = new ShuffleService(this.availabilityService);
        this.effectResolver = new BoardEffectResolver(this.gravityService, this.refillService);
    }

    initBoard() {
        this.board.fillRandom(this.colorCount, this.random);
    }

    previewBlastGroup(row: number, col: number): Position[] {
        const group = this.groupFinder.findConnectedGroup(this.board, row, col);
        return group.length >= this.minGroupSize ? group : [];
    }

    resolveClick(row: number, col: number): ResolveTurnResult {
        if (!this.session.isPlaying()) {
            return this.createRejectedTurnResult();
        }

        const clickedTile = this.board.get(row, col);
        if (clickedTile !== null && clickedTile.kind !== 'normal') {
            return this.resolveSpecialTile(row, col, clickedTile.kind);
        }

        const group = this.groupFinder.findConnectedGroup(this.board, row, col);
        if (group.length < this.minGroupSize) {
            this.updateEndState();
            return this.createRejectedTurnResult();
        }

        this.session.consumeMove();
        this.session.addScore(group.length, this.scoreMultiplier);

        const specialKind = this.pickSuperTileKind(group.length);
        const replacement =
            specialKind !== null && clickedTile !== null
                ? {
                      row,
                      col,
                      tile: createSpecialTile(specialKind, clickedTile.colorId)
                  }
                : undefined;
        const effect = this.effectResolver.resolveRemovePositions(this.board, group, this.colorCount, this.random, replacement);

        this.updateEndState(false);

        return {
            accepted: true,
            removed: effect.removed,
            moved: effect.moved,
            spawned: effect.spawned,
            activatedSpecialKind: null,
            activatedSpecialOrigin: null,
            createdSpecialKind: specialKind,
            createdSpecialPosition: specialKind === null ? null : { row, col }
        };
    }

    resolveBomb(row: number, col: number, radius: number): ResolveTurnResult {
        if (!this.session.isPlaying() || !this.board.inBounds(row, col) || this.board.get(row, col) === null) {
            return this.createRejectedTurnResult();
        }

        const positions = this.collectSquareRadiusPositions(row, col, radius);
        if (positions.length === 0) {
            return this.createRejectedTurnResult();
        }

        this.session.consumeMove();
        this.session.addScore(positions.length, this.scoreMultiplier);

        const effect = this.effectResolver.resolveRemovePositions(this.board, positions, this.colorCount, this.random);

        this.updateEndState(false);

        return {
            accepted: true,
            removed: effect.removed,
            moved: effect.moved,
            spawned: effect.spawned,
            activatedSpecialKind: null,
            activatedSpecialOrigin: null,
            createdSpecialKind: null,
            createdSpecialPosition: null
        };
    }

    resolveTeleport(fromRow: number, fromCol: number, toRow: number, toCol: number): ResolveTeleportResult {
        const isSameCell = fromRow === toRow && fromCol === toCol;
        if (
            !this.session.isPlaying() ||
            isSameCell ||
            !this.board.inBounds(fromRow, fromCol) ||
            !this.board.inBounds(toRow, toCol) ||
            this.board.get(fromRow, fromCol) === null ||
            this.board.get(toRow, toCol) === null
        ) {
            return {
                accepted: false,
                from: null,
                to: null
            };
        }

        this.board.swap(fromRow, fromCol, toRow, toCol);
        this.session.consumeMove();
        this.updateEndState(false);

        return {
            accepted: true,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };
    }

    hasAnyMove() {
        return this.availabilityService.hasAnyValidGroup(this.board, this.minGroupSize);
    }

    resolveNoMovesIfNeeded(): ResolveNoMovesResult {
        if (!this.session.isPlaying() || this.hasAnyMove()) {
            return {
                shuffled: false,
                failed: false,
                attemptsUsed: 0,
                hasMoveAfter: true
            };
        }

        if (!this.session.canShuffle()) {
            this.session.setLose();
            return {
                shuffled: false,
                failed: true,
                attemptsUsed: 0,
                hasMoveAfter: false
            };
        }

        const result = this.shuffleService.shuffleOnceAndCheck(this.board, this.minGroupSize, this.random);
        this.session.consumeShuffleAttempt(1);

        if (!result.success && !this.session.canShuffle()) {
            this.session.setLose();
        }

        return {
            shuffled: result.shuffled,
            failed: !result.success && !this.session.isPlaying(),
            attemptsUsed: 1,
            hasMoveAfter: result.success
        };
    }

    private updateEndState(checkNoMoves: boolean = true) {
        if (this.session.score >= this.session.targetScore) {
            this.session.setWin();
            return;
        }

        if (this.session.movesLeft <= 0) {
            this.session.setLose();
            return;
        }

        if (checkNoMoves && !this.hasAnyMove()) {
            this.session.setLose();
        }
    }

    private resolveSpecialTile(row: number, col: number, kind: SpecialTileKind): ResolveTurnResult {
        const positions = this.collectSpecialTilePositions(row, col, kind);
        if (positions.length === 0) {
            return this.createRejectedTurnResult();
        }

        this.session.consumeMove();
        this.session.addScore(positions.length, this.scoreMultiplier);

        const effect = this.effectResolver.resolveRemovePositions(this.board, positions, this.colorCount, this.random);

        this.updateEndState(false);

        return {
            accepted: true,
            removed: effect.removed,
            moved: effect.moved,
            spawned: effect.spawned,
            activatedSpecialKind: kind,
            activatedSpecialOrigin: { row, col },
            createdSpecialKind: null,
            createdSpecialPosition: null
        };
    }

    private collectSpecialTilePositions(row: number, col: number, kind: SpecialTileKind): Position[] {
        switch (kind) {
            case 'row':
                return this.collectRowPositions(row);
            case 'column':
                return this.collectColumnPositions(col);
            case 'bomb':
            case 'radius':
                return this.collectSquareRadiusPositions(row, col, 1);
            case 'clearAll':
                return this.collectAllPositions();
            default:
                return [];
        }
    }

    private collectRowPositions(row: number): Position[] {
        const positions: Position[] = [];
        for (let col = 0; col < this.board.cols; col++) {
            if (this.board.get(row, col) !== null) {
                positions.push({ row, col });
            }
        }
        return positions;
    }

    private collectColumnPositions(col: number): Position[] {
        const positions: Position[] = [];
        for (let row = 0; row < this.board.rows; row++) {
            if (this.board.get(row, col) !== null) {
                positions.push({ row, col });
            }
        }
        return positions;
    }

    private collectAllPositions(): Position[] {
        const positions: Position[] = [];
        for (let row = 0; row < this.board.rows; row++) {
            for (let col = 0; col < this.board.cols; col++) {
                if (this.board.get(row, col) !== null) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }

    private pickSuperTileKind(groupSize: number): SpecialTileKind | null {
        const threshold = Math.max(1, Math.floor(this.superTileConfig.threshold));
        if (groupSize < threshold) {
            return null;
        }

        const chances: Array<{ kind: SpecialTileKind; value: number }> = [
            { kind: 'row', value: this.superTileConfig.rowChance },
            { kind: 'column', value: this.superTileConfig.columnChance },
            { kind: 'bomb', value: this.superTileConfig.bombChance },
            { kind: 'clearAll', value: this.superTileConfig.clearAllChance }
        ];
        const total = chances.reduce((sum, item) => sum + Math.max(0, item.value), 0);
        if (total <= 0) {
            return null;
        }

        let roll = this.random() * total;
        for (const item of chances) {
            const value = Math.max(0, item.value);
            if (roll < value) {
                return item.kind;
            }
            roll -= value;
        }

        return chances[chances.length - 1].kind;
    }

    private createRejectedTurnResult(): ResolveTurnResult {
        return {
            accepted: false,
            removed: [],
            moved: [],
            spawned: [],
            activatedSpecialKind: null,
            activatedSpecialOrigin: null,
            createdSpecialKind: null,
            createdSpecialPosition: null
        };
    }

    private collectSquareRadiusPositions(row: number, col: number, radius: number): Position[] {
        const normalizedRadius = Math.max(0, Math.floor(radius));
        const positions: Position[] = [];

        for (let currentRow = row - normalizedRadius; currentRow <= row + normalizedRadius; currentRow++) {
            for (let currentCol = col - normalizedRadius; currentCol <= col + normalizedRadius; currentCol++) {
                if (!this.board.inBounds(currentRow, currentCol) || this.board.get(currentRow, currentCol) === null) {
                    continue;
                }

                positions.push({ row: currentRow, col: currentCol });
            }
        }

        return positions;
    }
}
