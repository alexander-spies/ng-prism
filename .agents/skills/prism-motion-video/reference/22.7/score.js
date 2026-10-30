kit.score(function (S, T) {
    // No music (the maintainer's call): only the product's own sounds, on their frames.
    S.ticks(kit.typing.times, { vel: 34 });
    const CLICKS = [
        ['look', 2.55],
        ['look', 5.0],
        ['pages', 2.5],
        ['parts', 3.8],
        ['a11y', 4.1],
        ['perf', 2.2]
    ];
    for (const [id, s] of CLICKS) if (T[id] !== undefined) S.fx('click', T[id] + s, { vel: 72 });
    S.master({ gain: -6, fadeOut: 0.5 });
});
