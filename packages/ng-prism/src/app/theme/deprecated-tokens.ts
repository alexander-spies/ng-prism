/**
 * Theme tokens deprecated since 22.7.0 and removed in 23.0.0, with what
 * replaces each. A `carried` token's override still reaches its successor until
 * then; the others are no longer read by anything.
 *
 * Framework-free: the theme resolver warns in the browser and the builder
 * reports the same overrides at build time.
 */
export const DEPRECATED_THEME_TOKENS: Readonly<Record<string, { successor: string; carried: boolean }>> = {
    '--prism-mark-nominal': { successor: '--prism-success', carried: true },
    '--prism-mark-attention': { successor: '--prism-warn', carried: true },
    '--prism-mark-critical': { successor: '--prism-danger', carried: true },
    '--prism-spectrum': { successor: '--prism-brand-gradient', carried: false },
    '--prism-primary-from': { successor: '--prism-brand-gradient', carried: false },
    '--prism-primary-to': { successor: '--prism-brand-gradient', carried: false }
};

/** What to tell a user who overrides a deprecated token. */
export function deprecatedTokenNotice(token: string): string {
    const { successor, carried } = DEPRECATED_THEME_TOKENS[token];
    const effect = carried ? `Until then its value is carried over to ${successor}` : 'Nothing reads it any more';

    return `${token} is deprecated since 22.7.0 and will be removed in 23.0.0. ${effect}; override ${successor} instead.`;
}
