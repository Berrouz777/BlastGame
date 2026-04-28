import ExplosionEffect from './ExplosionEffect';
import { Position, SpecialTileKind } from '../game/types/BoardTypes';

type BoardEffectsPresenterConfig = Readonly<{
    elementsRoot: cc.Node;
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    explosionPrefab: cc.Prefab | null;
    explosionFrames: cc.SpriteFrame[];
    explosionScale: number;
    explosionDurationSec: number;
    lineExplosionStepSec: number;
    getCellCenter: (row: number, col: number) => { x: number; y: number };
    getGridSize: () => { totalW: number; totalH: number };
    debug: boolean;
}>;

export default class BoardEffectsPresenter {
    constructor(private readonly config: BoardEffectsPresenterConfig) {}

    createSpecialExplosionTask(
        wasBombModeActive: boolean,
        row: number,
        col: number,
        specialKind: SpecialTileKind | null,
        specialOrigin: Position | null,
        bombRadius: number
    ) {
        if (wasBombModeActive) {
            return this.playBombExplosion(row, col, bombRadius);
        }

        if (specialKind === 'bomb' || specialKind === 'radius') {
            const origin = specialOrigin || { row, col };
            return this.playBombExplosion(origin.row, origin.col, 1);
        }

        if (specialKind === 'clearAll') {
            return this.playBoardExplosion();
        }

        return Promise.resolve();
    }

    playLineExplosionWave(positions: Position[], origin: Position) {
        const stepDelayMs = Math.max(0.01, this.config.lineExplosionStepSec) * 1000;
        const tasks: Array<Promise<void>> = [];

        for (const pos of positions) {
            const distance = Math.abs(pos.row - origin.row) + Math.abs(pos.col - origin.col);
            tasks.push(
                new Promise((resolve) => {
                    window.setTimeout(() => {
                        this.playBombExplosion(pos.row, pos.col, 0).then(resolve);
                    }, distance * stepDelayMs);
                })
            );
        }

        return Promise.all(tasks).then(() => undefined);
    }

    private playBombExplosion(row: number, col: number, radius: number) {
        if ((!this.config.explosionPrefab && !this.config.explosionFrames.length) || !this.config.elementsRoot) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardEffectsPresenter] bomb explosion skipped: assign explosionPrefab or explosionFrames');
            }
            return Promise.resolve();
        }

        const normalizedRadius = Math.max(0, Math.floor(radius));
        const diameter = normalizedRadius * 2 + 1;
        const center = this.config.getCellCenter(row, col);
        const node = this.config.explosionPrefab ? cc.instantiate(this.config.explosionPrefab) : new cc.Node();
        node.name = `bomb_explosion_${row}_${col}`;
        node.active = true;
        node.parent = this.config.elementsRoot;
        node.setAnchorPoint(0.5, 0.5);
        node.x = center.x;
        node.y = center.y;
        node.opacity = 255;
        node.color = cc.Color.WHITE;
        node.zIndex = 9999;
        node.width = this.config.cellWidth * diameter * this.config.explosionScale;
        node.height = this.config.cellHeight * diameter * this.config.explosionScale;
        node.scaleX = 1;
        node.scaleY = 1;
        node.setSiblingIndex(this.config.elementsRoot.childrenCount - 1);

        const effect = node.getComponent(ExplosionEffect);
        const prefabFrames = effect && effect.frames ? effect.frames.filter(Boolean) : [];
        const frames = prefabFrames.length ? prefabFrames : this.config.explosionFrames.filter(Boolean);
        return this.playExplosionFrames(node, frames);
    }

    private playBoardExplosion() {
        if ((!this.config.explosionPrefab && !this.config.explosionFrames.length) || !this.config.elementsRoot) {
            if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.warn('[BoardEffectsPresenter] board explosion skipped: assign explosionPrefab or explosionFrames');
            }
            return Promise.resolve();
        }

        const first = this.config.getCellCenter(0, 0);
        const last = this.config.getCellCenter(this.config.rows - 1, this.config.cols - 1);
        const { totalW, totalH } = this.config.getGridSize();
        const node = this.config.explosionPrefab ? cc.instantiate(this.config.explosionPrefab) : new cc.Node();
        node.name = 'clear_all_explosion';
        node.active = true;
        node.parent = this.config.elementsRoot;
        node.setAnchorPoint(0.5, 0.5);
        node.x = (first.x + last.x) / 2;
        node.y = (first.y + last.y) / 2;
        node.opacity = 255;
        node.color = cc.Color.WHITE;
        node.zIndex = 9999;
        node.width = totalW;
        node.height = totalH;
        node.scaleX = 1;
        node.scaleY = 1;
        node.setSiblingIndex(this.config.elementsRoot.childrenCount - 1);

        const effect = node.getComponent(ExplosionEffect);
        const prefabFrames = effect && effect.frames ? effect.frames.filter(Boolean) : [];
        const frames = prefabFrames.length ? prefabFrames : this.config.explosionFrames.filter(Boolean);
        return this.playExplosionFrames(node, frames);
    }

    private playExplosionFrames(node: cc.Node, frames: cc.SpriteFrame[]) {
        const sprite = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
        sprite.enabled = true;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        if (frames.length === 0) {
            node.destroy();
            return Promise.resolve();
        }

        const frameDurationMs = (Math.max(0.05, this.config.explosionDurationSec) / frames.length) * 1000;
        return new Promise<void>((resolve) => {
            let index = 0;
            const showNext = () => {
                if (!node.isValid) {
                    resolve();
                    return;
                }

                if (index >= frames.length) {
                    node.destroy();
                    resolve();
                    return;
                }

                sprite.spriteFrame = frames[index];
                index++;
                window.setTimeout(showNext, frameDurationMs);
            };

            showNext();
        });
    }
}

