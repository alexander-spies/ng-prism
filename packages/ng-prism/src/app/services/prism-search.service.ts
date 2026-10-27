import { computed, inject, Injectable, signal } from '@angular/core';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimePart } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PrismManifestService } from './prism-manifest.service.js';

/**
 * Whether a showcased item matches a query that is already lowercased and
 * trimmed: its title, category or tags, or one of `names`, the identifiers
 * that only some kinds have (a service's class name, a pipe's class name and
 * template name).
 */
function matchesQuery(q: string, config: ShowcaseConfig, names: readonly string[] = []): boolean {
    return (
        config.title.toLowerCase().includes(q) ||
        names.some((name) => name.toLowerCase().includes(q)) ||
        (config.category?.toLowerCase().includes(q) ?? false) ||
        (config.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
    );
}

/** Whether a part matches a query: its title, class name, selector or tags. */
function matchesPart(q: string, part: RuntimePart): boolean {
    return matchesQuery(q, part.meta.showcaseConfig, [part.meta.className, part.meta.componentMeta.selector]);
}

@Injectable({ providedIn: 'root' })
export class PrismSearchService {
    private readonly manifestService = inject(PrismManifestService);

    readonly query = signal('');

    readonly filteredComponents = computed(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.components();

        if (!q) return all;
        // A part has no entry in the sidebar, so a query that matches one lists its parent.
        return all.filter((comp) => matchesQuery(q, comp.meta.showcaseConfig) || (comp.parts ?? []).some((part) => matchesPart(q, part)));
    });

    readonly filteredServices = computed<RuntimeService[]>(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.services();

        if (!q) return all;
        return all.filter((service) => matchesQuery(q, service.meta.showcaseConfig, [service.meta.className]));
    });

    readonly filteredPipes = computed<RuntimePipe[]>(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.pipes();

        if (!q) return all;
        return all.filter((pipe) => matchesQuery(q, pipe.meta.showcaseConfig, [pipe.meta.className, pipe.meta.pipeName]));
    });

    readonly filteredPages = computed<StyleguidePage[]>(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.pages();

        if (!q) return all;
        return all.filter((page) => page.title.toLowerCase().includes(q) || (page.category?.toLowerCase().includes(q) ?? false));
    });

    search(q: string): void {
        this.query.set(q);
    }

    clear(): void {
        this.query.set('');
    }
}
