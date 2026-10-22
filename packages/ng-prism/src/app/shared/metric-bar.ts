const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** `0.4736` → `'47.36%'`, without float noise. */
const percent = (fraction: number) => `${Math.round(clamp(fraction) * 10000) / 100}%`;

/** Fill width and threshold tick of a metric card's bar, both clamped to the track. */
export function barGeometry(fraction: number, threshold?: number): { width: string; tick: string | null } {
    return { width: percent(fraction), tick: threshold === undefined ? null : percent(threshold) };
}
