const { ccclass, property } = cc._decorator;

@ccclass
export default class ExplosionEffect extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property([cc.SpriteFrame])
    frames: cc.SpriteFrame[] = [];

    @property
    durationSec: number = 0.35;

    @property
    autoDestroy: boolean = true;

    onLoad() {
        this.ensureSprite();
    }

    play() {
        this.ensureSprite();
        const frames = (this.frames || []).filter(Boolean);
        if (!this.sprite || frames.length === 0) {
            if (this.autoDestroy) {
                this.node.destroy();
            }
            return Promise.resolve();
        }

        const total = frames.length;
        const dt = Math.max(0.01, this.durationSec / total);

        this.node.stopAllActions();
        this.node.active = true;
        this.node.opacity = 255;
        this.sprite.enabled = true;
        this.sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this.sprite.spriteFrame = frames[0];
        this.node.color = cc.Color.WHITE;

        return new Promise<void>((resolve) => {
            let index = 0;

            const showNextFrame = () => {
                if (!this.node || !this.node.isValid || !this.sprite) {
                    resolve();
                    return;
                }

                if (index >= total) {
                    if (this.autoDestroy) {
                        this.node.destroy();
                    }
                    resolve();
                    return;
                }

                this.sprite.spriteFrame = frames[index];
                index++;
                window.setTimeout(showNextFrame, dt * 1000);
            };

            showNextFrame();
        });
    }

    private ensureSprite() {
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite);
        }
        if (!this.sprite) {
            this.sprite = this.node.addComponent(cc.Sprite);
        }
    }
}

