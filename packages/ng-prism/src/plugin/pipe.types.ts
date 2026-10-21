import type { ShowcaseConfig } from '../decorator/showcase.types.js';
import type { ApiDocTags, ApiMethod, ApiSetupEntry, ApiTypeDoc } from './service.types.js';

export interface ScannedPipe {
    className: string;
    filePath: string;
    /** Import path of the entry point that exports the pipe. */
    importPath?: string;
    /** Only the fields that apply to pipes: the same as for a service. */
    showcaseConfig: ShowcaseConfig;
    /** The name used in templates, from `@Pipe({ name })`. */
    pipeName: string;
    /** From `@Pipe({ pure })`, `true` when omitted; absent when it cannot be read. */
    pure?: boolean;
    /** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
    api: PipeApi;
    /** Arbitrary plugin metadata */
    meta?: Record<string, unknown>;
}

/**
 * What the API page of a pipe shows.
 *
 * @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release.
 */
export interface PipeApi {
    description?: string;
    tags: ApiDocTags;
    /** One entry per overload signature of `transform()`, or the implementation when there are none. */
    transform: ApiMethod[];
    setup: ApiSetupEntry[];
    types: ApiTypeDoc[];
}

/** A pipe in the runtime manifest. Carries data only: the class is never imported into the styleguide. */
export interface RuntimePipe {
    meta: ScannedPipe;
}
