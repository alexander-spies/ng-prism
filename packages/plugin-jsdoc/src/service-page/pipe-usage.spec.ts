import type { ApiMethod, ApiParam, ApiSetupEntry, ScannedPipe } from '@ng-prism/core/plugin';
import { generatePipeUsage } from './pipe-usage.js';

const PROVIDE_TIME_AGO: ApiSetupEntry = {
    name: 'provideTimeAgo',
    kind: 'function',
    importPath: 'test-lib',
    tags: {},
    params: [{ name: 'options', type: { text: 'TimeAgoOptions', links: ['TimeAgoOptions'] }, optional: true }],
    returnType: { text: 'Provider' }
};

const VALUE: ApiParam = { name: 'value', type: { text: 'Date | number' }, optional: false };

function transform(...params: ApiParam[]): ApiMethod {
    return { name: 'transform', params: [VALUE, ...params], returnType: { text: 'string' }, tags: {} };
}

function makePipe(overrides: Partial<ScannedPipe> = {}, setup: ApiSetupEntry[] = [PROVIDE_TIME_AGO], signatures: ApiMethod[] = [transform()]): ScannedPipe {
    return {
        className: 'TimeAgoPipe',
        filePath: '/lib/time-ago.pipe.ts',
        importPath: 'test-lib',
        showcaseConfig: { title: 'Time Ago' },
        pipeName: 'timeAgo',
        pure: true,
        api: { tags: {}, transform: signatures, setup, types: [] },
        ...overrides
    };
}

/** A pipe without setup whose only signature takes `params` after the value. */
function pipeTaking(...params: ApiParam[]): ScannedPipe {
    return makePipe({}, [], [transform(...params)]);
}

/** The last line of the snippet: the template line. */
function templateLine(pipe: ScannedPipe): string {
    return generatePipeUsage(pipe).split('\n').at(-1)!;
}

describe('generatePipeUsage', () => {
    it('writes import, imports and the template line', () => {
        expect(generatePipeUsage(makePipe())).toBe(
            [
                "import { TimeAgoPipe, provideTimeAgo } from 'test-lib';",
                '',
                '// app.config.ts',
                'providers: [provideTimeAgo()]',
                '',
                '// in the component that uses it',
                '@Component({ imports: [TimeAgoPipe], … })',
                '',
                '// in its template',
                '{{ value | timeAgo }}'
            ].join('\n')
        );
    });

    it('omits the app.config block without setup', () => {
        expect(generatePipeUsage(makePipe({}, []))).toBe(
            [
                "import { TimeAgoPipe } from 'test-lib';",
                '',
                '// in the component that uses it',
                '@Component({ imports: [TimeAgoPipe], … })',
                '',
                '// in its template',
                '{{ value | timeAgo }}'
            ].join('\n')
        );
    });

    it('turns required parameters into pipe arguments', () => {
        const pattern: ApiParam = { name: 'pattern', type: { text: 'string' }, optional: false };
        const locale: ApiParam = { name: 'locale', type: { text: 'string' }, optional: false };

        expect(templateLine({ ...pipeTaking(pattern), pipeName: 'sgDate' })).toBe('{{ value | sgDate: pattern }}');
        expect(templateLine(pipeTaking(pattern, locale))).toBe('{{ value | timeAgo: pattern: locale }}');
    });

    it('ignores optional and rest parameters', () => {
        const pattern: ApiParam = { name: 'pattern', type: { text: 'string' }, optional: false };
        const locale: ApiParam = { name: 'locale', type: { text: 'string' }, optional: true };
        const zone: ApiParam = { name: 'zone', type: { text: 'string' }, optional: true, defaultValue: "'UTC'" };
        const units: ApiParam = { name: 'units', type: { text: 'string[]' }, optional: false, rest: true };

        expect(templateLine(pipeTaking(locale))).toBe('{{ value | timeAgo }}');
        expect(templateLine(pipeTaking(pattern, locale, zone, units))).toBe('{{ value | timeAgo: pattern }}');
    });

    // Pipe arguments are positional: a required parameter can only be passed together with the one before it.
    it('keeps a parameter with a default when a required one follows it', () => {
        const zone: ApiParam = { name: 'zone', type: { text: 'string' }, optional: true, defaultValue: "'UTC'" };
        const pattern: ApiParam = { name: 'pattern', type: { text: 'string' }, optional: false };

        expect(templateLine(pipeTaking(zone, pattern))).toBe('{{ value | timeAgo: zone: pattern }}');
    });

    it('reads the template line from the first signature', () => {
        const pattern: ApiParam = { name: 'pattern', type: { text: 'string' }, optional: false };

        expect(templateLine(makePipe({}, [], [transform(), transform(pattern)]))).toBe('{{ value | timeAgo }}');
    });

    it('writes the bare template line for a pipe without transform', () => {
        expect(templateLine(makePipe({}, [], []))).toBe('{{ value | timeAgo }}');
    });

    it('groups imports by entry point, the pipe first', () => {
        const usage = generatePipeUsage(makePipe({}, [{ ...PROVIDE_TIME_AGO, importPath: 'test-lib/config' }]));

        expect(usage.split('\n').slice(0, 3)).toEqual(["import { TimeAgoPipe } from 'test-lib';", "import { provideTimeAgo } from 'test-lib/config';", '']);
    });
});
