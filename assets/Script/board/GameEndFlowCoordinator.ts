import BoardAnimationPlayer from './BoardAnimationPlayer';
import GameEndOverlayController from './GameEndOverlayController';
import GameController from '../game/controller/GameController';
import TileRegistry from './TileRegistry';

type GameEndFlowConfig = Readonly<{
    getGame: () => GameController | null;
    getTileRegistry: () => TileRegistry | null;
    getAnimationPlayer: () => BoardAnimationPlayer | null;
    getOverlayController: () => GameEndOverlayController | null;
    isGameEndAnimating: () => boolean;
    setGameEndAnimating: (value: boolean) => void;
    getBoardExitDistanceY: () => number;
    gameEndTilesExitDurationSec: number;
    gameEndColumnStepSec: number;
}>;

export default class GameEndFlowCoordinator {
    constructor(private readonly config: GameEndFlowConfig) {}

    hideImmediate() {
        const overlay = this.config.getOverlayController();
        if (!overlay) {
            return;
        }
        overlay.hideImmediate();
    }

    hideAnimated() {
        const overlay = this.config.getOverlayController();
        if (!overlay) {
            return Promise.resolve();
        }
        return overlay.hideAnimated();
    }

    async restart(onRestart: () => void) {
        if (this.config.isGameEndAnimating()) {
            return;
        }

        this.config.setGameEndAnimating(true);
        await this.hideAnimated();
        this.config.setGameEndAnimating(false);
        onRestart();
    }

    async resolveIfNeeded() {
        const game = this.config.getGame();
        const tileRegistry = this.config.getTileRegistry();
        const animationPlayer = this.config.getAnimationPlayer();
        const overlay = this.config.getOverlayController();
        if (!game || !tileRegistry || !animationPlayer || !overlay || game.session.isPlaying() || this.config.isGameEndAnimating()) {
            return;
        }

        this.config.setGameEndAnimating(true);
        const status = game.session.status;
        await animationPlayer.animateTilesExitDown(
            tileRegistry,
            this.config.getBoardExitDistanceY(),
            this.config.gameEndTilesExitDurationSec,
            this.config.gameEndColumnStepSec
        );
        await overlay.show(status === 'win' ? 'you win!' : 'you lose :(');
        this.config.setGameEndAnimating(false);
    }
}
