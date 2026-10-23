import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRelease } from './release.ts';

const shots = new Set(['look', 'service-page']);
const clip = {
    version: '22.7',
    beats: [
        { kind: 'ui', shot: 'look', caption: 'A new look. **Dark and light.**' },
        { kind: 'api', shot: 'service-page', source: 'lib/notification/notification.service.ts', caption: 'Services and pipes get **their own pages.**' }
    ]
};

test('parseRelease returns a valid description unchanged', () => {
    assert.deepEqual(parseRelease(structuredClone(clip), shots), clip);
});

test('parseRelease wants a minor version, not a full one', () => {
    assert.throws(() => parseRelease({ ...clip, version: '22.7.0' }, shots), { message: 'Version must look like 22.7' });
});

test('parseRelease wants one to three beats', () => {
    assert.throws(() => parseRelease({ ...clip, beats: [] }, shots), { message: 'A release clip has 1 to 3 beats' });
    assert.throws(() => parseRelease({ ...clip, beats: [...clip.beats, ...clip.beats] }, shots), { message: 'A release clip has 1 to 3 beats' });
});

test('parseRelease names an unknown shot and its beat', () => {
    const beats = [clip.beats[0], { ...clip.beats[1], shot: 'x' }];
    assert.throws(() => parseRelease({ ...clip, beats }, shots), { message: 'Unknown shot "x" in beat 2' });
});

test('parseRelease wants a source for an api beat', () => {
    const beats = [{ kind: 'api', shot: 'service-page', caption: 'Pages.' }];
    assert.throws(() => parseRelease({ ...clip, beats }, shots), { message: 'Beat 1 (api) needs a source' });
});

test('parseRelease wants a known kind and a caption', () => {
    assert.throws(() => parseRelease({ ...clip, beats: [{ ...clip.beats[0], kind: 'video' }] }, shots), { message: 'Beat 1 has the unknown kind "video" (ui or api)' });
    assert.throws(() => parseRelease({ ...clip, beats: [{ kind: 'ui', shot: 'look' }] }, shots), { message: 'Beat 1 needs a caption' });
});
