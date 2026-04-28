import GameSession from '../game/model/GameSession';

type HudConfig = Readonly<{
    uiRoot: cc.Node | null;
    autoCreateHud: boolean;
    scoreLabel: cc.Label | null;
    movesLabel: cc.Label | null;
    targetLabel: cc.Label | null;
    statusLabel: cc.Label | null;
}>;

type HudRefs = Readonly<{
    scoreLabel: cc.Label | null;
    movesLabel: cc.Label | null;
    targetLabel: cc.Label | null;
    statusLabel: cc.Label | null;
}>;

export default class BoardHudView {
    private uiRoot: cc.Node | null;
    private readonly autoCreateHud: boolean;

    private scoreLabel: cc.Label | null;
    private movesLabel: cc.Label | null;
    private targetLabel: cc.Label | null;
    private statusLabel: cc.Label | null;

    constructor(config: HudConfig) {
        this.uiRoot = config.uiRoot;
        this.autoCreateHud = config.autoCreateHud;
        this.scoreLabel = config.scoreLabel;
        this.movesLabel = config.movesLabel;
        this.targetLabel = config.targetLabel;
        this.statusLabel = config.statusLabel;
    }

    setup(ownerNode: cc.Node) {
        if (!this.uiRoot) {
            const found = cc.find('UIRoot', ownerNode.parent);
            if (found) {
                this.uiRoot = found;
            }
        }

        // Если лейблы уже назначены из сцены (макетный HUD) — ничего не создаём.
        const hasAssignedLabels = Boolean(this.scoreLabel || this.movesLabel || this.targetLabel || this.statusLabel);

        if (!this.uiRoot || !this.autoCreateHud || hasAssignedLabels) {
            return this.getRefs();
        }

        if (!this.scoreLabel) this.scoreLabel = this.ensureHudLabel('ScoreLabel', -175, 350);
        if (!this.movesLabel) this.movesLabel = this.ensureHudLabel('MovesLabel', -175, 320);
        if (!this.targetLabel) this.targetLabel = this.ensureHudLabel('TargetLabel', -175, 290);
        if (!this.statusLabel) this.statusLabel = this.ensureHudLabel('StatusLabel', -175, 260);

        return this.getRefs();
    }

    render(session: GameSession) {
        if (this.scoreLabel) {
            // Макет: слово "ОЧКИ" уже нарисовано, здесь только значение.
            this.scoreLabel.string = `${session.score}/${session.targetScore}`;
        }
        if (this.movesLabel) {
            // Макет: "ходы" рисуется отдельно (или рядом), здесь только число.
            this.movesLabel.string = `${session.movesLeft}`;
        }
        if (this.targetLabel) {
            // Если этот лейбл всё ещё используется — оставим только число (без префикса).
            this.targetLabel.string = `${session.targetScore}`;
        }
        if (this.statusLabel) {
            // В макете статус обычно не нужен. Но если привязан — пусть будет коротко.
            this.statusLabel.string = session.status === 'playing' ? '' : session.status === 'win' ? 'Победа' : 'Поражение';
        }
    }

    private ensureHudLabel(name: string, x: number, y: number) {
        if (!this.uiRoot) {
            return null;
        }

        const existing = this.uiRoot.getChildByName(name);
        const node = existing || new cc.Node(name);
        if (!existing) {
            node.parent = this.uiRoot;
            node.color = cc.Color.WHITE;
            node.setAnchorPoint(0, 1);
            const label = node.addComponent(cc.Label);
            label.fontSize = 22;
            label.lineHeight = 24;
        }

        node.x = x;
        node.y = y;
        return node.getComponent(cc.Label);
    }

    private getRefs(): HudRefs {
        return {
            scoreLabel: this.scoreLabel,
            movesLabel: this.movesLabel,
            targetLabel: this.targetLabel,
            statusLabel: this.statusLabel
        };
    }
}
