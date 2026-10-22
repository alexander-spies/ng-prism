/** Colour roles of `prism-badge`. */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warn' | 'danger';

/** A status verdict. Moves to `plugin/status.ts` with `statusFor`. */
export type StatusTone = 'ok' | 'warn' | 'danger';

const STATUS_BADGE_TONE: Record<StatusTone, BadgeTone> = {
    ok: 'success',
    warn: 'warn',
    danger: 'danger'
};

/** The badge tone that shows a status verdict. */
export function toneForStatus(status: StatusTone): BadgeTone {
    return STATUS_BADGE_TONE[status];
}
