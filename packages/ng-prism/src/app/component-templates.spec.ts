import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function componentFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) return componentFiles(path);
        return entry.name.endsWith('.component.ts') ? [path] : [];
    });
}

// CONTRIBUTING › Coding Standards › Angular: templates live in sibling files.
describe('app components', () => {
    it('should keep every template in a sibling .html file', () => {
        const inline = componentFiles(__dirname)
            .filter((file) => /^\s*template:/m.test(readFileSync(file, 'utf8')))
            .map((file) => relative(__dirname, file));

        expect(inline).toEqual([]);
    });
});
