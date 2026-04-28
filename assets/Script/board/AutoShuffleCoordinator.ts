import GameController from '../game/controller/GameController';
import BoardAnimationPlayer from './BoardAnimationPlayer';
import TileRegistry from './TileRegistry';

type AutoShuffleConfig = Readonly<{
    getGame: () => GameController | null;
    getTileRegistry: () => TileRegistry | null;
    getAnimationPlayer: () => BoardAnimationPlayer | null;
    syncTileSpritesWithModel: () => void;
}>;

export default class AutoShuffleCoordinator {
    constructor(private readonly config: AutoShuffleConfig) {}

    async resolveIfNeeded() {
        const game = this.config.getGame();
        const tileRegistry = this.config.getTileRegistry();
        const animationPlayer = this.config.getAnimationPlayer();
        if (!game || !tileRegistry || !animationPlayer || !game.session.isPlaying()) {
            return;
        }

        while (game.session.isPlaying() && !game.hasAnyMove()) {
            const result = game.resolveNoMovesIfNeeded();
            if (!result.shuffled) {
                return;
            }

            await animationPlayer.animateShufflePreSwap(tileRegistry);
            this.config.syncTileSpritesWithModel();
            await animationPlayer.animateShuffleBoard(tileRegistry);

            if (result.hasMoveAfter) {
                return;
            }
        }
    }
}

