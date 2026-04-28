import BoosterUiController from './BoosterUiController';
import BoardInteractionFeedback from './BoardInteractionFeedback';
import TurnFlowCoordinator from './TurnFlowCoordinator';
import GameController from '../game/controller/GameController';
import TileRegistry from './TileRegistry';
import { Position, SpecialTileKind, Tile } from '../game/types/BoardTypes';

type BoardPresenterConfig = Readonly<{
    getGame: () => GameController | null;
    getTileRegistry: () => TileRegistry | null;
    getTurnFlowCoordinator: () => TurnFlowCoordinator | null;
    getBoosterUiController: () => BoosterUiController | null;
    getInteractionFeedback: () => BoardInteractionFeedback | null;
    isResolving: () => boolean;
    isGameEndAnimating: () => boolean;
    bombRadius: number;
    debug: boolean;
    createSpecialExplosionTask: (
        wasBombModeActive: boolean,
        row: number,
        col: number,
        specialKind: SpecialTileKind | null,
        specialOrigin: Position | null
    ) => Promise<void>;
    createBurnTask: (removed: Position[], specialKind: SpecialTileKind | null, specialOrigin: Position | null) => Promise<void>;
    createNode: (row: number, col: number, tile: Tile, x: number, y: number) => cc.Node | null;
    revealCreatedSpecial: (pos: Position) => Promise<void>;
    syncTileSpritesWithModel: () => void;
    resolveAutoShuffleIfNeeded: () => Promise<void>;
}>;

export default class BoardPresenter {
    constructor(private readonly config: BoardPresenterConfig) {}

    onTileTouchStart(node: cc.Node) {
        const game = this.config.getGame();
        const tileRegistry = this.config.getTileRegistry();
        const feedback = this.config.getInteractionFeedback();
        if (!game || !tileRegistry || !feedback || this.shouldIgnoreInput()) {
            return;
        }

        const boosterUiController = this.config.getBoosterUiController();
        if (boosterUiController && (boosterUiController.isBombActive() || boosterUiController.isTeleportActive())) {
            feedback.clearHighlight();
            return;
        }

        const pos = tileRegistry.getPositionByNode(node);
        if (!pos) {
            feedback.clearHighlight();
            return;
        }

        feedback.highlightGroup(game.previewBlastGroup(pos.row, pos.col));
    }

    onTileTouchCancel() {
        const feedback = this.config.getInteractionFeedback();
        if (feedback) {
            feedback.clearHighlight();
        }
    }

    onTileTouch(node: cc.Node) {
        const game = this.config.getGame();
        const tileRegistry = this.config.getTileRegistry();
        if (!game || !tileRegistry) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardPresenter] touch ignored: game not initialized');
            }
            return;
        }

        if (this.config.isResolving() || this.config.isGameEndAnimating()) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.log('[BoardPresenter] touch ignored: resolving');
            }
            return;
        }

        if (!game.session.isPlaying()) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.log('[BoardPresenter] touch ignored: game finished', { status: game.session.status });
            }
            return;
        }

        const pos = tileRegistry.getPositionByNode(node);
        if (!pos) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardPresenter] touch ignored: position not found for node', { name: node.name });
            }
            return;
        }

        if (this.config.debug) {
            // eslint-disable-next-line no-console
            console.log('[BoardPresenter] tile click', { row: pos.row, col: pos.col, name: node.name });
        }

        const feedback = this.config.getInteractionFeedback();
        if (feedback) {
            feedback.clearHighlight();
        }
        this.resolveTurn(pos.row, pos.col);
    }

    private async resolveTurn(row: number, col: number) {
        const game = this.config.getGame();
        const turnFlowCoordinator = this.config.getTurnFlowCoordinator();
        if (!game || !turnFlowCoordinator || this.config.isResolving()) {
            return;
        }

        const boosterUiController = this.config.getBoosterUiController();
        if (boosterUiController && boosterUiController.isTeleportActive()) {
            await this.resolveTeleportTurn(row, col);
            return;
        }

        const wasBombModeActive = boosterUiController ? boosterUiController.isBombActive() : false;
        const result = wasBombModeActive ? game.resolveBomb(row, col, this.config.bombRadius) : game.resolveClick(row, col);

        if (!result.accepted) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.log('[BoardPresenter] click rejected', { row, col });
            }
            if (boosterUiController) {
                boosterUiController.refreshUi();
            }
            const feedback = this.config.getInteractionFeedback();
            if (feedback) {
                feedback.playInvalidClick({ row, col });
            }
            return;
        }

        if (wasBombModeActive && boosterUiController) {
            boosterUiController.consumeBombAndDeactivate();
        }

        await turnFlowCoordinator.playResolvedTurn(
            {
                row,
                col,
                wasBombModeActive,
                removed: result.removed,
                moved: result.moved,
                spawned: result.spawned,
                activatedSpecialKind: result.activatedSpecialKind,
                activatedSpecialOrigin: result.activatedSpecialOrigin,
                createdSpecialPosition: result.createdSpecialPosition
            },
            {
                createSpecialExplosionTask: (bombModeActive, clickRow, clickCol, kind, origin) =>
                    this.config.createSpecialExplosionTask(bombModeActive, clickRow, clickCol, kind, origin),
                createBurnTask: (removed, kind, origin) => this.config.createBurnTask(removed, kind, origin),
                createNode: (spawnRow, spawnCol, tile, x, y) => this.config.createNode(spawnRow, spawnCol, tile, x, y),
                revealCreatedSpecial: (pos) => this.config.revealCreatedSpecial(pos),
                syncTileSpritesWithModel: () => this.config.syncTileSpritesWithModel(),
                resolveAutoShuffleIfNeeded: () => this.config.resolveAutoShuffleIfNeeded()
            }
        );
    }

    private shouldIgnoreInput() {
        const game = this.config.getGame();
        return !game || this.config.isResolving() || this.config.isGameEndAnimating() || !game.session.isPlaying();
    }

    private async resolveTeleportTurn(row: number, col: number) {
        const game = this.config.getGame();
        const turnFlowCoordinator = this.config.getTurnFlowCoordinator();
        const boosterUiController = this.config.getBoosterUiController();
        if (!game || !turnFlowCoordinator || !boosterUiController) {
            return;
        }

        const firstSelection = boosterUiController.getTeleportFirstSelection();
        if (!firstSelection) {
            boosterUiController.setTeleportFirstSelection({ row, col });
            boosterUiController.refreshUi();
            return;
        }

        const from = firstSelection;
        if (from.row === row && from.col === col) {
            boosterUiController.deactivateTeleport();
            return;
        }

        const result = game.resolveTeleport(from.row, from.col, row, col);
        if (!result.accepted || !result.from || !result.to) {
            boosterUiController.deactivateTeleport();
            return;
        }

        boosterUiController.consumeTeleportAndDeactivate();
        await turnFlowCoordinator.playTeleport(
            {
                from: result.from,
                to: result.to
            },
            {
                resolveAutoShuffleIfNeeded: () => this.config.resolveAutoShuffleIfNeeded()
            }
        );
    }
}
