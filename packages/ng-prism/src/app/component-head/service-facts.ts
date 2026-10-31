import type { ServiceProvision } from '../../plugin/service.types.js';

/**
 * The plain facts about a service for the head's info popover: how it gets into
 * an injector, and where to import it from. The import path is optional on a
 * scanned service, so a service the scanner could not place just has one fact.
 */
export function serviceFacts(provision: ServiceProvision, importPath: string | undefined): string[] {
    const facts = [provision === 'auto' ? 'Provided automatically' : 'Needs a providers entry'];

    if (importPath) facts.push(importPath);
    return facts;
}
