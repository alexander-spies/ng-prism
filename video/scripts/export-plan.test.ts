import assert from 'node:assert/strict';
import { test } from 'node:test';
import { framesArgs, frameDurationsMs, img2webpArgs, mp4Args, pickReadmeAttempt, posterArgs, README_LADDER, webmArgs } from './export-plan.ts';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

test('frameDurationsMs spreads the rounding over the frames and keeps the total', () => {
    const at60 = frameDurationsMs(60, 6);
    assert.equal(sum(at60), 100);
    assert.ok(
        at60.every((ms) => ms === 16 || ms === 17),
        JSON.stringify(at60)
    );
    const at30 = frameDurationsMs(30, 3);
    assert.equal(sum(at30), 100);
    assert.ok(
        at30.every((ms) => ms === 33 || ms === 34),
        JSON.stringify(at30)
    );
});

test('frameDurationsMs keeps a long loop in time', () => {
    assert.equal(sum(frameDurationsMs(60, 1241)), Math.round((1241 * 1000) / 60));
});

test('pickReadmeAttempt takes the first step of the ladder that fits the budget', () => {
    const results = README_LADDER.map((step, index) => ({ ...step, bytes: [9e6, 6e6, 3e6][index] }));
    assert.deepEqual(pickReadmeAttempt(results, 5e6), { length: 'short', fps: 30 });
    assert.deepEqual(pickReadmeAttempt(results, 9e6), { length: 'full', fps: 60 });
    assert.equal(pickReadmeAttempt(results, 2e6), null);
});

test('pickReadmeAttempt follows the ladder, not the order of the results', () => {
    const results = [...README_LADDER].reverse().map((step) => ({ ...step, bytes: 1e6 }));
    assert.deepEqual(pickReadmeAttempt(results, 5e6), { length: 'full', fps: 60 });
});

test('the ladder tries the full loop at 60 fps first and the short one at 30 fps last', () => {
    assert.deepEqual(README_LADDER, [
        { length: 'full', fps: 60 },
        { length: 'short', fps: 60 },
        { length: 'short', fps: 30 }
    ]);
});

test('mp4Args encodes H.264 at crf 18 for the web, with AAC audio when there is any', () => {
    const args = mp4Args('in.mov', 'out.mp4');
    for (const expected of ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '+faststart', '-c:a', 'aac']) assert.ok(args.includes(expected), expected);
    assert.deepEqual(args.slice(-1), ['out.mp4']);
});

test('webmArgs encodes VP9 without audio, in 4:2:0 even from the ProRes master with alpha', () => {
    const args = webmArgs('in.mov', 'out.webm');
    for (const expected of ['libvpx-vp9', '-crf', '30', '-an']) assert.ok(args.includes(expected), expected);
    assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p');
});

test('img2webpArgs gives every frame its own duration and loops forever at q 80', () => {
    const args = img2webpArgs(['f1.png', 'f2.png'], [33, 34], 'loop.webp');
    assert.deepEqual(args.slice(0, 7), ['-loop', '0', '-lossy', '-q', '80', '-m', '4']);
    assert.deepEqual(args.slice(7), ['-d', '33', 'f1.png', '-d', '34', 'f2.png', '-o', 'loop.webp']);
});

test('posterArgs takes the last frame as 8-bit RGB, not the master’s 16-bit RGBA', () => {
    const args = posterArgs('in.mov', 'poster.png');
    assert.equal(args[args.indexOf('-sseof') + 1], '-0.05');
    assert.equal(args[args.indexOf('-pix_fmt') + 1], 'rgb24');
    assert.deepEqual(args.slice(-1), ['poster.png']);
});

test('no export changes the resolution', () => {
    const all = [
        ...mp4Args('in.mov', 'out.mp4'),
        ...webmArgs('in.mov', 'out.webm'),
        ...framesArgs('in.mov', 'frames', 60),
        ...img2webpArgs(['f1.png'], [17], 'loop.webp'),
        ...posterArgs('in.mov', 'poster.png')
    ];
    assert.ok(!all.some((arg) => arg.includes('scale') || arg === '-s' || arg === '-resize'), JSON.stringify(all));
});
