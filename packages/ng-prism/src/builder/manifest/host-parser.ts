export interface ParsedHost {
    tag: string;
    attrs: string;
    content?: string;
}

export function parseHostString(host: string): ParsedHost | null {
    const parsed = matchHostString(host);

    if (!parsed && host.trim().length > 0) {
        console.warn(
            `[ng-prism] @Showcase host="${host}" could not be parsed and will fall back to <div>. ` +
                `Supported forms: "<tag>", "<tag attrs>", "<tag />", or "<tag>text</tag>".`
        );
    }
    return parsed;
}

/** {@link parseHostString} without its warning, for a caller that reports a host it cannot parse itself. */
export function matchHostString(host: string): ParsedHost | null {
    const trimmed = host.trim();

    const open = trimmed.match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*\/?\s*>$/);

    if (open) {
        return { tag: open[1], attrs: open[2].trim() };
    }

    const wrapped = trimmed.match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*>([\s\S]*?)<\/\s*\1\s*>$/);

    if (wrapped) {
        return {
            tag: wrapped[1],
            attrs: wrapped[2].trim(),
            content: wrapped[3]
        };
    }

    return null;
}
