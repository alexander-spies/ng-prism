import ts from 'typescript';
import type { ScannedPipe } from '../../plugin/pipe.types.js';
import { classifyShowcaseClass, readPipeOptions } from './api/angular-decorators.js';
import type { ExportIndex } from './api/export-index.js';
import { extractPipeApi } from './api/pipe-api.extractor.js';
import { readSetupRefs } from './api/setup.reader.js';
import { createReporters, extractShowcaseConfig, findShowcasedClass } from './component.scanner.js';
import { pickServiceFields } from './service.scanner.js';
import { describePipeNameUnreadable, describePipeNotStandalone } from './showcase-diagnostics.js';

export interface ScanPipesOptions {
    /** Built from every entry point of the library, since a setup function or a type is often exported by another one than the pipe. */
    exportIndex: ExportIndex;
    /** Shared with {@link scanComponents} and {@link scanServices}, and across entry points, so that a pipe exported from several of them does not repeat its warnings. */
    diagnostics: string[];
    notices: Set<string>;
}

/**
 * Scan exported symbols for pipes annotated with @Showcase: classes with
 * `@Pipe` from `@angular/core`, unless they declare fields only a component
 * can use. Components are left to {@link scanComponents}, services to
 * {@link scanServices}.
 *
 * A pipe the styleguide cannot call from a template is reported and dropped:
 * one declared with `standalone: false`, and one whose `name` the source does
 * not give as a constant. A `pure` that cannot be read is left out instead,
 * since the pipe is still worth showing.
 *
 * Nothing is run and the class is never imported: the pipe is read from the
 * source, its API from the declarations, its `setup` from the array literal
 * the arrow function returns.
 */
export function scanPipes(exports: ts.Symbol[], checker: ts.TypeChecker, { exportIndex, diagnostics, notices }: ScanPipesOptions): ScannedPipe[] {
    const pipes: ScannedPipe[] = [];
    const { report } = createReporters(diagnostics, notices);

    for (const sym of exports) {
        const showcased = findShowcasedClass(sym, checker);

        if (!showcased) continue;

        const { symbol, classDecl, decorator, argument } = showcased;
        const classKind = classifyShowcaseClass(classDecl, argument, checker);

        if (classKind.kind !== 'pipe') continue;

        const className = classDecl.name?.text ?? 'Anonymous';
        const showcaseConfig = extractShowcaseConfig(decorator, className, report, checker);

        if (!showcaseConfig || !argument) continue;

        const options = readPipeOptions(classKind.decorator, checker);

        if (!options.standalone) {
            report(describePipeNotStandalone(className, classKind.decorator));
            continue;
        }

        if (options.name === undefined) {
            report(describePipeNameUnreadable(className, classKind.decorator));
            continue;
        }

        const pipe: ScannedPipe = {
            className,
            filePath: classDecl.getSourceFile().fileName,
            showcaseConfig: pickServiceFields(showcaseConfig),
            pipeName: options.name,
            api: extractPipeApi(classDecl, readSetupRefs(argument, className, checker, exportIndex, report), checker, exportIndex)
        };
        const importPath = exportIndex.get(symbol);

        if (options.pure !== undefined) pipe.pure = options.pure;
        if (importPath !== undefined) pipe.importPath = importPath;

        pipes.push(pipe);
    }

    return pipes;
}
