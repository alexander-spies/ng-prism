import chokidar from 'chokidar';
import { createChangeHandler, startWatcher } from './prism-watcher.js';

jest.mock('chokidar', () => ({
    __esModule: true,
    default: { watch: jest.fn() }
}));

const mockChokidarWatch = chokidar.watch as jest.Mock;

function createLogger() {
    return {
        info: jest.fn(),
        error: jest.fn()
    };
}

describe('startWatcher', () => {
    function makeMockWatcher() {
        const w = { on: jest.fn(), close: jest.fn(), add: jest.fn(), unwatch: jest.fn() };

        w.on.mockReturnValue(w);
        return w;
    }

    beforeEach(() => {
        mockChokidarWatch.mockReset();
    });

    it('should pass ignorePaths to chokidar ignored option', () => {
        const mockWatcher = makeMockWatcher();

        mockChokidarWatch.mockReturnValue(mockWatcher);
        const logger = createLogger();
        const handle = startWatcher({
            entryPoint: '/some/lib',
            ignorePaths: ['/some/lib/ng-prism-cache'],
            onRebuild: jest.fn().mockResolvedValue(undefined),
            logger
        });

        const [, watchOptions] = mockChokidarWatch.mock.calls[0];

        expect(Array.isArray(watchOptions.ignored)).toBe(true);
        expect(watchOptions.ignored).toContain('/some/lib/ng-prism-cache');

        handle.close();
    });

    it('should only include default ignore pattern when ignorePaths is not provided', () => {
        const mockWatcher = makeMockWatcher();

        mockChokidarWatch.mockReturnValue(mockWatcher);
        const logger = createLogger();
        const handle = startWatcher({
            entryPoint: '/some/lib',
            onRebuild: jest.fn().mockResolvedValue(undefined),
            logger
        });

        const [, watchOptions] = mockChokidarWatch.mock.calls[0];

        expect(Array.isArray(watchOptions.ignored)).toBe(true);
        expect(watchOptions.ignored).toHaveLength(1);
        expect(watchOptions.ignored[0]).toBeInstanceOf(RegExp);

        handle.close();
    });
});

describe('startWatcher with single files', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockChokidarWatch.mockReset();
    });
    afterEach(() => jest.useRealTimers());

    function start(files: string[]) {
        const w = { on: jest.fn(), close: jest.fn(), add: jest.fn(), unwatch: jest.fn() };

        w.on.mockReturnValue(w);
        mockChokidarWatch.mockReturnValue(w);
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const handle = startWatcher({ entryPoint: '/ws/lib/public-api.ts', files, onRebuild, logger: createLogger(), debounceMs: 10 });
        const change = w.on.mock.calls.find(([event]) => event === 'change')![1] as (path: string) => void;

        return { w, handle, onRebuild, change };
    }

    async function settle(): Promise<void> {
        jest.advanceTimersByTime(10);
        await Promise.resolve();
    }

    it('watches a file whatever its extension and rebuilds when it changes', async () => {
        const { handle, onRebuild, change } = start(['/ws/a11y-report.json']);

        expect(mockChokidarWatch.mock.calls[0][0]).toContain('/ws/a11y-report.json');
        change('/ws/a11y-report.json');
        await settle();

        expect(onRebuild).toHaveBeenCalledTimes(1);
        handle.close();
    });

    it('still ignores other files of that extension', async () => {
        const { handle, onRebuild, change } = start(['/ws/a11y-report.json']);

        change('/ws/lib/data.json');
        await settle();

        expect(onRebuild).not.toHaveBeenCalled();
        handle.close();
    });

    it('swaps the files on setFiles', async () => {
        const { w, handle, onRebuild, change } = start(['/ws/a11y-report.json']);

        handle.setFiles(['/ws/reports/a11y.json']);

        expect(w.unwatch).toHaveBeenCalledWith(['/ws/a11y-report.json']);
        expect(w.add).toHaveBeenCalledWith(['/ws/reports/a11y.json']);
        change('/ws/a11y-report.json');
        await settle();
        expect(onRebuild).not.toHaveBeenCalled();
        change('/ws/reports/a11y.json');
        await settle();
        expect(onRebuild).toHaveBeenCalledTimes(1);
        handle.close();
    });

    it('adds the same files again on setFiles, for a directory that appeared since', () => {
        const { w, handle } = start(['/ws/coverage/a11y-report.json']);

        handle.setFiles(['/ws/coverage/a11y-report.json']);

        expect(w.add).toHaveBeenCalledWith(['/ws/coverage/a11y-report.json']);
        expect(w.unwatch).not.toHaveBeenCalled();
        handle.close();
    });
});

describe('createChangeHandler', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should call onRebuild after debounce period', async () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('foo.ts');
        expect(onRebuild).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);
        await Promise.resolve();

        expect(onRebuild).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('ng-prism: Change detected, re-scanning...');

        handler.dispose();
    });

    it('should debounce rapid changes into a single rebuild', async () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('a.ts');
        jest.advanceTimersByTime(50);
        handler.handleChange('b.ts');
        jest.advanceTimersByTime(50);
        handler.handleChange('c.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();

        expect(onRebuild).toHaveBeenCalledTimes(1);

        handler.dispose();
    });

    it('should ignore non-matching file extensions', () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('readme.md');
        handler.handleChange('image.png');
        handler.handleChange('data.json');

        jest.advanceTimersByTime(200);

        expect(onRebuild).not.toHaveBeenCalled();

        handler.dispose();
    });

    it('should ignore style and asset changes that cannot affect the manifest', () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('button.component.scss');
        handler.handleChange('global.css');
        handler.handleChange('icon.svg');
        handler.handleChange('template.html');

        jest.advanceTimersByTime(200);

        expect(onRebuild).not.toHaveBeenCalled();

        handler.dispose();
    });

    it('rebuilds for what isRelevant accepts instead of .ts files', async () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const handler = createChangeHandler({ onRebuild, logger: createLogger(), debounceMs: 100, isRelevant: (f) => f.endsWith('report.json') });

        handler.handleChange('x.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).not.toHaveBeenCalled();

        handler.handleChange('report.json');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(1);

        handler.dispose();
    });

    it('should handle null filename (triggers rebuild)', async () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange(null);
        jest.advanceTimersByTime(100);
        await Promise.resolve();

        expect(onRebuild).toHaveBeenCalledTimes(1);

        handler.dispose();
    });

    it('should not crash when onRebuild throws', async () => {
        const onRebuild = jest.fn().mockRejectedValue(new Error('scan failed'));
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('foo.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        await Promise.resolve();

        expect(logger.error).toHaveBeenCalledWith('ng-prism: Re-scan failed: scan failed');

        handler.dispose();
    });

    it('should queue changes that arrive during a rebuild and run another rebuild after completion', async () => {
        const resolvers: Array<() => void> = [];
        const onRebuild = jest.fn().mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolvers.push(resolve);
                })
        );
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('first.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(1);

        handler.handleChange('second.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(1);

        resolvers[0]();
        await Promise.resolve();
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(2);

        resolvers[1]();
        await Promise.resolve();

        handler.dispose();
    });

    it('should coalesce multiple changes during a rebuild into a single follow-up rebuild', async () => {
        const resolvers: Array<() => void> = [];
        const onRebuild = jest.fn().mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolvers.push(resolve);
                })
        );
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('first.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(1);

        handler.handleChange('second.ts');
        jest.advanceTimersByTime(100);
        handler.handleChange('third.ts');
        jest.advanceTimersByTime(100);
        handler.handleChange('fourth.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(1);

        resolvers[0]();
        await Promise.resolve();
        await Promise.resolve();
        expect(onRebuild).toHaveBeenCalledTimes(2);

        resolvers[1]();
        await Promise.resolve();

        handler.dispose();
    });

    it('should not rebuild after dispose', () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('foo.ts');
        handler.dispose();
        jest.advanceTimersByTime(200);

        expect(onRebuild).not.toHaveBeenCalled();
    });

    it('should log re-scan complete on success', async () => {
        const onRebuild = jest.fn().mockResolvedValue(undefined);
        const logger = createLogger();
        const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

        handler.handleChange('foo.ts');
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        await Promise.resolve();

        expect(logger.info).toHaveBeenCalledWith('ng-prism: Re-scan complete.');

        handler.dispose();
    });
});
