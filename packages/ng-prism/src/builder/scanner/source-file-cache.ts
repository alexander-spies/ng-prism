import { statSync } from 'fs';
import ts from 'typescript';

export interface SourceFileCache {
    /** Pass to `ts.createProgram` together with the previous program. */
    host: ts.CompilerHost;
    /** Drop every cached file the given program no longer contains. */
    prune(program: ts.Program): void;
}

interface CachedSourceFile {
    stamp: string;
    sourceFile: ts.SourceFile;
}

/**
 * A compiler host that hands out the same `SourceFile` for a file that has
 * not changed since it was last parsed.
 *
 * `ts.createProgram(…, oldProgram)` only reuses a file from the old program
 * when the host returns the identical object. The default host reads and
 * parses on every call, so without this cache each rebuild re-parses the
 * whole program, Angular's typings included.
 *
 * A file counts as unchanged while its mtime and size are. An edit that keeps
 * the size and lands within the file system's mtime resolution goes unseen;
 * APFS and ext4 record nanoseconds, so in practice that does not happen.
 *
 * Module resolutions are recomputed on every program. Reusing them would
 * miss a file created after an import of it had already failed to resolve,
 * because the importing file itself has not changed.
 */
export function createSourceFileCache(compilerOptions: ts.CompilerOptions): SourceFileCache {
    const host = ts.createCompilerHost(compilerOptions);
    const parse = host.getSourceFile.bind(host);
    const cache = new Map<string, CachedSourceFile>();

    host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
        const stamp = readStamp(fileName);

        if (stamp === undefined) {
            cache.delete(fileName);
            return undefined;
        }

        const cached = cache.get(fileName);

        if (cached?.stamp === stamp && !shouldCreateNewSourceFile) return cached.sourceFile;

        const sourceFile = parse(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);

        if (sourceFile) cache.set(fileName, { stamp, sourceFile });
        else cache.delete(fileName);
        return sourceFile;
    };
    host.hasInvalidatedResolutions = () => true;

    return {
        host,
        prune(program) {
            const live = new Set(program.getSourceFiles().map((sf) => sf.fileName));

            for (const fileName of cache.keys()) {
                if (!live.has(fileName)) cache.delete(fileName);
            }
        }
    };
}

function readStamp(fileName: string): string | undefined {
    try {
        const { mtimeMs, size } = statSync(fileName);

        return `${mtimeMs}:${size}`;
    } catch {
        return undefined;
    }
}
