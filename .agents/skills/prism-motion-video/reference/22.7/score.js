kit.score(function (S, T) {
    // No music (the maintainer's call): only the product's own sounds, on their frames; the phone's taps a little softer.
    S.ticks(kit.typing.times, { vel: 34 });
    const CLICKS = [
        ['look', 2.55, 72],
        ['look', 5.0, 72],
        ['mobile', 2.8, 56],
        ['mobile', 4.3, 56],
        ['pages', 2.5, 72],
        ['parts', 3.8, 72],
        ['a11y', 4.1, 72],
        ['perf', 2.2, 72]
    ];
    for (const [id, s, vel] of CLICKS) if (T[id] !== undefined) S.fx('click', T[id] + s, { vel });
    S.master({ gain: -6, fadeOut: 0.5 });
});
