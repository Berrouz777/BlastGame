type OnTileTouch = (node: cc.Node) => void;

export default class BoardInputHandler {
    private readonly onTouchStartBound = (event: cc.Event.EventTouch) => {
        const target = event.target as cc.Node;
        this.onTileTouchStart(target);
    };

    private readonly onTouchEndBound = (event: cc.Event.EventTouch) => {
        const target = event.target as cc.Node;
        this.onTileTouch(target);
    };

    private readonly onTouchCancelBound = () => {
        if (this.onTileTouchCancel) {
            this.onTileTouchCancel();
        }
    };

    constructor(
        private readonly onTileTouch: OnTileTouch,
        private readonly onTileTouchStart: OnTileTouch = () => undefined,
        private readonly onTileTouchCancel: (() => void) | null = null
    ) {}

    bind(node: cc.Node) {
        node.off(cc.Node.EventType.TOUCH_START, this.onTouchStartBound, this);
        node.off(cc.Node.EventType.TOUCH_END, this.onTouchEndBound, this);
        node.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancelBound, this);
        node.on(cc.Node.EventType.TOUCH_START, this.onTouchStartBound, this);
        node.on(cc.Node.EventType.TOUCH_END, this.onTouchEndBound, this);
        node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancelBound, this);
    }

    unbind(node: cc.Node) {
        node.off(cc.Node.EventType.TOUCH_START, this.onTouchStartBound, this);
        node.off(cc.Node.EventType.TOUCH_END, this.onTouchEndBound, this);
        node.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancelBound, this);
    }
}
