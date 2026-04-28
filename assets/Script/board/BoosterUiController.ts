import TileRegistry from './TileRegistry';
import { Position } from '../game/types/BoardTypes';

type BoosterUiConfig = Readonly<{
    ownerNode: cc.Node;
    teleportButtonNode: cc.Node | null;
    teleportCountLabel: cc.Label | null;
    teleportUses: number;
    bombButtonNode: cc.Node | null;
    bombCountLabel: cc.Label | null;
    bombUses: number;
    findChildByNameRecursive: (root: cc.Node, name: string) => cc.Node | null;
    canToggle: () => boolean;
    isGamePlaying: () => boolean;
    getTileRegistry: () => TileRegistry | null;
}>;

export default class BoosterUiController {
    private teleportButtonNode: cc.Node | null;
    private teleportCountLabel: cc.Label | null;
    private bombButtonNode: cc.Node | null;
    private bombCountLabel: cc.Label | null;

    private isBombModeActive: boolean = false;
    private isTeleportModeActive: boolean = false;
    private teleportUsesLeft: number = 0;
    private bombUsesLeft: number = 0;
    private teleportFirstSelection: Position | null = null;

    constructor(private readonly config: BoosterUiConfig) {
        this.teleportButtonNode = config.teleportButtonNode;
        this.teleportCountLabel = config.teleportCountLabel;
        this.bombButtonNode = config.bombButtonNode;
        this.bombCountLabel = config.bombCountLabel;
    }

    setup() {
        this.setupTeleportButton();
        this.setupBombButton();
        this.resetForNewGame();
    }

    getTeleportButtonNode() {
        return this.teleportButtonNode;
    }

    getTeleportCountLabel() {
        return this.teleportCountLabel;
    }

    getBombButtonNode() {
        return this.bombButtonNode;
    }

    getBombCountLabel() {
        return this.bombCountLabel;
    }

    resetForNewGame() {
        this.teleportUsesLeft = Math.max(0, Math.floor(this.config.teleportUses));
        this.bombUsesLeft = Math.max(0, Math.floor(this.config.bombUses));
        this.setTeleportModeActive(false);
        this.setBombModeActive(false);
        this.refreshUi();
    }

    refreshUi() {
        if (this.teleportCountLabel) {
            this.teleportCountLabel.string = `${Math.max(0, this.teleportUsesLeft)}`;
        }
        if (this.teleportButtonNode) {
            const isAvailable = this.config.isGamePlaying() && this.teleportUsesLeft > 0;
            this.teleportButtonNode.opacity = isAvailable ? 255 : 130;
            this.teleportButtonNode.scaleX = this.isTeleportModeActive ? 1.08 : 1;
            this.teleportButtonNode.scaleY = this.isTeleportModeActive ? 1.08 : 1;
        }

        if (this.bombCountLabel) {
            this.bombCountLabel.string = `${Math.max(0, this.bombUsesLeft)}`;
        }
        if (this.bombButtonNode) {
            const isAvailable = this.config.isGamePlaying() && this.bombUsesLeft > 0;
            this.bombButtonNode.opacity = isAvailable ? 255 : 130;
            this.bombButtonNode.scaleX = this.isBombModeActive ? 1.08 : 1;
            this.bombButtonNode.scaleY = this.isBombModeActive ? 1.08 : 1;
        }
    }

    isTeleportActive() {
        return this.isTeleportModeActive;
    }

    isBombActive() {
        return this.isBombModeActive;
    }

    consumeBombAndDeactivate() {
        this.bombUsesLeft = Math.max(0, this.bombUsesLeft - 1);
        this.setBombModeActive(false);
    }

    consumeTeleportAndDeactivate() {
        this.teleportUsesLeft = Math.max(0, this.teleportUsesLeft - 1);
        this.clearTeleportFirstSelection();
        this.setTeleportModeActive(false);
    }

    getTeleportFirstSelection() {
        return this.teleportFirstSelection;
    }

    setTeleportFirstSelection(pos: Position) {
        this.clearTeleportFirstSelection();
        this.teleportFirstSelection = pos;

        const registry = this.config.getTileRegistry();
        const node = registry ? registry.get(pos.row, pos.col) : null;
        if (!node) {
            return;
        }

        node.stopAllActions();
        node.scaleX = 1.14;
        node.scaleY = 1.14;
        node.opacity = 230;
        node.zIndex = 1000;
    }

    deactivateTeleport() {
        this.setTeleportModeActive(false);
    }

    deactivateBomb() {
        this.setBombModeActive(false);
    }

    private setupTeleportButton() {
        if (!this.teleportButtonNode) {
            this.teleportButtonNode =
                this.config.findChildByNameRecursive(this.config.ownerNode.parent || this.config.ownerNode, 'BoosterTeleportButton') ||
                this.config.findChildByNameRecursive(this.config.ownerNode.parent || this.config.ownerNode, 'BoosterShuffleButton');
        }
        if (!this.teleportCountLabel && this.teleportButtonNode) {
            const countNode = this.config.findChildByNameRecursive(this.teleportButtonNode, 'CountLabel');
            this.teleportCountLabel = countNode ? countNode.getComponent(cc.Label) : null;
        }
        if (!this.teleportButtonNode) {
            return;
        }

        this.teleportButtonNode.off(cc.Node.EventType.TOUCH_END, this.onTeleportButtonTouch, this);
        this.teleportButtonNode.on(cc.Node.EventType.TOUCH_END, this.onTeleportButtonTouch, this);
    }

    private setupBombButton() {
        if (!this.bombButtonNode) {
            this.bombButtonNode = this.config.findChildByNameRecursive(this.config.ownerNode.parent || this.config.ownerNode, 'BoosterBombButton');
        }
        if (!this.bombCountLabel && this.bombButtonNode) {
            const countNode = this.config.findChildByNameRecursive(this.bombButtonNode, 'CountLabel');
            this.bombCountLabel = countNode ? countNode.getComponent(cc.Label) : null;
        }
        if (!this.bombButtonNode) {
            return;
        }

        this.bombButtonNode.off(cc.Node.EventType.TOUCH_END, this.onBombButtonTouch, this);
        this.bombButtonNode.on(cc.Node.EventType.TOUCH_END, this.onBombButtonTouch, this);
    }

    private onTeleportButtonTouch() {
        if (!this.config.canToggle() || !this.config.isGamePlaying() || this.teleportUsesLeft <= 0) {
            return;
        }

        this.setBombModeActive(false);
        this.setTeleportModeActive(!this.isTeleportModeActive);
        this.animateButtonTap(this.teleportButtonNode, this.isTeleportModeActive);
    }

    private onBombButtonTouch() {
        if (!this.config.canToggle() || !this.config.isGamePlaying() || this.bombUsesLeft <= 0) {
            return;
        }

        this.setTeleportModeActive(false);
        this.setBombModeActive(!this.isBombModeActive);
        this.animateButtonTap(this.bombButtonNode, this.isBombModeActive);
    }

    private setTeleportModeActive(active: boolean) {
        this.isTeleportModeActive = active && this.teleportUsesLeft > 0 && this.config.isGamePlaying();
        if (!this.isTeleportModeActive) {
            this.clearTeleportFirstSelection();
        }
        this.refreshUi();
    }

    private setBombModeActive(active: boolean) {
        this.isBombModeActive = active && this.bombUsesLeft > 0 && this.config.isGamePlaying();
        this.refreshUi();
    }

    private clearTeleportFirstSelection() {
        if (!this.teleportFirstSelection) {
            this.teleportFirstSelection = null;
            return;
        }

        const registry = this.config.getTileRegistry();
        const node = registry ? registry.get(this.teleportFirstSelection.row, this.teleportFirstSelection.col) : null;
        if (node) {
            node.scaleX = 1;
            node.scaleY = 1;
            node.opacity = 255;
            node.zIndex = 0;
        }
        this.teleportFirstSelection = null;
    }

    private animateButtonTap(button: cc.Node | null, active: boolean) {
        if (!button) {
            return;
        }

        button.stopAllActions();
        cc.tween(button)
            .to(0.08, { scaleX: 1.14, scaleY: 1.14 }, { easing: 'quadOut' })
            .to(0.08, {
                scaleX: active ? 1.08 : 1,
                scaleY: active ? 1.08 : 1
            })
            .start();
    }
}

