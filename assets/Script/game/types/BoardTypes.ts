export type ColorId = number;

export type NormalTile = Readonly<{
    kind: 'normal';
    colorId: ColorId;
}>;

export type SpecialTileKind = 'bomb' | 'row' | 'column' | 'radius' | 'clearAll';

export type SpecialTile = Readonly<{
    kind: SpecialTileKind;
    colorId: ColorId;
}>;

export type Tile = NormalTile | SpecialTile;

export type CellValue = Tile | null;

export type BoardState = CellValue[][];

export function createNormalTile(colorId: ColorId): NormalTile {
    return {
        kind: 'normal',
        colorId
    };
}

export function createSpecialTile(kind: SpecialTileKind, colorId: ColorId): SpecialTile {
    return {
        kind,
        colorId
    };
}

export function getTileColorId(tile: CellValue): ColorId | null {
    return tile === null ? null : tile.colorId;
}

export function getBlastColorId(tile: CellValue): ColorId | null {
    return tile !== null && tile.kind === 'normal' ? tile.colorId : null;
}

export type Position = Readonly<{
    row: number;
    col: number;
}>;

export type TileMove = Readonly<{
    fromRow: number;
    toRow: number;
    col: number;
    tile: Tile;
    colorId: ColorId;
}>;

export type SpawnedTile = Readonly<{
    row: number;
    col: number;
    tile: Tile;
    colorId: ColorId;
    spawnOffsetRows: number;
}>;
