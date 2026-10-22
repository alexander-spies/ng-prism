import assert from 'node:assert/strict';
import { test } from 'node:test';
import { insertionOf, typingSteps } from './typing.ts';

test('insertionOf finds the one inserted block', () => {
    assert.deepEqual(insertionOf('@Component\nclass X {}', '@Showcase({})\n@Component\nclass X {}'), { at: 0, text: '@Showcase({})\n' });
    assert.deepEqual(insertionOf('ab', 'aXYb'), { at: 1, text: 'XY' });
});

test('insertionOf rejects code that is more than one insertion away', () => {
    assert.throws(() => insertionOf('abc', 'aXc'), { message: 'The code after is not the code before with one block inserted' });
});

test('typingSteps grows the code token by token and ends on the code after', () => {
    assert.deepEqual(typingSteps('ab', 'aXY Z.b'), ['aXYb', 'aXY b', 'aXY Zb', 'aXY Z.b']);
});

test('typingSteps keeps the code below a new block on its own line while typing', () => {
    assert.deepEqual(typingSteps('X', 'a b\nX'), ['a\nX', 'a \nX', 'a b\nX']);
});

test('typingSteps keeps an indentation run in one step', () => {
    assert.deepEqual(typingSteps('', 'a\n    b'), ['a', 'a\n    ', 'a\n    b']);
});
