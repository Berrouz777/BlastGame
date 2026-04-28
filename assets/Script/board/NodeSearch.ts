export function findChildByNameRecursive(root: cc.Node, name: string): cc.Node | null {
    if (root.name.trim() === name) {
        return root;
    }

    for (const child of root.children) {
        const found = findChildByNameRecursive(child, name);
        if (found) {
            return found;
        }
    }

    return null;
}

