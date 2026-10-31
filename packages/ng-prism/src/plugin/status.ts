/**
 * One grading rule for every key figure the styleguide shows.
 *
 * Framework-free on purpose: plugins grade at build time in Node
 * (`onComponentScanned` writes the sidebar's verdict into the meta) and the app
 * grades live values in the browser, and the two must never disagree about
 * the same number. Thresholds come from whoever owns the figure: the a11y
 * config, the coverage plugin, the visual regression plugin.
 */
export type StatusTone = 'ok' | 'warn' | 'danger';

/** How far below a single target a value may fall before it is critical. */
export const STATUS_DANGER_RATIO = 0.75;

/**
 * `higher` (default): ok from `ok` up, warn from `warn` up, below that danger.
 * `lower`: ok up to `ok`, warn up to `warn`, above that danger.
 */
export interface StatusThreshold {
    ok: number;
    warn: number;
    direction?: 'higher' | 'lower';
}

export function statusFor(value: number, threshold: StatusThreshold): StatusTone {
    if (threshold.direction === 'lower') {
        if (value <= threshold.ok) return 'ok';
        return value <= threshold.warn ? 'warn' : 'danger';
    }
    if (value >= threshold.ok) return 'ok';
    return value >= threshold.warn ? 'warn' : 'danger';
}

/** A threshold from a single target: ok at the target, warn down to {@link STATUS_DANGER_RATIO} of it. */
export function thresholdFromTarget(target: number): StatusThreshold {
    return { ok: target, warn: target * STATUS_DANGER_RATIO };
}

const SEVERITY: Record<StatusTone, number> = { ok: 0, warn: 1, danger: 2 };

/** The most severe of several verdicts; `ok` when there are none. */
export function worstTone(tones: Iterable<StatusTone>): StatusTone {
    let worst: StatusTone = 'ok';

    for (const tone of tones) {
        if (SEVERITY[tone] > SEVERITY[worst]) worst = tone;
    }
    return worst;
}
