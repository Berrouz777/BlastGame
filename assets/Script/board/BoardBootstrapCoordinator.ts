import GameController from '../game/controller/GameController';
import BoardAnimationPlayer from './BoardAnimationPlayer';
import BoardHudView from './BoardHudView';
import BoosterUiController from './BoosterUiController';
import TileRegistry from './TileRegistry';
import TileVisualResolver from './TileVisualResolver';
import { SuperTileConfig } from '../game/types/GameControllerTypes';
import { Tile } from '../game/types/BoardTypes';

type BoardBootstrapConfig = Readonly<{
    rows: number;
    cols: number;
    minGroupSize: number;
    scoreMultiplier: number;
    movesLimit: number;
    targetScore: number;
    maxShuffleAttempts: number;
    initialColumnStepSec: number;
    useDeterministicSeed: boolean;
    deterministicSeed: number;
    threshold: number;
    rowChance: number;
    columnChance: number;
    bombChance: number;
    clearAllChance: number;
    debug: boolean;
    elementFrames: cc.SpriteFrame[];
    defaultElementFrame: cc.SpriteFrame | null;
    hasElementPrefab: () => boolean;
    getTileRegistry: () => TileRegistry | null;
    getAnimationPlayer: () => BoardAnimationPlayer | null;
    getHudView: () => BoardHudView | null;
    getBoosterUiController: () => BoosterUiController | null;
    getTileVisualResolver: () => TileVisualResolver | null;
    getElementsRoot: () => cc.Node;
    hideGameEndOverlay: () => void;
    setGameEndAnimating: (value: boolean) => void;
    createTileNode: (row: number, col: number, tile: Tile, x: number, y: number) => cc.Node | null;
    getCellAnchorPos: (row: number, col: number) => { x: number; y: number };
    getBoardSpawnDistanceY: () => number;
}>;

export default class BoardBootstrapCoordinator {
    private randomSeedState: number = 1;

    constructor(private readonly config: BoardBootstrapConfig) {}

    bootstrapGame() {
        const tileRegistry = this.config.getTileRegistry();
        const animationPlayer = this.config.getAnimationPlayer();
        const hudView = this.config.getHudView();
        if (!this.config.hasElementPrefab() || !tileRegistry || !animationPlayer || !hudView) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardBootstrapCoordinator] required modules or prefab are not initialized');
            }
            return null;
        }

        const availableFrames = this.getAvailableFrames();
        if (availableFrames.length === 0) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardBootstrapCoordinator] no valid frames configured: set elementFrames or defaultElementFrame');
            }
            return null;
        }

        this.randomSeedState = Math.max(1, this.config.deterministicSeed | 0);
        const random = this.config.useDeterministicSeed ? () => this.nextSeededRandom() : () => Math.random();

        const tileVisualResolver = this.config.getTileVisualResolver();
        if (tileVisualResolver) {
            tileVisualResolver.setColorFrames(availableFrames);
        }

        const game = new GameController(
            this.config.rows,
            this.config.cols,
            availableFrames.length,
            this.config.minGroupSize,
            this.config.scoreMultiplier,
            random,
            this.config.movesLimit,
            this.config.targetScore,
            this.config.maxShuffleAttempts,
            this.createSuperTileConfig()
        );
        game.initBoard();
        game.resolveNoMovesIfNeeded();

        this.config.setGameEndAnimating(false);
        this.config.hideGameEndOverlay();

        const boosterUiController = this.config.getBoosterUiController();
        if (boosterUiController) {
            boosterUiController.resetForNewGame();
        }

        this.config.getElementsRoot().removeAllChildren();
        tileRegistry.reset();
        this.renderInitialBoard(game, tileRegistry, animationPlayer);
        hudView.render(game.session);
        if (boosterUiController) {
            boosterUiController.refreshUi();
        }

        return game;
    }

    private renderInitialBoard(game: GameController, tileRegistry: TileRegistry, animationPlayer: BoardAnimationPlayer) {
        for (let row = 0; row < this.config.rows; row++) {
            for (let col = 0; col < this.config.cols; col++) {
                const tile = game.board.get(row, col);
                if (tile === null) {
                    continue;
                }

                const target = this.config.getCellAnchorPos(row, col);
                const fromY = target.y + this.config.getBoardSpawnDistanceY();
                const node = this.config.createTileNode(row, col, tile, target.x, fromY);
                if (!node) {
                    continue;
                }

                tileRegistry.set(row, col, node);
                const delaySec = (row + col) * this.config.initialColumnStepSec;
                animationPlayer.playInitialFall(node, fromY, target.y, delaySec);
            }
        }
    }

    private getAvailableFrames() {
        const frames: cc.SpriteFrame[] = [];
        const seen = new Set<string>();
        let skippedNull = 0;
        let skippedDuplicate = 0;

        for (const frame of this.config.elementFrames) {
            if (!frame) {
                skippedNull++;
                continue;
            }

            const frameAny = frame as unknown as { _uuid?: string; name?: string };
            const key = frameAny._uuid || frameAny.name || '';
            if (key && seen.has(key)) {
                skippedDuplicate++;
                continue;
            }

            if (key) seen.add(key);
            frames.push(frame);
        }

        if (this.config.debug && (skippedNull > 0 || skippedDuplicate > 0)) {
            // eslint-disable-next-line no-console
            console.warn('[BoardBootstrapCoordinator] elementFrames normalized', {
                skippedNull,
                skippedDuplicate,
                validFrames: frames.length
            });
        }

        if (frames.length === 0 && this.config.defaultElementFrame) {
            frames.push(this.config.defaultElementFrame);
        }

        return frames;
    }

    private createSuperTileConfig(): SuperTileConfig {
        return {
            threshold: this.config.threshold,
            rowChance: this.config.rowChance,
            columnChance: this.config.columnChance,
            bombChance: this.config.bombChance,
            clearAllChance: this.config.clearAllChance
        };
    }

    private nextSeededRandom() {
        this.randomSeedState = (1103515245 * this.randomSeedState + 12345) % 0x80000000;
        return this.randomSeedState / 0x80000000;
    }
}
