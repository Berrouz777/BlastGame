import BoardAnimationPlayer from './BoardAnimationPlayer';
import TileRegistry from './TileRegistry';
import {
    TeleportAnimationCallbacks,
    TeleportAnimationInput,
    TurnAnimationCallbacks,
    TurnAnimationInput,
    TurnFlowHooks
} from './types/TurnFlowTypes';

export default class TurnFlowCoordinator {
    constructor(
        private readonly animationPlayer: BoardAnimationPlayer,
        private readonly tileRegistry: TileRegistry,
        private readonly hooks: TurnFlowHooks
    ) {}

    async playResolvedTurn(input: TurnAnimationInput, callbacks: TurnAnimationCallbacks) {
        this.hooks.beforeFlow();

        const explosionTask = callbacks.createSpecialExplosionTask(
            input.wasBombModeActive,
            input.row,
            input.col,
            input.activatedSpecialKind,
            input.activatedSpecialOrigin
        );
        const burnTask = callbacks.createBurnTask(input.removed, input.activatedSpecialKind, input.activatedSpecialOrigin);
        await Promise.all([explosionTask, burnTask]);
        await this.animationPlayer.animateGravity(this.tileRegistry, input.moved);
        await this.animationPlayer.animateRefill(this.tileRegistry, input.spawned, callbacks.createNode);

        if (input.createdSpecialPosition) {
            await callbacks.revealCreatedSpecial(input.createdSpecialPosition);
        } else {
            callbacks.syncTileSpritesWithModel();
        }

        await callbacks.resolveAutoShuffleIfNeeded();
        this.hooks.afterFlow();
        await this.hooks.afterFlowAsync();
    }

    async playTeleport(input: TeleportAnimationInput, callbacks: TeleportAnimationCallbacks) {
        this.hooks.beforeFlow();
        await this.animationPlayer.animateSwap(this.tileRegistry, input.from, input.to);
        await callbacks.resolveAutoShuffleIfNeeded();
        this.hooks.afterFlow();
        await this.hooks.afterFlowAsync();
    }
}

