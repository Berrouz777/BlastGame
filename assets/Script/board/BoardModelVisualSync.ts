import GameController from '../game/controller/GameController';
import TileNodeFactory from './TileNodeFactory';
import TileRegistry from './TileRegistry';
import { Position } from '../game/types/BoardTypes';

type BoardModelVisualSyncConfig = Readonly<{
    getGame: () => GameController | null;
    getTileRegistry: () => TileRegistry | null;
    getTileNodeFactory: () => TileNodeFactory | null;
}>;

export default class BoardModelVisualSync {
    constructor(private readonly config: BoardModelVisualSyncConfig) {}

    syncAll() {
        const tileRegistry = this.config.getTileRegistry();
        if (!tileRegistry) {
            return;
        }

        tileRegistry.forEach((row, col, node) => {
            this.applyAt(row, col, node);
        });
    }

    syncAt(pos: Position) {
        const tileRegistry = this.config.getTileRegistry();
        if (!tileRegistry) {
            return;
        }

        const node = tileRegistry.get(pos.row, pos.col);
        if (!node) {
            return;
        }

        this.applyAt(pos.row, pos.col, node);
    }

    private applyAt(row: number, col: number, node: cc.Node) {
        const game = this.config.getGame();
        const tileNodeFactory = this.config.getTileNodeFactory();
        const tile = game ? game.board.get(row, col) : null;
        if (tile === null || !tileNodeFactory) {
            return;
        }
        tileNodeFactory.applyVisual(node, tile);
    }
}
