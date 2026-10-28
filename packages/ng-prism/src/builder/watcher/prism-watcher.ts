import { statSync } from 'fs';
import { dirname, resolve } from 'path';
import chokidar from 'chokidar';

export interface ChangeHandlerOptions {
    onRebuild: () => Promise<void>;
    logger: { info(msg: string): void; error(msg: string): void };
    debounceMs?: number;
    /** Which changed files can affect the manifest. Default: TypeScript sources. */
    isRelevant?: (filename: string) => boolean;
}

export interface ChangeHandler {
    handleChange(filename: string | null): void;
    dispose(): void;
}

export interface WatcherHandle {
    close(): void;
    /**
     * Replaces the single files watched beside the sources. Files that stay are
     * added again: chokidar misses a file whose directory did not exist when it
     * was added, and a rebuild is the next chance to pick it up.
     */
    setFiles(files: string[]): void;
}

export interface StartWatcherOptions {
    entryPoint: string;
    configFile?: string;
    ignorePaths?: string[];
    /** Single files that rebuild the manifest whatever their extension, such as the a11y report. */
    files?: string[];
    onRebuild: () => Promise<void>;
    logger: { info(msg: string): void; error(msg: string): void };
    debounceMs?: number;
}

export function createChangeHandler(options: ChangeHandlerOptions): ChangeHandler {
    const { onRebuild, logger, debounceMs = 300, isRelevant = (filename: string) => /\.ts$/.test(filename) } = options;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isRebuilding = false;
    let pendingChange = false;
    let disposed = false;

    async function triggerRebuild(): Promise<void> {
        if (disposed) return;
        if (isRebuilding) {
            pendingChange = true;
            return;
        }

        isRebuilding = true;
        pendingChange = false;
        logger.info('ng-prism: Change detected, re-scanning...');

        try {
            await onRebuild();
            if (!disposed) {
                logger.info('ng-prism: Re-scan complete.');
            }
        } catch (err) {
            if (!disposed) {
                logger.error(`ng-prism: Re-scan failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        } finally {
            isRebuilding = false;
            if (!disposed && pendingChange) {
                pendingChange = false;
                void triggerRebuild();
            }
        }
    }

    function handleChange(filename: string | null): void {
        if (disposed) return;
        if (filename && !isRelevant(filename)) return;

        if (timer) clearTimeout(timer);
        timer = setTimeout(triggerRebuild, debounceMs);
    }

    function dispose(): void {
        disposed = true;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }

    return { handleChange, dispose };
}

export function startWatcher(options: StartWatcherOptions): WatcherHandle {
    const { entryPoint, configFile, ignorePaths, onRebuild, logger, debounceMs } = options;
    let files = (options.files ?? []).map((file) => resolve(file));
    const handler = createChangeHandler({
        onRebuild,
        logger,
        debounceMs,
        isRelevant: (filename) => /\.ts$/.test(filename) || files.includes(resolve(filename))
    });

    const isDir = (() => {
        try {
            return statSync(entryPoint).isDirectory();
        } catch {
            return false;
        }
    })();
    const watchPaths: string[] = [isDir ? entryPoint : dirname(entryPoint)];

    if (configFile) {
        watchPaths.push(configFile);
    }

    const ignorePatterns: (string | RegExp)[] = [/(?:^|[/\\])(?:node_modules|\.git)[/\\]/];

    if (ignorePaths) {
        ignorePatterns.push(...ignorePaths);
    }

    const watcher = chokidar.watch([...watchPaths, ...files], {
        ignored: ignorePatterns,
        ignoreInitial: true,
        persistent: true
    });

    watcher.on('change', (filePath) => handler.handleChange(filePath));
    watcher.on('add', (filePath) => handler.handleChange(filePath));
    watcher.on('unlink', (filePath) => handler.handleChange(filePath));
    watcher.on('error', (err) => logger.error(`ng-prism: Watcher error: ${err instanceof Error ? err.message : String(err)}`));

    logger.info(`ng-prism: Watching ${[...watchPaths, ...files].join(', ')} for changes...`);

    return {
        close() {
            handler.dispose();
            watcher.close();
        },
        setFiles(next: string[]) {
            const resolved = next.map((file) => resolve(file));
            const gone = files.filter((file) => !resolved.includes(file));

            if (gone.length > 0) watcher.unwatch(gone);
            files = resolved;
            if (files.length > 0) watcher.add(files);
        }
    };
}
