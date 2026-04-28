import { Position, SpawnedTile, Tile, TileMove } from '../game/types/BoardTypes';
import ElementView from './ElementView';
import TileRegistry from './TileRegistry';

type CellCenterResolver = (row: number, col: number) => { x: number; y: number };
type SpawnNodeFactory = (row: number, col: number, tile: Tile, x: number, y: number) => cc.Node | null;
type ApplyTileVisual = () => void;

type AnimationConfig = Readonly<{
    fallDurationSec: number;
    burnDurationSec: number;
    cellHeight: number;
    getCellCenter: CellCenterResolver;
    getSpawnStartY: (spawnOffsetRows: number) => number;
}>;

export default class BoardAnimationPlayer {
    constructor(private readonly config: AnimationConfig) {}

    playInitialFall(node: cc.Node, fromY: number, toY: number, delaySec: number = 0) {
        this.playFall(node, fromY, toY, delaySec);
    }

    animateBurn(registry: TileRegistry, removed: Position[]) {
        const tasks: Array<Promise<void>> = [];

        for (const pos of removed) {
            tasks.push(this.animateBurnAt(registry, pos, 0));
        }

        return Promise.all(tasks);
    }

    animateBurnWave(registry: TileRegistry, removed: Position[], origin: Position, stepDelaySec: number) {
        const tasks: Array<Promise<void>> = [];
        const normalizedStepDelayMs = Math.max(0.01, stepDelaySec) * 1000;

        for (const pos of removed) {
            const distance = Math.abs(pos.row - origin.row) + Math.abs(pos.col - origin.col);
            tasks.push(this.animateBurnAt(registry, pos, distance * normalizedStepDelayMs));
        }

        return Promise.all(tasks);
    }

    animateTilesExitDown(registry: TileRegistry, exitDistanceY: number, durationSec: number, columnStepDelaySec: number = 0) {
        const tasks: Array<Promise<void>> = [];

        registry.forEach((_row, col, node) => {
            tasks.push(
                new Promise((resolve) => {
                    const targetY = node.y - Math.max(1, exitDistanceY);
                    const delayMs = Math.max(0, columnStepDelaySec) * col * 1000;
                    node.stopAllActions();
                    window.setTimeout(() => {
                        cc.tween(node)
                            .parallel(
                                cc.tween(node).to(Math.max(0.1, durationSec), { y: targetY }, { easing: 'quadIn' }),
                                cc.tween(node)
                                    .to(durationSec * 0.45, { scaleX: 0.9, scaleY: 1.18 })
                                    .to(durationSec * 0.25, { scaleX: 1.08, scaleY: 0.92 })
                                    .to(durationSec * 0.3, { scaleX: 1, scaleY: 1 })
                            )
                            .call(() => {
                                node.destroy();
                                resolve();
                            })
                            .start();
                    }, delayMs);
                })
            );
        });

        return Promise.all(tasks).then(() => {
            registry.reset();
        });
    }

    animateGravity(registry: TileRegistry, moves: TileMove[]) {
        const tasks: Array<Promise<void>> = [];

        for (const move of moves) {
            const node = registry.move(move.fromRow, move.col, move.toRow, move.col);
            if (!node) {
                continue;
            }

            const fromY = node.y;
            const target = this.config.getCellCenter(move.toRow, move.col);
            tasks.push(this.playFallAsync(node, fromY, target.y));
        }

        return Promise.all(tasks);
    }

    animateRefill(registry: TileRegistry, spawned: SpawnedTile[], createNode: SpawnNodeFactory) {
        const tasks: Array<Promise<void>> = [];

        for (const tile of spawned) {
            const target = this.config.getCellCenter(tile.row, tile.col);
            const fromY = this.config.getSpawnStartY(Math.max(tile.spawnOffsetRows, 1));
            const node = createNode(tile.row, tile.col, tile.tile, target.x, fromY);
            if (!node) {
                continue;
            }

            registry.set(tile.row, tile.col, node);
            tasks.push(this.playFallAsync(node, fromY, target.y));
        }

        return Promise.all(tasks);
    }

    animateShuffleBoard(registry: TileRegistry) {
        const tasks: Array<Promise<void>> = [];

        registry.forEach((_row, _col, node) => {
            tasks.push(this.playShuffleTileReveal(node));
        });

        return Promise.all(tasks);
    }

    animateShufflePreSwap(registry: TileRegistry) {
        const tasks: Array<Promise<void>> = [];

        registry.forEach((_row, _col, node) => {
            tasks.push(
                new Promise((resolve) => {
                    node.stopAllActions();
                    node.opacity = 255;
                    node.scaleX = 1;
                    node.scaleY = 1;
                    node.angle = 0;

                    cc.tween(node)
                        .to(0.08, { opacity: 90, scaleX: 0.78, scaleY: 0.78, angle: -8 }, { easing: 'quadIn' })
                        .call(() => resolve())
                        .start();
                })
            );
        });

        return Promise.all(tasks);
    }

    animateShuffleIcon(node: cc.Node | null) {
        if (!node) {
            return Promise.resolve();
        }
        return this.playShuffleShake(node, 0.05, 12, 1.08);
    }

    animateSwap(registry: TileRegistry, a: Position, b: Position) {
        const swapped = registry.swap(a.row, a.col, b.row, b.col);
        if (!swapped) {
            return Promise.resolve();
        }

        const aTarget = this.config.getCellCenter(b.row, b.col);
        const bTarget = this.config.getCellCenter(a.row, a.col);

        return Promise.all([this.moveNodeAsync(swapped.a, aTarget.x, aTarget.y), this.moveNodeAsync(swapped.b, bTarget.x, bTarget.y)]).then(
            () => undefined
        );
    }

    animateSuperTileReveal(registry: TileRegistry, pos: Position, applyVisual: ApplyTileVisual) {
        const node = registry.get(pos.row, pos.col);
        if (!node) {
            applyVisual();
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            const elementView = node.getComponent(ElementView);
            const visualNode = (elementView && elementView.sprite ? elementView.sprite.node : null) || node;
            const originalZIndex = node.zIndex;
            node.stopAllActions();
            visualNode.stopAllActions();
            node.opacity = 255;
            visualNode.opacity = 255;
            visualNode.angle = 0;
            visualNode.scaleX = 1;
            visualNode.scaleY = 1;
            node.zIndex = 10000;

            cc.tween(visualNode)
                .to(0.12, { scaleX: 1.22, scaleY: 1.22, angle: 240, opacity: 160 }, { easing: 'quadIn' })
                .call(() => {
                    applyVisual();
                    visualNode.color = new cc.Color(255, 245, 190);
                })
                .to(0.1, { scaleX: 1.3, scaleY: 1.3, opacity: 235 }, { easing: 'quadOut' })
                .to(0.12, { scaleX: 1, scaleY: 1, opacity: 255 }, { easing: 'backOut' })
                .call(() => {
                    visualNode.opacity = 255;
                    visualNode.scaleX = 1;
                    visualNode.scaleY = 1;
                    visualNode.color = cc.Color.WHITE;
                    applyVisual();
                    node.zIndex = originalZIndex;
                    resolve();
                })
                .start();
        });
    }

    private animateBurnAt(registry: TileRegistry, pos: Position, delayMs: number) {
        return new Promise<void>((resolve) => {
            const run = () => {
                const node = registry.remove(pos.row, pos.col);
                if (!node) {
                    resolve();
                    return;
                }

                this.playBurnNode(node, resolve);
            };

            if (delayMs <= 0) {
                run();
                return;
            }

            window.setTimeout(run, delayMs);
        });
    }

    private playBurnNode(node: cc.Node, resolve: () => void) {
        const elementView = node.getComponent(ElementView);
        if (elementView) {
            elementView.playPop({
                durationSec: this.config.burnDurationSec,
                onDone: () => {
                    node.destroy();
                    resolve();
                }
            });
            return;
        }

        cc.tween(node)
            .to(this.config.burnDurationSec, { scale: 0.5, opacity: 0 }, { easing: 'quadIn' })
            .call(() => {
                node.destroy();
                resolve();
            })
            .start();
    }

    private playFallAsync(node: cc.Node, fromY: number, toY: number) {
        return new Promise<void>((resolve) => {
            const elementView = node.getComponent(ElementView);
            if (elementView) {
                elementView.playFall({
                    fromY,
                    toY,
                    durationSec: this.config.fallDurationSec,
                    forceAnchorY: 0,
                    onDone: () => resolve()
                });
                return;
            }

            node.y = fromY;
            cc.tween(node)
                .to(this.config.fallDurationSec * 0.6, { y: toY }, { easing: 'quadIn' })
                .call(() => {
                    node.y = toY;
                    resolve();
                })
                .start();
        });
    }

    private playFall(node: cc.Node, fromY: number, toY: number, delaySec: number = 0) {
        const elementView = node.getComponent(ElementView);
        const run = () => {
            if (elementView) {
                elementView.playFall({
                    fromY,
                    toY,
                    durationSec: this.config.fallDurationSec,
                    forceAnchorY: 0
                });
                return;
            }

            node.y = fromY;
            cc.tween(node)
                .to(this.config.fallDurationSec * 0.6, { y: toY }, { easing: 'quadIn' })
                .call(() => {
                    node.y = toY;
                })
                .start();
        };

        if (delaySec > 0) {
            window.setTimeout(run, delaySec * 1000);
            return;
        }

        run();
    }

    private playShuffleShake(node: cc.Node, stepDurationSec: number, angle: number, scale: number) {
        return new Promise<void>((resolve) => {
            node.stopAllActions();
            node.angle = 0;
            node.scaleX = 1;
            node.scaleY = 1;

            cc.tween(node)
                .to(stepDurationSec, { angle: -angle, scaleX: scale, scaleY: scale })
                .to(stepDurationSec, { angle })
                .to(stepDurationSec, { angle: -angle })
                .to(stepDurationSec, { angle })
                .to(stepDurationSec, { angle: 0, scaleX: 1, scaleY: 1 })
                .call(() => resolve())
                .start();
        });
    }

    private moveNodeAsync(node: cc.Node, x: number, y: number) {
        return new Promise<void>((resolve) => {
            node.stopAllActions();
            cc.tween(node)
                .to(0.18, { x, y, scaleX: 1.08, scaleY: 1.08 }, { easing: 'quadOut' })
                .to(0.08, { scaleX: 1, scaleY: 1 }, { easing: 'quadInOut' })
                .call(() => {
                    node.x = x;
                    node.y = y;
                    node.scaleX = 1;
                    node.scaleY = 1;
                    resolve();
                })
                .start();
        });
    }

    private playShuffleTileReveal(node: cc.Node) {
        return new Promise<void>((resolve) => {
            node.stopAllActions();
            cc.tween(node)
                .to(0.08, { opacity: 255, scaleX: 1.12, scaleY: 1.12, angle: 8 }, { easing: 'quadOut' })
                .to(0.06, { angle: -6 })
                .to(0.06, { angle: 0, scaleX: 1, scaleY: 1 })
                .call(() => {
                    node.opacity = 255;
                    node.scaleX = 1;
                    node.scaleY = 1;
                    node.angle = 0;
                    resolve();
                })
                .start();
        });
    }
}
