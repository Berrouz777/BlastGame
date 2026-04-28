type GameEndOverlayConfig = Readonly<{
    uiRoot: cc.Node | null;
    ownerNode: cc.Node;
    overlayNode: cc.Node | null;
    titleLabel: cc.Label | null;
    restartButtonNode: cc.Node | null;
    overlayDurationSec: number;
    findChildByNameRecursive: (root: cc.Node, name: string) => cc.Node | null;
    onRestart: () => void;
}>;

export default class GameEndOverlayController {
    private overlayNode: cc.Node | null;
    private titleLabel: cc.Label | null;
    private restartButtonNode: cc.Node | null;

    constructor(private readonly config: GameEndOverlayConfig) {
        this.overlayNode = config.overlayNode;
        this.titleLabel = config.titleLabel;
        this.restartButtonNode = config.restartButtonNode;
    }

    setup() {
        const searchRoot = this.config.uiRoot || this.config.ownerNode.parent || this.config.ownerNode;
        if (!this.overlayNode) {
            this.overlayNode = this.config.findChildByNameRecursive(searchRoot, 'GameEndOverlay');
        }
        if (!this.titleLabel && this.overlayNode) {
            const titleNode = this.config.findChildByNameRecursive(this.overlayNode, 'TitleLabel');
            this.titleLabel = titleNode ? titleNode.getComponent(cc.Label) : null;
        }
        if (!this.restartButtonNode && this.overlayNode) {
            this.restartButtonNode =
                this.config.findChildByNameRecursive(this.overlayNode, 'RestartRow') ||
                this.config.findChildByNameRecursive(this.overlayNode, 'BtnBg');
        }

        this.bindRestartButtonTouch();
        this.hideImmediate();
    }

    getOverlayNode() {
        return this.overlayNode;
    }

    getTitleLabel() {
        return this.titleLabel;
    }

    getRestartButtonNode() {
        return this.restartButtonNode;
    }

    hideImmediate() {
        if (!this.overlayNode) {
            return;
        }

        this.overlayNode.stopAllActions();
        this.overlayNode.active = false;
        this.overlayNode.opacity = 0;
        this.overlayNode.scaleX = 0.9;
        this.overlayNode.scaleY = 0.9;
    }

    show(title: string) {
        if (this.titleLabel) {
            this.titleLabel.string = title;
        }
        if (!this.overlayNode) {
            return Promise.resolve();
        }

        this.overlayNode.stopAllActions();
        this.overlayNode.active = true;
        this.overlayNode.opacity = 0;
        this.overlayNode.scaleX = 0.88;
        this.overlayNode.scaleY = 0.88;

        return new Promise<void>((resolve) => {
            cc.tween(this.overlayNode)
                .to(
                    Math.max(0.05, this.config.overlayDurationSec),
                    { opacity: 255, scaleX: 1.06, scaleY: 1.06 },
                    { easing: 'quadOut' }
                )
                .to(0.08, { scaleX: 1, scaleY: 1 }, { easing: 'quadInOut' })
                .call(() => resolve())
                .start();
        });
    }

    hideAnimated() {
        if (!this.overlayNode || !this.overlayNode.active) {
            this.hideImmediate();
            return Promise.resolve();
        }

        this.overlayNode.stopAllActions();
        return new Promise<void>((resolve) => {
            cc.tween(this.overlayNode)
                .to(0.08, { scaleX: 1.06, scaleY: 1.06 }, { easing: 'quadOut' })
                .to(
                    Math.max(0.05, this.config.overlayDurationSec),
                    { opacity: 0, scaleX: 0.88, scaleY: 0.88 },
                    { easing: 'quadIn' }
                )
                .call(() => {
                    this.hideImmediate();
                    resolve();
                })
                .start();
        });
    }

    private bindRestartButtonTouch() {
        if (!this.overlayNode) {
            return;
        }

        const nodes: cc.Node[] = [];
        if (this.restartButtonNode) {
            nodes.push(this.restartButtonNode);
        }

        const restartRow = this.config.findChildByNameRecursive(this.overlayNode, 'RestartRow');
        const btnBg = this.config.findChildByNameRecursive(this.overlayNode, 'BtnBg');
        const restartLabel = this.config.findChildByNameRecursive(this.overlayNode, 'RestartLabel');
        if (restartRow) nodes.push(restartRow);
        if (btnBg) nodes.push(btnBg);
        if (restartLabel) nodes.push(restartLabel);

        for (const node of nodes) {
            node.off(cc.Node.EventType.TOUCH_END, this.config.onRestart, this);
            node.on(cc.Node.EventType.TOUCH_END, this.config.onRestart, this);
        }
    }
}

