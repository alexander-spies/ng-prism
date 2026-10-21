import ts from 'typescript';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { ScannedService } from '../../plugin/service.types.js';
import { createReporters, extractShowcaseConfig, findShowcasedClass } from './component.scanner.js';
import { classifyShowcaseClass, readProvision } from './service/angular-decorators.js';
import type { ExportIndex } from './service/export-index.js';
import { extractServiceApi } from './service/service-api.extractor.js';
import { readSetupRefs } from './service/setup.reader.js';

/**
 * The `@Showcase` fields that mean something for a service, and for a pipe, which the sidebar and the plugins treat the same way:
 * what places it in the sidebar, and what a plugin may read.
 */
const SERVICE_CONFIG_FIELDS = ['description', 'category', 'categoryOrder', 'componentOrder', 'section', 'sectionOrder', 'tags', 'meta', 'status'] as const;

export interface ScanServicesOptions {
    /** Built from every entry point of the library, since a setup function or a type is often exported by another one than the service. */
    exportIndex: ExportIndex;
    /** Shared with {@link scanComponents}, and across entry points, so that a service exported from several of them does not repeat its warnings. */
    diagnostics: string[];
    notices: Set<string>;
}

/**
 * Scan exported symbols for services annotated with @Showcase: classes with
 * `@Injectable` or `@Service`, unless they declare fields only a component
 * can use. Components are left to {@link scanComponents}.
 *
 * Nothing is run and the class is never imported: the service is read from the
 * source, its API from the declarations, its `setup` from the array literal
 * the arrow function returns.
 */
export function scanServices(exports: ts.Symbol[], checker: ts.TypeChecker, { exportIndex, diagnostics, notices }: ScanServicesOptions): ScannedService[] {
    const services: ScannedService[] = [];
    const { report } = createReporters(diagnostics, notices);

    for (const sym of exports) {
        const showcased = findShowcasedClass(sym, checker);

        if (!showcased) continue;

        const { symbol, classDecl, decorator, argument } = showcased;
        const classKind = classifyShowcaseClass(classDecl, argument, checker);

        if (classKind.kind !== 'service') continue;

        const className = classDecl.name?.text ?? 'Anonymous';
        const showcaseConfig = extractShowcaseConfig(decorator, className, report, checker);

        if (!showcaseConfig || !argument) continue;

        const service: ScannedService = {
            className,
            filePath: classDecl.getSourceFile().fileName,
            showcaseConfig: pickServiceFields(showcaseConfig),
            provision: readProvision(classKind.decorator, checker),
            api: extractServiceApi(classDecl, readSetupRefs(argument, className, checker, exportIndex, report), checker, exportIndex)
        };
        const importPath = exportIndex.get(symbol);

        if (importPath !== undefined) service.importPath = importPath;

        services.push(service);
    }

    return services;
}

/** `title` and whichever of the service fields the config sets: a component's `variants`, `bg` and the like mean nothing here. */
export function pickServiceFields(config: ShowcaseConfig): ShowcaseConfig {
    const picked: ShowcaseConfig = { title: config.title };

    for (const field of SERVICE_CONFIG_FIELDS) {
        if (config[field] !== undefined) Object.assign(picked, { [field]: config[field] });
    }

    return picked;
}
