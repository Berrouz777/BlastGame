import BoardModel, { RandomProvider } from '../assets/Script/game/model/BoardModel';
import GameController from '../assets/Script/game/controller/GameController';
import GravityService from '../assets/Script/game/services/GravityService';
import GroupFinder from '../assets/Script/game/services/GroupFinder';
import MoveAvailabilityService from '../assets/Script/game/services/MoveAvailabilityService';
import RefillService from '../assets/Script/game/services/RefillService';
import ShuffleService from '../assets/Script/game/services/ShuffleService';
import { CellValue, ColorId, createNormalTile, createSpecialTile, getTileColorId } from '../assets/Script/game/types/BoardTypes';

type TestCase = Readonly<{
    name: string;
    run: () => void;
}>;

const tests: TestCase[] = [];

function test(name: string, run: () => void) {
    tests.push({ name, run });
}

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    if (actual !== expected) {
        throw new Error(`${message}. Expected ${String(expected)}, got ${String(actual)}`);
    }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}. Expected ${expectedJson}, got ${actualJson}`);
    }
}

function randomSequence(values: number[]): RandomProvider {
    let index = 0;
    return () => {
        const value = values[index];
        index++;
        return value === undefined ? 0 : value;
    };
}

function createBoard(colors: Array<Array<ColorId | null>>) {
    const board = new BoardModel(colors.length, colors[0].length);
    for (let row = 0; row < colors.length; row++) {
        for (let col = 0; col < colors[row].length; col++) {
            const colorId = colors[row][col];
            board.set(row, col, colorId === null ? null : createNormalTile(colorId));
        }
    }
    return board;
}

function boardColors(board: BoardModel) {
    const colors: Array<Array<ColorId | null>> = [];
    for (let row = 0; row < board.rows; row++) {
        const line: Array<ColorId | null> = [];
        for (let col = 0; col < board.cols; col++) {
            line.push(getTileColorId(board.get(row, col)));
        }
        colors.push(line);
    }
    return colors;
}

function boardKinds(board: BoardModel) {
    const kinds: Array<Array<string | null>> = [];
    for (let row = 0; row < board.rows; row++) {
        const line: Array<string | null> = [];
        for (let col = 0; col < board.cols; col++) {
            const tile = board.get(row, col);
            line.push(tile === null ? null : tile.kind);
        }
        kinds.push(line);
    }
    return kinds;
}

test('GroupFinder finds only orthogonally connected tiles with same color', () => {
    const board = createBoard([
        [1, 1, 2],
        [2, 1, 2],
        [1, 2, 2]
    ]);

    const group = new GroupFinder().findConnectedGroup(board, 0, 0);

    assertDeepEqual(
        group
            .map((pos) => `${pos.row}:${pos.col}`)
            .sort(),
        ['0:0', '0:1', '1:1'],
        'Connected group mismatch'
    );
});

test('GravityService drops tiles down and reports moves', () => {
    const board = createBoard([
        [1, null],
        [null, 2],
        [3, null]
    ]);

    const moves = new GravityService().apply(board);

    assertDeepEqual(boardColors(board), [
        [null, null],
        [1, null],
        [3, 2]
    ], 'Gravity result mismatch');
    assertEqual(moves.length, 2, 'Gravity move count mismatch');
    assertEqual(moves[0].colorId, 1, 'First moved tile color mismatch');
    assertEqual(moves[1].colorId, 2, 'Second moved tile color mismatch');
});

test('RefillService fills empty cells with deterministic colors', () => {
    const board = createBoard([
        [null, 2],
        [1, null]
    ]);

    const spawned = new RefillService().refill(board, 4, randomSequence([0.1, 0.8]));

    assertDeepEqual(boardColors(board), [
        [0, 2],
        [1, 3]
    ], 'Refill result mismatch');
    assertDeepEqual(
        spawned.map((tile) => ({ row: tile.row, col: tile.col, colorId: tile.colorId })),
        [
            { row: 0, col: 0, colorId: 0 },
            { row: 1, col: 1, colorId: 3 }
        ],
        'Spawn report mismatch'
    );
});

test('MoveAvailabilityService respects minGroupSize', () => {
    const finder = new GroupFinder();
    const availability = new MoveAvailabilityService(finder);

    assert(
        availability.hasAnyValidGroup(
            createBoard([
                [0, 1],
                [1, 0]
            ]),
            2
        ) === false,
        'Checkerboard should not have valid groups'
    );
    assert(
        availability.hasAnyValidGroup(
            createBoard([
                [0, 0],
                [1, 2]
            ]),
            2
        ),
        'Horizontal pair should be a valid group'
    );
});

test('ShuffleService shuffles once and validates resulting board', () => {
    const finder = new GroupFinder();
    const availability = new MoveAvailabilityService(finder);
    const board = createBoard([
        [0, 1],
        [1, 0]
    ]);

    const result = new ShuffleService(availability).shuffleOnceAndCheck(board, 2, randomSequence([0.1, 0.1, 0.1]));

    assert(result.shuffled, 'Shuffle should be reported');
    assert(result.success, 'Shuffle should create a valid group');
    assertEqual(result.attemptsUsed, 1, 'Shuffle attempts mismatch');
    assert(availability.hasAnyValidGroup(board, 2), 'Board should have a move after shuffle');
});

test('GameController resolves accepted click, scoring, moves and refill', () => {
    const game = new GameController(2, 2, 3, 2, 10, randomSequence([0.1, 0.1, 0.1, 0.1, 0.8, 0.1, 0.1, 0.1]), 5, 100, 3);
    game.initBoard();

    const result = game.resolveClick(0, 0);

    assert(result.accepted, 'Click should be accepted');
    assertEqual(result.removed.length, 4, 'Removed count mismatch');
    assertEqual(game.session.movesLeft, 4, 'Move should be consumed');
    assertEqual(game.session.score, 160, 'Score formula should be groupSize^2 * multiplier');
    assertEqual(game.session.status, 'win', 'Target score should trigger win');
    assertEqual(game.board.getNullCount(), 0, 'Board should be refilled after click');
});

test('GameController previews valid blast group without mutating board or session', () => {
    const game = new GameController(2, 3, 4, 3, 10, randomSequence([]), 5, 9999, 3);
    game.board.set(0, 0, createNormalTile(1));
    game.board.set(0, 1, createNormalTile(1));
    game.board.set(1, 0, createNormalTile(1));
    game.board.set(0, 2, createNormalTile(2));
    game.board.set(1, 1, createNormalTile(3));
    game.board.set(1, 2, createNormalTile(2));

    const preview = game.previewBlastGroup(0, 0);

    assertDeepEqual(
        preview
            .map((pos) => `${pos.row}:${pos.col}`)
            .sort(),
        ['0:0', '0:1', '1:0'],
        'Preview group mismatch'
    );
    assertDeepEqual(boardColors(game.board), [
        [1, 1, 2],
        [1, 3, 2]
    ], 'Preview should not mutate board');
    assertEqual(game.session.movesLeft, 5, 'Preview should not consume move');
    assertEqual(game.session.score, 0, 'Preview should not add score');
});

test('GameController bomb removes square radius through common refill pipeline', () => {
    const game = new GameController(3, 3, 5, 2, 10, randomSequence([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), 5, 9999, 3);
    for (let row = 0; row < game.board.rows; row++) {
        for (let col = 0; col < game.board.cols; col++) {
            game.board.set(row, col, createNormalTile((row + col) % 5));
        }
    }

    const result = game.resolveBomb(1, 1, 1);

    assert(result.accepted, 'Bomb click should be accepted');
    assertEqual(result.removed.length, 9, 'Bomb radius should remove a 3x3 square');
    assertEqual(result.spawned.length, 9, 'Bomb should refill all removed cells');
    assertEqual(game.session.movesLeft, 4, 'Bomb should consume one move');
    assertEqual(game.session.score, 810, 'Bomb score should use removedCount^2 * multiplier');
    assertEqual(game.board.getNullCount(), 0, 'Board should be full after bomb refill');
});

test('GameController bomb rejects invalid target without consuming move', () => {
    const game = new GameController(2, 2, 3, 2, 10, randomSequence([]), 5, 9999, 3);

    const result = game.resolveBomb(4, 4, 1);

    assert(!result.accepted, 'Out-of-bounds bomb should be rejected');
    assertEqual(game.session.movesLeft, 5, 'Rejected bomb should not consume move');
    assertEqual(game.session.score, 0, 'Rejected bomb should not add score');
});

test('GameController creates weighted super tile on large group', () => {
    const game = new GameController(3, 3, 4, 2, 10, randomSequence([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 5, 9999, 3, {
        threshold: 8,
        rowChance: 0,
        columnChance: 0,
        bombChance: 100,
        clearAllChance: 0
    });
    for (let row = 0; row < game.board.rows; row++) {
        for (let col = 0; col < game.board.cols; col++) {
            game.board.set(row, col, createNormalTile(1));
        }
    }

    const result = game.resolveClick(1, 1);
    const tile = game.board.get(1, 1);

    assert(result.accepted, 'Large group click should be accepted');
    assertEqual(result.removed.length, 9, 'Large group should remove the whole connected group');
    assertEqual(result.createdSpecialKind, 'bomb', 'Created special kind should be reported for reveal animation');
    assertDeepEqual(result.createdSpecialPosition, { row: 1, col: 1 }, 'Created special position should be reported');
    assert(tile !== null && tile.kind === 'bomb', 'Clicked cell should become configured super bomb tile');
    assertEqual(tile === null ? null : tile.colorId, 1, 'Super tile should keep clicked tile color');
});

test('GameController activates row super tile through common refill pipeline', () => {
    const game = new GameController(3, 3, 5, 2, 10, randomSequence([0.1, 0.2, 0.3]), 5, 9999, 3);
    for (let row = 0; row < game.board.rows; row++) {
        for (let col = 0; col < game.board.cols; col++) {
            game.board.set(row, col, createNormalTile((row + col) % 5));
        }
    }
    game.board.set(1, 1, createSpecialTile('row', 4));

    const result = game.resolveClick(1, 1);

    assert(result.accepted, 'Row super tile click should be accepted');
    assertDeepEqual(result.removed, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 }
    ], 'Row super tile should remove its full row');
    assertEqual(result.activatedSpecialKind, 'row', 'Activated special kind should be reported');
    assertEqual(game.session.movesLeft, 4, 'Super tile activation should consume one move');
    assertEqual(game.session.score, 90, 'Super tile score should use removed count');
    assertEqual(game.board.getNullCount(), 0, 'Board should be full after super tile refill');
    assertDeepEqual(boardKinds(game.board).some((line) => line.indexOf('row') >= 0), false, 'Activated row tile should be consumed');
});

test('GameController teleport swaps two tiles and consumes one move', () => {
    const game = new GameController(2, 2, 4, 2, 10, randomSequence([]), 5, 9999, 3);
    game.board.set(0, 0, createNormalTile(1));
    game.board.set(0, 1, createNormalTile(2));
    game.board.set(1, 0, createNormalTile(3));
    game.board.set(1, 1, createNormalTile(0));

    const result = game.resolveTeleport(0, 0, 1, 1);

    assert(result.accepted, 'Teleport should be accepted');
    assertDeepEqual(boardColors(game.board), [
        [0, 2],
        [3, 1]
    ], 'Teleport board swap mismatch');
    assertEqual(game.session.movesLeft, 4, 'Teleport should consume one move');
    assertEqual(game.session.score, 0, 'Teleport should not add score');
});

test('GameController teleport rejects same cell without consuming move', () => {
    const game = new GameController(2, 2, 4, 2, 10, randomSequence([]), 5, 9999, 3);
    game.board.set(0, 0, createNormalTile(1));

    const result = game.resolveTeleport(0, 0, 0, 0);

    assert(!result.accepted, 'Same-cell teleport should be rejected');
    assertEqual(game.session.movesLeft, 5, 'Rejected teleport should not consume move');
    assertEqual(getTileColorId(game.board.get(0, 0)), 1, 'Rejected teleport should not mutate board');
});

test('GameController rejects too small group without consuming move', () => {
    const game = new GameController(2, 2, 4, 3, 10, randomSequence([0.1, 0.4, 0.7, 0.9]), 5, 1000, 3);
    game.initBoard();

    const result = game.resolveClick(0, 0);

    assert(!result.accepted, 'Click should be rejected');
    assertEqual(game.session.movesLeft, 5, 'Rejected click should not consume move');
    assertEqual(game.session.score, 0, 'Rejected click should not add score');
});

test('GameController loses when moves run out before reaching target', () => {
    const game = new GameController(2, 2, 2, 2, 1, randomSequence([0.1, 0.1, 0.1, 0.1, 0.8, 0.8, 0.8, 0.8]), 1, 1000, 3);
    game.initBoard();

    const result = game.resolveClick(0, 0);

    assert(result.accepted, 'Click should be accepted');
    assertEqual(game.session.movesLeft, 0, 'Last move should be consumed');
    assertEqual(game.session.status, 'lose', 'No moves and score below target should trigger lose');
});

test('GameController auto-shuffle consumes attempts and loses after max attempts', () => {
    const game = new GameController(2, 2, 2, 2, 10, randomSequence([0.1, 0.8, 0.8, 0.1, 0.8, 0.8, 0.8]), 5, 1000, 1);
    game.initBoard();

    const result = game.resolveNoMovesIfNeeded();

    assert(result.shuffled, 'No-move board should be shuffled');
    assert(result.failed, 'Failed shuffle with no attempts left should fail');
    assertEqual(result.attemptsUsed, 1, 'One shuffle attempt should be consumed');
    assertEqual(game.session.shuffleAttemptsUsed, 1, 'Session shuffle attempts mismatch');
    assertEqual(game.session.status, 'lose', 'No shuffle attempts left should trigger lose');
});

let failed = 0;

for (const item of tests) {
    try {
        item.run();
        // eslint-disable-next-line no-console
        console.log(`ok - ${item.name}`);
    } catch (error) {
        failed++;
        // eslint-disable-next-line no-console
        console.error(`not ok - ${item.name}`);
        // eslint-disable-next-line no-console
        console.error(error instanceof Error ? error.stack || error.message : error);
    }
}

if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
}

// eslint-disable-next-line no-console
console.log(`${tests.length} test(s) passed`);
