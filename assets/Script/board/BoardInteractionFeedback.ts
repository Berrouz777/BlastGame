import { Position } from '../game/types/BoardTypes';
import TileRegistry from './TileRegistry';

type NodeVisualState = Readonly<{
    scaleX: number;
    scaleY: number;
    opacity: number;
    zIndex: number;
}>;

export default class BoardInteractionFeedback {
    private highlighted: cc.Node[] = [];
    private readonly originalStates: Map<cc.Node, NodeVisualState> = new Map();

    constructor(private readonly tileRegistry: TileRegistry) {}

    highlightGroup(positions: Position[]) {
        this.clearHighlight();

        for (const pos of positions) {
            const node = this.tileRegistry.get(pos.row, pos.col);
            if (!node) {
                continue;
            }

            this.originalStates.set(node, {
                scaleX: node.scaleX,
                scaleY: node.scaleY,
                opacity: node.opacity,
                zIndex: node.zIndex
            });
            node.stopAllActions();
            node.opacity = 255;
            node.zIndex = Math.max(node.zIndex, 900);
            cc.tween(node).to(0.08, { scaleX: 1.08, scaleY: 1.08 }, { easing: 'quadOut' }).start();
            this.highlighted.push(node);
        }
    }

    clearHighlight() {
        for (const node of this.highlighted) {
            const state = this.originalStates.get(node);
            if (!state || !node.isValid) {
                continue;
            }

            node.stopAllActions();
            node.opacity = state.opacity;
            node.zIndex = state.zIndex;
            cc.tween(node).to(0.06, { scaleX: state.scaleX, scaleY: state.scaleY }, { easing: 'quadOut' }).start();
        }

        this.highlighted = [];
        this.originalStates.clear();
    }

    playInvalidClick(pos: Position) {
        const node = this.tileRegistry.get(pos.row, pos.col);
        if (!node) {
            return;
        }

        const startX = node.x;
        const startScaleX = node.scaleX;
        const startScaleY = node.scaleY;
        node.stopAllActions();
        cc.tween(node)
            .to(0.035, { x: startX - 6, scaleX: 0.95, scaleY: 1.05 }, { easing: 'quadOut' })
            .to(0.035, { x: startX + 6, scaleX: 1.04, scaleY: 0.96 })
            .to(0.035, { x: startX - 4 })
            .to(0.04, { x: startX, scaleX: startScaleX, scaleY: startScaleY }, { easing: 'quadOut' })
            .start();
    }
}
