import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) return sourceFiles(path);
        return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
    });
}

// Every message the app logs starts with [ng-prism], so a consumer can filter for them.
describe('app console messages', () => {
    it('should start with the [ng-prism] prefix', () => {
        const unprefixed = sourceFiles(__dirname).flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(/console\.(?:warn|error|info|log)\(\s*[`'"]([^`'"]*)/g)]
                .filter(([, text]) => !text.startsWith('[ng-prism]'))
                .map(([, text]) => `${relative(__dirname, file)}: ${text}`)
        );

        expect(unprefixed).toEqual([]);
    });
});
