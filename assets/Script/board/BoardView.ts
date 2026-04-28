import GameController from '../game/controller/GameController';
import BoardAnimationPlayer from './BoardAnimationPlayer';
import BoardHudView from './BoardHudView';
import BoardInputHandler from './BoardInputHandler';
import TileRegistry from './TileRegistry';
import BoardLayout from './BoardLayout';
import TileNodeFactory from './TileNodeFactory';
import TurnFlowCoordinator from './TurnFlowCoordinator';
import BoardEffectsPresenter from './BoardEffectsPresenter';
import GameEndOverlayController from './GameEndOverlayController';
import BoosterUiController from './BoosterUiController';
import AutoShuffleCoordinator from './AutoShuffleCoordinator';
import BoardPresenter from './BoardPresenter';
import BoardInteractionFeedback from './BoardInteractionFeedback';
import BoardModelVisualSync from './BoardModelVisualSync';
import FullscreenBackgroundController from './FullscreenBackgroundController';
import TileVisualResolver from './TileVisualResolver';
import TurnVisualPipeline from './TurnVisualPipeline';
import BoardBootstrapCoordinator from './BoardBootstrapCoordinator';
import GameEndFlowCoordinator from './GameEndFlowCoordinator';
import { findChildByNameRecursive } from './NodeSearch';
import { Tile } from '../game/types/BoardTypes';

const { ccclass, property } = cc._decorator;

@ccclass
export default class BoardView extends cc.Component {
    @property(cc.Node)
    boardFrame: cc.Node = null;

    @property(cc.Node)
    cellsRoot: cc.Node = null;

    @property(cc.Node)
    elementsRoot: cc.Node = null;

    @property
    cols: number = 9;

    @property
    rows: number = 11;

    @property
    cellWidth: number = 60;

    @property
    cellHeight: number = 60;

    @property
    gapX: number = 2;

    @property
    gapY: number = 2;

    @property
    visualPaddingX: number = 1;

    @property
    visualPaddingY: number = 0.5; 

    @property(cc.Prefab)
    elementPrefab: cc.Prefab = null;

    @property(cc.SpriteFrame)
    defaultElementFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    elementFrames: cc.SpriteFrame[] = [];

    @property
    paddingX: number = 0;

    @property
    paddingY: number = 0;

    @property
    contentOffsetX: number = 0;

    @property
    contentOffsetY: number = 0;

    @property
    fallDurationSec: number = 0.6;

    @property
    fallFromRows: number = 4;

    @property
    initialColumnStepSec: number = 0.035; // шаг анимации падения тайлов при первом падении

    @property
    burnDurationSec: number = 0.2; // длительность анимации сжигания тайла при выпадении супер тайла

    @property
    lineExplosionStepSec: number = 0.035; // шаг анимации взрыва линии при выпадении супер тайла (горизонтального и вертикального)

    @property
    gameEndTilesExitDurationSec: number = 0.45; // длительность анимации выхода тайлов вниз при окончании игры

    @property
    gameEndColumnStepSec: number = 0.025; // шаг анимации выхода тайлов вниз при окончании игры

    @property
    gameEndOverlayDurationSec: number = 0.25; // длительность анимации оверлея окончания игры

    @property
    movesLimit: number = 20; // максимальное количество ходов в игре

    @property
    maxShuffleAttempts: number = 3; // количество попыток автоshuffle

    @property(cc.Node)
    teleportButtonNode: cc.Node = null;

    @property(cc.Label)
    teleportCountLabel: cc.Label = null;

    @property
    teleportUses: number = 3; // количество использований телепорта

    @property(cc.Node)
    bombButtonNode: cc.Node = null;

    @property(cc.Label)
    bombCountLabel: cc.Label = null;

    @property(cc.Prefab)
    explosionPrefab: cc.Prefab = null;

    @property([cc.SpriteFrame])
    explosionFrames: cc.SpriteFrame[] = [];

    @property
    explosionScale: number = 2.3; // масштаб взрыва (бустера бомбы)

    @property
    explosionDurationSec: number = 0.35; // длительность анимации взрыва (бустера бомбы)

    @property
    bombRadius: number = 1; // радиус бомбы (всех тайлов в радиусе)

    @property
    bombUses: number = 2; // количество использований бомбы

    @property(cc.SpriteFrame)
    superLineFrame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    superBombFrame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    superClearAllFrame: cc.SpriteFrame = null;

    @property
    superTileThreshold: number = 8; // >=8 порог для выпадения супер тайла

    @property
    superRowChance: number = 25; // 25% выпадения горизонтального супер тайла

    @property
    superColumnChance: number = 25; // 25% выпадения вертикального супер тайла

    @property
    superBombChance: number = 40; // 40% выпадения бомба супер тайла

    @property
    superClearAllChance: number = 10; // 10% выпадения супер бомбы (очистки всех тайлов)

    @property
    targetScore: number = 9000; // счет для победы

    @property
    scoreMultiplier: number = 10;

    @property
    minGroupSize: number = 3; // минимальный размер группы для выпадения супер тайла

    @property
    useDeterministicSeed: boolean = false;

    @property
    deterministicSeed: number = 12345; // seed для генератора случайных чисел

    @property(cc.Node)
    uiRoot: cc.Node = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    @property(cc.Label)
    targetLabel: cc.Label = null;

    @property(cc.Label)
    statusLabel: cc.Label = null;

    @property(cc.Node)
    gameEndOverlayNode: cc.Node = null;

    @property(cc.Label)
    gameEndTitleLabel: cc.Label = null;

    @property(cc.Node)
    restartButtonNode: cc.Node = null;

    @property
    autoCreateHud: boolean = true;

    @property
    debug: boolean = false;

    private game: GameController | null = null;
    private isResolving: boolean = false;
    private isGameEndAnimating: boolean = false;

    private tileRegistry: TileRegistry | null = null;
    private animationPlayer: BoardAnimationPlayer | null = null;
    private hudView: BoardHudView | null = null;
    private inputHandler: BoardInputHandler | null = null;
    private boardLayout: BoardLayout | null = null;
    private tileNodeFactory: TileNodeFactory | null = null;
    private turnFlowCoordinator: TurnFlowCoordinator | null = null;
    private effectsPresenter: BoardEffectsPresenter | null = null;
    private gameEndOverlayController: GameEndOverlayController | null = null;
    private boosterUiController: BoosterUiController | null = null;
    private autoShuffleCoordinator: AutoShuffleCoordinator | null = null;
    private boardPresenter: BoardPresenter | null = null;
    private interactionFeedback: BoardInteractionFeedback | null = null;
    private modelVisualSync: BoardModelVisualSync | null = null;
    private fullscreenBackgroundController: FullscreenBackgroundController | null = null;
    private tileVisualResolver: TileVisualResolver | null = null;
    private turnVisualPipeline: TurnVisualPipeline | null = null;
    private bootstrapCoordinator: BoardBootstrapCoordinator | null = null;
    private gameEndFlowCoordinator: GameEndFlowCoordinator | null = null;

    start() {
        if (!this.boardFrame || !this.cellsRoot || !this.elementsRoot) {
            if (this.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardView] boardFrame/cellsRoot/elementsRoot not assigned');
            }
            return;
        }

        this.setupFullscreenBackground();
        this.setupLayout();
        this.rebuildGrid();
        this.setupModules();
        this.bootstrapGame();
    }

    onDestroy() {
        cc.view.setResizeCallback();
    }

    rebuildGrid() {
        if (this.boardLayout) {
            this.boardLayout.rebuildGrid();
        }

        if (this.debug) {
            const { totalW, totalH } = this.getGridSize();
            // eslint-disable-next-line no-console
            console.log('[BoardView] grid built', {
                cols: this.cols,
                rows: this.rows,
                cellWidth: this.cellWidth,
                cellHeight: this.cellHeight,
                gapX: this.gapX,
                gapY: this.gapY,
                visualPaddingX: this.visualPaddingX,
                visualPaddingY: this.visualPaddingY,
                totalW,
                totalH,
                frameW: this.boardFrame.width,
                frameH: this.boardFrame.height,
                paddingX: this.paddingX,
                paddingY: this.paddingY,
                contentOffsetX: this.contentOffsetX,
                contentOffsetY: this.contentOffsetY
            });
        }
    }

    getGridSize() {
        if (!this.boardLayout) {
            return { totalW: 0, totalH: 0 };
        }
        return this.boardLayout.getGridSize();
    }

    getFrameInnerRect() {
        if (!this.boardLayout) {
            return { left: 0, right: 0, bottom: 0, top: 0, width: 0, height: 0 };
        }
        return this.boardLayout.getFrameInnerRect();
    }

    getCellCenterInFrame(r: number, c: number) {
        if (!this.boardLayout) {
            return { x: 0, y: 0 };
        }
        return this.boardLayout.getCellCenterInFrame(r, c);
    }

    getCellCenterIn(root: cc.Node, r: number, c: number) {
        if (!this.boardLayout) {
            return { x: 0, y: 0 };
        }
        return this.boardLayout.getCellCenterIn(root, r, c);
    }

    getCellAnchorPosIn(root: cc.Node, r: number, c: number) {
        if (!this.boardLayout) {
            return { x: 0, y: 0 };
        }
        return this.boardLayout.getCellAnchorPosIn(root, r, c);
    }

    getSpawnStartYInElementsRoot(spawnOffsetRows: number) {
        if (!this.boardLayout) {
            return 0;
        }
        return this.boardLayout.getSpawnStartYInElementsRoot(spawnOffsetRows);
    }

    getBoardSpawnDistanceY() {
        if (!this.boardLayout) {
            return this.cellHeight * 3;
        }
        return this.boardLayout.getBoardSpawnDistanceY();
    }

    getBoardExitDistanceY() {
        if (!this.boardLayout) {
            return this.cellHeight * 6;
        }
        return this.boardLayout.getBoardExitDistanceY();
    }

    private setupLayout() {
        this.boardLayout = new BoardLayout({
            boardFrame: this.boardFrame,
            cellsRoot: this.cellsRoot,
            elementsRoot: this.elementsRoot,
            cols: this.cols,
            rows: this.rows,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight,
            gapX: this.gapX,
            gapY: this.gapY,
            paddingX: this.paddingX,
            paddingY: this.paddingY,
            contentOffsetX: this.contentOffsetX,
            contentOffsetY: this.contentOffsetY
        });
    }

    private setupFullscreenBackground() {
        const root = this.node.parent ? this.node.parent.parent || this.node.parent : this.node;
        const backgroundNode = findChildByNameRecursive(root, 'background');
        if (!backgroundNode) {
            return;
        }

        const widget = backgroundNode.getComponent(cc.Widget);
        if (widget) {
            widget.enabled = false;
        }

        this.fullscreenBackgroundController = new FullscreenBackgroundController(backgroundNode);
        this.fullscreenBackgroundController.resize();
        cc.view.setResizeCallback(() => {
            if (this.fullscreenBackgroundController) {
                this.fullscreenBackgroundController.resize();
            }
        });
    }

    private setupTileNodeFactory() {
        if (!this.elementPrefab || !this.inputHandler || !this.tileVisualResolver) {
            this.tileNodeFactory = null;
            return;
        }

        this.tileNodeFactory = new TileNodeFactory({
            elementPrefab: this.elementPrefab,
            elementsRoot: this.elementsRoot,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight,
            visualPaddingX: this.visualPaddingX,
            visualPaddingY: this.visualPaddingY,
            bindInput: (node) => this.inputHandler && this.inputHandler.bind(node),
            resolveFrame: (tile) => this.tileVisualResolver ? this.tileVisualResolver.resolveFrame(tile) : null,
            resolveAngle: (tile) => this.tileVisualResolver ? this.tileVisualResolver.resolveAngle(tile) : 0
        });
    }

    private setupEffectsPresenter() {
        this.effectsPresenter = new BoardEffectsPresenter({
            elementsRoot: this.elementsRoot,
            rows: this.rows,
            cols: this.cols,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight,
            explosionPrefab: this.explosionPrefab,
            explosionFrames: this.explosionFrames,
            explosionScale: this.explosionScale,
            explosionDurationSec: this.explosionDurationSec,
            lineExplosionStepSec: this.lineExplosionStepSec,
            getCellCenter: (row, col) => this.getCellCenterIn(this.elementsRoot, row, col),
            getGridSize: () => this.getGridSize(),
            debug: this.debug
        });
    }

    private setupBoosterUiController() {
        this.boosterUiController = new BoosterUiController({
            ownerNode: this.node,
            teleportButtonNode: this.teleportButtonNode,
            teleportCountLabel: this.teleportCountLabel,
            teleportUses: this.teleportUses,
            bombButtonNode: this.bombButtonNode,
            bombCountLabel: this.bombCountLabel,
            bombUses: this.bombUses,
            findChildByNameRecursive: (root, name) => findChildByNameRecursive(root, name),
            canToggle: () => !this.isResolving && !this.isGameEndAnimating,
            isGamePlaying: () => Boolean(this.game && this.game.session.isPlaying()),
            getTileRegistry: () => this.tileRegistry
        });
        this.boosterUiController.setup();
        this.teleportButtonNode = this.boosterUiController.getTeleportButtonNode();
        this.teleportCountLabel = this.boosterUiController.getTeleportCountLabel();
        this.bombButtonNode = this.boosterUiController.getBombButtonNode();
        this.bombCountLabel = this.boosterUiController.getBombCountLabel();
    }

    private setupGameEndController() {
        this.gameEndOverlayController = new GameEndOverlayController({
            uiRoot: this.uiRoot,
            ownerNode: this.node,
            overlayNode: this.gameEndOverlayNode,
            titleLabel: this.gameEndTitleLabel,
            restartButtonNode: this.restartButtonNode,
            overlayDurationSec: this.gameEndOverlayDurationSec,
            findChildByNameRecursive: (root, name) => findChildByNameRecursive(root, name),
            onRestart: () => {
                if (!this.gameEndFlowCoordinator) {
                    return;
                }
                this.gameEndFlowCoordinator.restart(() => this.bootstrapGame());
            }
        });
        this.gameEndOverlayController.setup();
        this.gameEndOverlayNode = this.gameEndOverlayController.getOverlayNode();
        this.gameEndTitleLabel = this.gameEndOverlayController.getTitleLabel();
        this.restartButtonNode = this.gameEndOverlayController.getRestartButtonNode();
        this.setupGameEndFlowCoordinator();
    }

    private setupGameEndFlowCoordinator() {
        this.gameEndFlowCoordinator = new GameEndFlowCoordinator({
            getGame: () => this.game,
            getTileRegistry: () => this.tileRegistry,
            getAnimationPlayer: () => this.animationPlayer,
            getOverlayController: () => this.gameEndOverlayController,
            isGameEndAnimating: () => this.isGameEndAnimating,
            setGameEndAnimating: (value) => {
                this.isGameEndAnimating = value;
            },
            getBoardExitDistanceY: () => this.getBoardExitDistanceY(),
            gameEndTilesExitDurationSec: this.gameEndTilesExitDurationSec,
            gameEndColumnStepSec: this.gameEndColumnStepSec
        });
    }

    private setupTurnFlowCoordinator() {
        if (!this.animationPlayer || !this.tileRegistry) {
            this.turnFlowCoordinator = null;
            return;
        }

        this.turnFlowCoordinator = new TurnFlowCoordinator(this.animationPlayer, this.tileRegistry, {
            beforeFlow: () => {
                if (!this.game || !this.hudView) {
                    return;
                }
                this.hudView.render(this.game.session);
                if (this.boosterUiController) {
                    this.boosterUiController.refreshUi();
                }
                this.isResolving = true;
            },
            afterFlow: () => {
                if (!this.game || !this.hudView) {
                    return;
                }
                this.isResolving = false;
                this.hudView.render(this.game.session);
                if (this.boosterUiController) {
                    this.boosterUiController.refreshUi();
                }
                this.validateVisualState();
            },
            afterFlowAsync: () => {
                if (!this.gameEndFlowCoordinator) {
                    return Promise.resolve();
                }
                return this.gameEndFlowCoordinator.resolveIfNeeded();
            }
        });
    }

    private setupAutoShuffleCoordinator() {
        this.autoShuffleCoordinator = new AutoShuffleCoordinator({
            getGame: () => this.game,
            getTileRegistry: () => this.tileRegistry,
            getAnimationPlayer: () => this.animationPlayer,
            syncTileSpritesWithModel: () => {
                if (this.modelVisualSync) {
                    this.modelVisualSync.syncAll();
                }
            }
        });
    }

    private setupBoardPresenter() {
        this.boardPresenter = new BoardPresenter({
            getGame: () => this.game,
            getTileRegistry: () => this.tileRegistry,
            getTurnFlowCoordinator: () => this.turnFlowCoordinator,
            getBoosterUiController: () => this.boosterUiController,
            getInteractionFeedback: () => this.interactionFeedback,
            isResolving: () => this.isResolving,
            isGameEndAnimating: () => this.isGameEndAnimating,
            bombRadius: this.bombRadius,
            debug: this.debug,
            createSpecialExplosionTask: (wasBombModeActive, row, col, specialKind, specialOrigin) =>
                this.turnVisualPipeline
                    ? this.turnVisualPipeline.createSpecialExplosionTask(wasBombModeActive, row, col, specialKind, specialOrigin)
                    : Promise.resolve(),
            createBurnTask: (removed, specialKind, specialOrigin) =>
                this.turnVisualPipeline ? this.turnVisualPipeline.createBurnTask(removed, specialKind, specialOrigin) : Promise.resolve(),
            createNode: (row, col, tile, x, y) => this.createTileNode(row, col, tile, x, y),
            revealCreatedSpecial: async (pos) => {
                if (!this.animationPlayer || !this.tileRegistry) {
                    return;
                }
                await this.animationPlayer.animateSuperTileReveal(this.tileRegistry, pos, () => {
                    if (this.modelVisualSync) {
                        this.modelVisualSync.syncAt(pos);
                    }
                });
            },
            syncTileSpritesWithModel: () => {
                if (this.modelVisualSync) {
                    this.modelVisualSync.syncAll();
                }
            },
            resolveAutoShuffleIfNeeded: () => this.resolveAutoShuffleIfNeeded()
        });
    }

    private setupModules() {
        this.tileRegistry = new TileRegistry(this.rows, this.cols);
        this.interactionFeedback = new BoardInteractionFeedback(this.tileRegistry);
        this.modelVisualSync = new BoardModelVisualSync({
            getGame: () => this.game,
            getTileRegistry: () => this.tileRegistry,
            getTileNodeFactory: () => this.tileNodeFactory
        });
        this.tileVisualResolver = new TileVisualResolver({
            defaultElementFrame: this.defaultElementFrame,
            superLineFrame: this.superLineFrame,
            superBombFrame: this.superBombFrame,
            superClearAllFrame: this.superClearAllFrame
        });
        this.turnVisualPipeline = new TurnVisualPipeline({
            getAnimationPlayer: () => this.animationPlayer,
            getTileRegistry: () => this.tileRegistry,
            getEffectsPresenter: () => this.effectsPresenter,
            lineExplosionStepSec: this.lineExplosionStepSec,
            bombRadius: this.bombRadius
        });
        this.bootstrapCoordinator = new BoardBootstrapCoordinator({
            rows: this.rows,
            cols: this.cols,
            minGroupSize: this.minGroupSize,
            scoreMultiplier: this.scoreMultiplier,
            movesLimit: this.movesLimit,
            targetScore: this.targetScore,
            maxShuffleAttempts: this.maxShuffleAttempts,
            initialColumnStepSec: this.initialColumnStepSec,
            useDeterministicSeed: this.useDeterministicSeed,
            deterministicSeed: this.deterministicSeed,
            threshold: this.superTileThreshold,
            rowChance: this.superRowChance,
            columnChance: this.superColumnChance,
            bombChance: this.superBombChance,
            clearAllChance: this.superClearAllChance,
            debug: this.debug,
            elementFrames: this.elementFrames,
            defaultElementFrame: this.defaultElementFrame,
            hasElementPrefab: () => Boolean(this.elementPrefab),
            getTileRegistry: () => this.tileRegistry,
            getAnimationPlayer: () => this.animationPlayer,
            getHudView: () => this.hudView,
            getBoosterUiController: () => this.boosterUiController,
            getTileVisualResolver: () => this.tileVisualResolver,
            getElementsRoot: () => this.elementsRoot,
            hideGameEndOverlay: () => {
                if (this.gameEndFlowCoordinator) {
                    this.gameEndFlowCoordinator.hideImmediate();
                }
            },
            setGameEndAnimating: (value) => {
                this.isGameEndAnimating = value;
            },
            createTileNode: (row, col, tile, x, y) => this.createTileNode(row, col, tile, x, y),
            getCellAnchorPos: (row, col) => this.getCellAnchorPosIn(this.elementsRoot, row, col),
            getBoardSpawnDistanceY: () => this.getBoardSpawnDistanceY()
        });

        this.animationPlayer = new BoardAnimationPlayer({
            fallDurationSec: this.fallDurationSec,
            burnDurationSec: this.burnDurationSec,
            cellHeight: this.cellHeight,
            getCellCenter: (row, col) => this.getCellAnchorPosIn(this.elementsRoot, row, col),
            getSpawnStartY: (spawnOffsetRows) => this.getSpawnStartYInElementsRoot(spawnOffsetRows)
        });

        this.hudView = new BoardHudView({
            uiRoot: this.uiRoot,
            autoCreateHud: this.autoCreateHud,
            scoreLabel: this.scoreLabel,
            movesLabel: this.movesLabel,
            targetLabel: this.targetLabel,
            statusLabel: this.statusLabel
        });

        const refs = this.hudView.setup(this.node);
        this.scoreLabel = refs.scoreLabel;
        this.movesLabel = refs.movesLabel;
        this.targetLabel = refs.targetLabel;
        this.statusLabel = refs.statusLabel;

        this.inputHandler = new BoardInputHandler(
            (node) => this.onTileTouch(node),
            (node) => this.onTileTouchStart(node),
            () => this.onTileTouchCancel()
        );
        this.setupTileNodeFactory();
        this.setupEffectsPresenter();
        this.setupGameEndController();
        this.setupBoosterUiController();
        this.setupTurnFlowCoordinator();
        this.setupAutoShuffleCoordinator();
        this.setupBoardPresenter();
    }

    private bootstrapGame() {
        if (!this.bootstrapCoordinator) {
            return;
        }
        const game = this.bootstrapCoordinator.bootstrapGame();
        if (game) {
            this.game = game;
            if (this.boosterUiController) {
                this.boosterUiController.refreshUi();
            }
        }
    }

    private createTileNode(row: number, col: number, tile: Tile, x: number, y: number) {
        if (!this.tileNodeFactory) {
            return null;
        }
        return this.tileNodeFactory.create(row, col, tile, x, y);
    }

    private onTileTouch(node: cc.Node) {
        if (!this.boardPresenter) {
            return;
        }
        this.boardPresenter.onTileTouch(node);
    }

    private onTileTouchStart(node: cc.Node) {
        if (!this.boardPresenter) {
            return;
        }
        this.boardPresenter.onTileTouchStart(node);
    }

    private onTileTouchCancel() {
        if (!this.boardPresenter) {
            return;
        }
        this.boardPresenter.onTileTouchCancel();
    }

    private async resolveAutoShuffleIfNeeded() {
        if (!this.autoShuffleCoordinator) {
            return;
        }
        await this.autoShuffleCoordinator.resolveIfNeeded();
    }

    private validateVisualState() {
        if (!this.debug || !this.game || !this.tileRegistry) {
            return;
        }

        const visualCount = this.tileRegistry.count();
        const modelCount = this.game.board.getFilledCount();
        const expectedCount = this.rows * this.cols;
        if (visualCount !== modelCount) {
            // eslint-disable-next-line no-console
            console.warn('[BoardView] model/view desync', { visualCount, modelCount });
        }
        if (modelCount !== expectedCount || this.game.board.getNullCount() !== 0) {
            // eslint-disable-next-line no-console
            console.warn('[BoardView] board invariant failed', {
                modelCount,
                expectedCount,
                nullCount: this.game.board.getNullCount()
            });
        }
    }

}

