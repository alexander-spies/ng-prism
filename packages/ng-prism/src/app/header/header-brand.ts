import type { NgPrismConfig } from '../../plugin/plugin.types.js';

/**
 * What the header's brand slot shows.
 *
 * `wordmark` is ng-prism's own: the symbol (or the configured logo) and
 * "ng-prism" in the brand gradient. `title` is a consuming app's name, set in
 * plain text: the gradient belongs to the ng-prism wordmark only, and ng-prism
 * stays visible through "Powered by ng-prism" in the sidebar footer.
 */
export type HeaderBrand = { kind: 'wordmark'; logoUrl: string | null } | { kind: 'title'; title: string; logoUrl: string | null };

/**
 * The brand slot for a config.
 *
 * The logo for dark backgrounds is preferred in both themes, because the header
 * is a navy band in both since 22.7.
 */
export function headerBrand(config: Pick<NgPrismConfig, 'title' | 'logo'>): HeaderBrand {
    const logoUrl = config.logo?.dark ?? config.logo?.light ?? null;

    return config.title ? { kind: 'title', title: config.title, logoUrl } : { kind: 'wordmark', logoUrl };
}

/**
 * The build info as one short line, `v1.2.0 · abcdef1`: the version and the
 * first seven characters of the hash, whichever are set. The header shows it
 * as a pill, the phone layout in its ⋮ menu.
 */
export function buildInfoLabel(config: Pick<NgPrismConfig, 'buildInfo'>): string | null {
    const info = config.buildInfo;

    if (!info) return null;
    const parts: string[] = [];

    if (info.version) parts.push(`v${info.version}`);
    if (info.gitHash) parts.push(info.gitHash.slice(0, 7));
    return parts.length ? parts.join(' · ') : null;
}
