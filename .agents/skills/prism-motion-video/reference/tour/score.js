// The sound of the tour: no music, only the product's own sounds. Keystrokes come from every kit.typist on their own;
// the cursor's clicks are listed as [scene id, seconds into the scene], the same times as the scenes' cur.clicks.
const CLICKS = [
    ['controls', 1.9],
    ['controls', 4.4],
    ['controls', 5.9],
    ['states', 1.7],
    ['states', 2.6],
    ['states', 3.5],
    ['states', 4.4],
    ['states', 5.9],
    ['a11y', 2.1],
    ['api', 2.2]
];
kit.score(function (S, T) {
    S.ticks(kit.typing.times, { vel: 34 });
    for (const [id, s] of CLICKS) if (T[id] !== undefined) S.fx('click', T[id] + s, { vel: 72 });
    S.master({ gain: -6, fadeOut: 0.5 });
});
