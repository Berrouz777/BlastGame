const { ccclass, property } = cc._decorator;

type FallOptions = Readonly<{
    fromY: number;
    toY: number;
    durationSec: number;
    forceAnchorY?: number;
    onDone?: () => void;
}>;

type PopOptions = Readonly<{
    durationSec: number;
    onDone?: () => void;
}>;

@ccclass
export default class ElementView extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property
    debug: boolean = false;

    onLoad() {
        // Частая удобная авто-подвязка: если поле не назначили руками
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite);
        }

        if (!this.sprite && this.debug) {
            // eslint-disable-next-line no-console
            console.warn('[ElementView] sprite is not assigned');
        }
    }

    setSpriteFrame(frame: cc.SpriteFrame | null) {
        if (!this.sprite) {
            if (this.debug) {
                // eslint-disable-next-line no-console
                console.warn('[ElementView] setSpriteFrame skipped: sprite is null');
            }
            return;
        }

        this.sprite.spriteFrame = frame;
    }

    setVisualAngle(angle: number) {
        if (!this.sprite) {
            return;
        }

        this.sprite.node.angle = angle;
    }

    setVisualPadding(paddingX: number, paddingY: number) {
        const normalizedPaddingX = Math.max(0, paddingX);
        const normalizedPaddingY = Math.max(0, paddingY);

        if (!this.sprite || this.sprite.node === this.node) {
            this.sprite = this.createInnerSprite(this.sprite);
        }

        const visualNode = this.sprite.node;
        visualNode.setAnchorPoint(0.5, 0.5);
        visualNode.x = 0;
        visualNode.y = this.node.height / 2;
        visualNode.width = Math.max(1, this.node.width - normalizedPaddingX * 2);
        visualNode.height = Math.max(1, this.node.height - normalizedPaddingY * 2);
    }

    private createInnerSprite(sourceSprite: cc.Sprite | null) {
        const visualNode = new cc.Node('Visual');
        visualNode.parent = this.node;

        const innerSprite = visualNode.addComponent(cc.Sprite);
        if (sourceSprite) {
            innerSprite.spriteFrame = sourceSprite.spriteFrame;
            innerSprite.type = sourceSprite.type;
            innerSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            sourceSprite.enabled = false;
        }

        return innerSprite;
    }

    /**
     * Падение + squash&stretch "как в @pirates GameCell.vue -> keyframes fall".
     * Важно: элемент долетает до цели к 60% времени, далее идёт удар/отскок на месте.
     */
    playFall(opts: FallOptions) {
        const { fromY, toY, durationSec, forceAnchorY = 0, onDone } = opts;

        if (!Number.isFinite(durationSec) || durationSec <= 0) {
            if (this.debug) {
                // eslint-disable-next-line no-console
                console.warn('[ElementView] playFall skipped: invalid durationSec', { durationSec });
            }
            return;
        }

        this.node.stopAllActions();
        this.node.setAnchorPoint(0.5, forceAnchorY);
        this.node.y = fromY;
        this.node.scaleX = 1;
        this.node.scaleY = 1;

        const moveDuration = durationSec * 0.6;

        if (this.debug) {
            // eslint-disable-next-line no-console
            console.log('[ElementView] playFall', { fromY, toY, durationSec, moveDuration });
        }

        cc.tween(this.node)
            .parallel(
                cc.tween(this.node).to(moveDuration, { y: toY }, { easing: 'quadIn' }),
                cc.tween(this.node)
                    .to(moveDuration, { scaleX: 0.9, scaleY: 1.2 })
                    .to(durationSec * 0.2, { scaleX: 1.2, scaleY: 0.9 })
                    .to(durationSec * 0.1, { scaleX: 1.1, scaleY: 0.9 })
                    .to(durationSec * 0.1, { scaleX: 1, scaleY: 1 })
            )
            .call(() => {
                this.node.y = toY;
                if (onDone) {
                    onDone();
                }
            })
            .start();
    }

    playPop(opts: PopOptions) {
        const { durationSec, onDone } = opts;
        if (!Number.isFinite(durationSec) || durationSec <= 0) {
            if (onDone) {
                onDone();
            }
            return;
        }

        this.node.stopAllActions();
        this.node.scaleX = 1;
        this.node.scaleY = 1;
        this.node.opacity = 255;

        cc.tween(this.node)
            .to(durationSec * 0.6, { scaleX: 1.25, scaleY: 1.25, opacity: 220 }, { easing: 'quadOut' })
            .to(durationSec * 0.4, { scaleX: 0.6, scaleY: 0.6, opacity: 0 }, { easing: 'quadIn' })
            .call(() => {
                if (onDone) {
                    onDone();
                }
            })
            .start();
    }
}

