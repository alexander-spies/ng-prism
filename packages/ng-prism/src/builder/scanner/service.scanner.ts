import ts from 'typescript';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { ScannedService } from '../../plugin/service.types.js';
import { readProvision } from './api/angular-decorators.js';
import type { ExportIndex } from './api/export-index.js';
import { extractServiceApi } from './api/service-api.extractor.js';
import { readSetupRefs } from './api/setup.reader.js';
import { createReporters, extractShowcaseConfig, type ShowcasedClass } from './component.scanner.js';
import { describePartOfOnServiceOrPipe, describeUnreadableApi } from './showcase-diagnostics.js';

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
 * Read the services among the showcased classes of an entry point: classes
 * with `@Injectable` or `@Service`, unless they declare fields only a component
 * can use. Components are left to {@link scanComponents}.
 *
 * Nothing is run and the class is never imported: the service is read from the
 * source, its API from the declarations, its `setup` from the array literal
 * the arrow function returns. A service whose API cannot be read is left out
 * with a notice, so that it does not take the whole scan down.
 */
export function scanServices(showcased: ShowcasedClass[], checker: ts.TypeChecker, { exportIndex, diagnostics, notices }: ScanServicesOptions): ScannedService[] {
    const services: ScannedService[] = [];
    const { report, notify } = createReporters(diagnostics, notices);

    for (const { symbol, classDecl, decorator, argument, kind: classKind } of showcased) {
        if (classKind.kind !== 'service') continue;

        const className = classDecl.name?.text ?? 'Anonymous';
        const showcaseConfig = extractShowcaseConfig(decorator, className, report, checker);

        if (!showcaseConfig || !argument) continue;

        // pickServiceFields drops it below; the diagnostic tells the author why nothing came of it.
        if (showcaseConfig.partOf !== undefined) report(describePartOfOnServiceOrPipe(className, argument));

        let api: ScannedService['api'];

        try {
            api = extractServiceApi(classDecl, readSetupRefs(argument, className, checker, exportIndex, report), checker, exportIndex);
        } catch (error) {
            notify(describeUnreadableApi(className, error, 'service'));
            continue;
        }

        const service: ScannedService = {
            className,
            filePath: classDecl.getSourceFile().fileName,
            showcaseConfig: pickServiceFields(showcaseConfig),
            provision: readProvision(classKind.decorator, checker),
            api
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
