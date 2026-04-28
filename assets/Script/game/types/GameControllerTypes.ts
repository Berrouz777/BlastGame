import { Position, SpawnedTile, SpecialTileKind, TileMove } from './BoardTypes';

export type ResolveTurnResult = Readonly<{
    accepted: boolean;
    removed: Position[];
    moved: TileMove[];
    spawned: SpawnedTile[];
    activatedSpecialKind: SpecialTileKind | null;
    activatedSpecialOrigin: Position | null;
    createdSpecialKind: SpecialTileKind | null;
    createdSpecialPosition: Position | null;
}>;

export type ResolveNoMovesResult = Readonly<{
    shuffled: boolean;
    failed: boolean;
    attemptsUsed: number;
    hasMoveAfter: boolean;
}>;

export type ResolveTeleportResult = Readonly<{
    accepted: boolean;
    from: Position | null;
    to: Position | null;
}>;

export type SuperTileConfig = Readonly<{
    threshold: number;
    rowChance: number;
    columnChance: number;
    bombChance: number;
    clearAllChance: number;
}>;

export const DEFAULT_SUPER_TILE_CONFIG: SuperTileConfig = {
    threshold: 8,
    rowChance: 25,
    columnChance: 25,
    bombChance: 40,
    clearAllChance: 10
};

