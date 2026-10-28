export interface BundleMetrics {
    /** Bytes of the component file without `@Showcase` and comments, the source that ships. The whole file when stripping fails (`stripped: false`). */
    sourceSize: number;
    /** Gzip size of the same source as `sourceSize`. */
    gzipEstimate: number;
    /** Imports of the shipped source: an import that only served `@Showcase` is gone. */
    directImports: number;
    importList: string[];
    treeDepth: number;
    /** Bytes of the whole file, showcase and comments included. Since 22.7.0. */
    rawSourceSize?: number;
    /** Gzip size of the whole file. Since 22.7.0. */
    rawGzipEstimate?: number;
    /** Whether `sourceSize` is the stripped source; `false` when stripping failed and the whole file was measured. Since 22.7.0. */
    stripped?: boolean;
    /** Bytes of the files behind `templateUrl` in the file's `@Component` decorators; an inline template is part of `sourceSize`. Since 22.7.0. */
    templateSize?: number;
    /** Bytes of the files behind `styleUrl`/`styleUrls`, uncompiled; inline styles are part of `sourceSize`. Since 22.7.0. */
    styleSize?: number;
}

export interface PerfThresholds {
    bundleWarnKb: number;
    bundleCritKb: number;
    renderWarnMs: number;
    renderCritMs: number;
    memoryWarnMb: number;
    memoryLeakMb: number;
}

export interface PerfPluginOptions {
    /** @deprecated Deprecated since 22.6.0, removed in 23.0.0. It has never had an effect: nothing reads it. The panel uses the built-in thresholds. */
    thresholds?: Partial<PerfThresholds>;
    bundle?: {
        /** How deep the import tree of a component is followed. Default: 5. */
        maxTreeDepth?: number;
        /** @deprecated Deprecated since 22.6.0, removed in 23.0.0. It has never had an effect: nothing reads it. */
        excludeImports?: string[];
    };
    /** @deprecated Deprecated since 22.6.0, removed in 23.0.0. It has never had an effect: nothing reads it. */
    render?: {
        bufferSize?: number;
        autoStart?: boolean;
    };
    /** @deprecated Deprecated since 22.6.0, removed in 23.0.0. It has never had an effect: nothing reads it. */
    memory?: {
        gcDelayMs?: number;
    };
}

export const DEFAULT_THRESHOLDS: PerfThresholds = {
    bundleWarnKb: 20,
    bundleCritKb: 50,
    renderWarnMs: 5,
    renderCritMs: 16,
    memoryWarnMb: 5,
    memoryLeakMb: 0.5
};
