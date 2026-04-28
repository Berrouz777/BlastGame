import BoardAnimationPlayer from './BoardAnimationPlayer';
import BoardEffectsPresenter from './BoardEffectsPresenter';
import TileRegistry from './TileRegistry';
import { Position, SpecialTileKind } from '../game/types/BoardTypes';

type TurnVisualPipelineConfig = Readonly<{
    getAnimationPlayer: () => BoardAnimationPlayer | null;
    getTileRegistry: () => TileRegistry | null;
    getEffectsPresenter: () => BoardEffectsPresenter | null;
    lineExplosionStepSec: number;
    bombRadius: number;
}>;

export default class TurnVisualPipeline {
    constructor(private readonly config: TurnVisualPipelineConfig) {}

    createSpecialExplosionTask(
        wasBombModeActive: boolean,
        row: number,
        col: number,
        specialKind: SpecialTileKind | null,
        specialOrigin: Position | null
    ) {
        const effectsPresenter = this.config.getEffectsPresenter();
        if (!effectsPresenter) {
            return Promise.resolve();
        }
        return effectsPresenter.createSpecialExplosionTask(
            wasBombModeActive,
            row,
            col,
            specialKind,
            specialOrigin,
            this.config.bombRadius
        );
    }

    createBurnTask(removed: Position[], specialKind: SpecialTileKind | null, specialOrigin: Position | null) {
        const tileRegistry = this.config.getTileRegistry();
        const animationPlayer = this.config.getAnimationPlayer();
        if (!tileRegistry || !animationPlayer) {
            return Promise.resolve();
        }

        if ((specialKind === 'row' || specialKind === 'column') && specialOrigin) {
            return Promise.all([
                this.playLineExplosionWave(removed, specialOrigin),
                animationPlayer.animateBurnWave(tileRegistry, removed, specialOrigin, this.config.lineExplosionStepSec)
            ]).then(() => undefined);
        }

        return animationPlayer.animateBurn(tileRegistry, removed);
    }

    private playLineExplosionWave(positions: Position[], origin: Position) {
        const effectsPresenter = this.config.getEffectsPresenter();
        if (!effectsPresenter) {
            return Promise.resolve();
        }
        return effectsPresenter.playLineExplosionWave(positions, origin);
    }
}
