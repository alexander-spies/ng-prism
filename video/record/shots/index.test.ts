import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SHOTS, shotById } from './index.ts';

test('every shot has a unique id and a ready selector', () => {
    const ids = SHOTS.map((shot) => shot.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const shot of SHOTS) assert.ok(shot.ready.trim().length > 0, `${shot.id} has no ready selector`);
});

test('the tour shots are registered and the end card is a still', () => {
    assert.deepEqual(
        SHOTS.map((shot) => shot.id),
        ['reveal', 'controls', 'quality', 'states', 'endcard']
    );
    assert.equal(shotById('endcard').kind, 'still');
});

test('shotById finds a shot and rejects an unknown id', () => {
    assert.equal(shotById('reveal').id, 'reveal');
    assert.throws(() => shotById('nope'), { message: 'Unknown shot "nope"' });
});
