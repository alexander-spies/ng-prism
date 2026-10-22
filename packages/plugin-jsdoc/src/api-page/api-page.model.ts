import type { ApiDocTags, ApiMethod, ApiProperty, ApiSetupEntry, ApiTypeDoc, ScannedPipe, ScannedService } from '@ng-prism/core/plugin';
import { generatePipeUsage } from './pipe-usage.js';
import { generateServiceUsage } from './service-usage.js';

/** A chip under the description, `Since: 1.2.0` or a bare `Pure`; the deprecation is a badge of its own. */
export interface ApiPageChip {
    label: string;
    value?: string;
    deprecated?: true;
}

/**
 * What the API page shows, for a service or a pipe. The page renders this
 * alone, so a pipe page and a service page share one look; the sections a
 * kind does not have are left out.
 *
 * The entries are the scanned objects themselves, not copies: the page caches
 * what it derives from them by object.
 */
export interface ApiPageModel {
    kind: 'service' | 'pipe';
    className: string;
    description?: string;
    chips: ApiPageChip[];
    see: string[];
    usage: string;
    setup: ApiSetupEntry[];
    examples: string[];
    /** Services only. */
    properties?: ApiProperty[];
    /** Services: the public methods. */
    methods?: ApiMethod[];
    /** Pipes: one entry per transform signature. */
    transform?: ApiMethod[];
    types: ApiTypeDoc[];
}

export function servicePage(service: ScannedService): ApiPageModel {
    const { className, importPath, provision, api } = service;

    return {
        kind: 'service',
        className,
        description: api.description,
        chips: [
            ...deprecationChip(api.tags),
            ...valueChip('Since', api.tags.since),
            { label: 'Provided in', value: provision === 'auto' ? 'root/automatically' : 'providers' },
            ...valueChip('Entry point', importPath)
        ],
        see: api.tags.see ?? [],
        usage: generateServiceUsage(service),
        setup: api.setup,
        examples: api.tags.example ?? [],
        properties: api.properties,
        methods: api.methods,
        types: api.types
    };
}

export function pipePage(pipe: ScannedPipe): ApiPageModel {
    const { className, importPath, pipeName, pure, api } = pipe;

    return {
        kind: 'pipe',
        className,
        description: api.description,
        chips: [
            ...deprecationChip(api.tags),
            { label: 'Pipe', value: pipeName },
            // Unreadable purity is no reason to guess: the chip goes.
            ...(pure === undefined ? [] : [{ label: pure ? 'Pure' : 'Impure' }]),
            ...valueChip('Since', api.tags.since),
            ...valueChip('Entry point', importPath)
        ],
        see: api.tags.see ?? [],
        usage: generatePipeUsage(pipe),
        setup: api.setup,
        examples: api.tags.example ?? [],
        transform: api.transform,
        types: api.types
    };
}

/** The deprecation leads the chips, with its message when the tag has one. */
function deprecationChip({ deprecated }: ApiDocTags): ApiPageChip[] {
    if (!deprecated) return [];
    return [{ label: 'Deprecated', ...(typeof deprecated === 'string' ? { value: deprecated } : {}), deprecated: true }];
}

function valueChip(label: string, value: string | undefined): ApiPageChip[] {
    return value ? [{ label, value }] : [];
}
