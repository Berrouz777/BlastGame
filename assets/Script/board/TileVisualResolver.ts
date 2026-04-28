import { Tile } from '../game/types/BoardTypes';

type TileVisualResolverConfig = Readonly<{
    defaultElementFrame: cc.SpriteFrame | null;
    superLineFrame: cc.SpriteFrame | null;
    superBombFrame: cc.SpriteFrame | null;
    superClearAllFrame: cc.SpriteFrame | null;
}>;

export default class TileVisualResolver {
    private colorFrames: cc.SpriteFrame[] = [];

    constructor(private readonly config: TileVisualResolverConfig) {}

    setColorFrames(frames: cc.SpriteFrame[]) {
        this.colorFrames = [...frames];
    }

    resolveFrame(tile: Tile) {
        switch (tile.kind) {
            case 'row':
            case 'column':
                return this.config.superLineFrame || this.resolveColorFrame(tile.colorId);
            case 'bomb':
            case 'radius':
                return this.config.superBombFrame || this.resolveColorFrame(tile.colorId);
            case 'clearAll':
                return this.config.superClearAllFrame || this.resolveColorFrame(tile.colorId);
            default:
                return this.resolveColorFrame(tile.colorId);
        }
    }

    resolveAngle(tile: Tile) {
        return tile.kind === 'column' ? 90 : 0;
    }

    private resolveColorFrame(colorId: number) {
        if (this.colorFrames.length === 0) {
            return this.config.defaultElementFrame || null;
        }
        return this.colorFrames[colorId % this.colorFrames.length] || this.config.defaultElementFrame || null;
    }
}
