export default class FullscreenBackgroundController {
    private readonly originalSize: cc.Size;

    constructor(private readonly backgroundNode: cc.Node) {
        this.originalSize = backgroundNode.getContentSize();
    }

    resize() {
        const visibleSize = cc.view.getVisibleSize();
        const baseWidth = Math.max(1, this.originalSize.width);
        const baseHeight = Math.max(1, this.originalSize.height);
        const scale = Math.max(visibleSize.width / baseWidth, visibleSize.height / baseHeight);

        this.backgroundNode.setAnchorPoint(0.5, 0.5);
        this.backgroundNode.setPosition(0, 0);
        this.backgroundNode.setContentSize(baseWidth * scale, baseHeight * scale);

        const sprite = this.backgroundNode.getComponent(cc.Sprite);
        if (sprite) {
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
    }
}
