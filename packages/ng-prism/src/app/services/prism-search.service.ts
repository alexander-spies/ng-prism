import { computed, inject, Injectable, signal } from '@angular/core';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PrismManifestService } from './prism-manifest.service.js';

@Injectable({ providedIn: 'root' })
export class PrismSearchService {
    private readonly manifestService = inject(PrismManifestService);

    readonly query = signal('');

    readonly filteredComponents = computed(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.components();

        if (!q) return all;
        return all.filter((comp) => {
            const config = comp.meta.showcaseConfig;

            return (
                config.title.toLowerCase().includes(q) ||
                (config.category?.toLowerCase().includes(q) ?? false) ||
                (config.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
            );
        });
    });

    readonly filteredServices = computed<RuntimeService[]>(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.services();

        if (!q) return all;
        return all.filter((service) => {
            const config = service.meta.showcaseConfig;

            return (
                config.title.toLowerCase().includes(q) ||
                service.meta.className.toLowerCase().includes(q) ||
                (config.category?.toLowerCase().includes(q) ?? false) ||
                (config.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
            );
        });
    });

    readonly filteredPipes = computed<RuntimePipe[]>(() => {
        const q = this.query().toLowerCase().trim();
        const all = this.manifestService.pipes();

        if (!q) return all;
        return all.filter((pipe) => {
            const config = pipe.meta.showcaseConfig;

            return (
                config.title.toLowerCase().includes(q) ||
                pipe.meta.className.toLowerCase().includes(q) ||
                (config.category?.toLowerCase().includes(q) ?? false) ||
                (config.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
            );
        });
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
