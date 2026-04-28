import ElementView from './ElementView';
import { Tile } from '../game/types/BoardTypes';

type TileNodeFactoryConfig = Readonly<{
    elementPrefab: cc.Prefab;
    elementsRoot: cc.Node;
    cellWidth: number;
    cellHeight: number;
    visualPaddingX: number;
    visualPaddingY: number;
    bindInput: (node: cc.Node) => void;
    resolveFrame: (tile: Tile) => cc.SpriteFrame | null;
    resolveAngle: (tile: Tile) => number;
}>;

export default class TileNodeFactory {
    constructor(private readonly config: TileNodeFactoryConfig) {}

    create(row: number, col: number, tile: Tile, x: number, y: number) {
        const node = cc.instantiate(this.config.elementPrefab);
        node.name = `el_${row}_${col}`;
        node.active = true;
        node.setAnchorPoint(0.5, 0);
        node.width = this.config.cellWidth;
        node.height = this.config.cellHeight;
        node.x = x;
        node.y = y;
        node.opacity = 255;
        node.scaleX = 1;
        node.scaleY = 1;
        this.config.elementsRoot.addChild(node);

        this.applyVisual(node, tile);
        this.config.bindInput(node);
        return node;
    }

    applyVisual(node: cc.Node, tile: Tile) {
        const frame = this.config.resolveFrame(tile);
        const angle = this.config.resolveAngle(tile);
        const elementView = node.getComponent(ElementView);
        if (elementView) {
            elementView.setVisualPadding(this.config.visualPaddingX, this.config.visualPaddingY);
            elementView.setSpriteFrame(frame);
            elementView.setVisualAngle(angle);
            return;
        }

        const sprite = node.getComponent(cc.Sprite);
        if (sprite) {
            sprite.spriteFrame = frame;
        }
        node.angle = angle;
    }
}

