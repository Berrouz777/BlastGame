import { Position, SpawnedTile, SpecialTileKind, Tile, TileMove } from '../../game/types/BoardTypes';

export type TurnFlowHooks = Readonly<{
    beforeFlow: () => void;
    afterFlow: () => void;
    afterFlowAsync: () => Promise<void>;
}>;

export type TurnAnimationInput = Readonly<{
    row: number;
    col: number;
    wasBombModeActive: boolean;
    removed: Position[];
    moved: TileMove[];
    spawned: SpawnedTile[];
    activatedSpecialKind: SpecialTileKind | null;
    activatedSpecialOrigin: Position | null;
    createdSpecialPosition: Position | null;
}>;

export type TurnAnimationCallbacks = Readonly<{
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

export type TeleportAnimationInput = Readonly<{
    from: Position;
    to: Position;
}>;

export type TeleportAnimationCallbacks = Readonly<{
    resolveAutoShuffleIfNeeded: () => Promise<void>;
}>;

