export interface BundleMetrics {
    sourceSize: number;
    gzipEstimate: number;
    directImports: number;
    importList: string[];
    treeDepth: number;
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
