import { computed, inject, Injectable, signal } from '@angular/core';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';

@Injectable({ providedIn: 'root' })
export class PrismManifestService {
    private readonly _manifest = signal<RuntimeManifest>(inject(PRISM_MANIFEST));

    readonly manifest = this._manifest.asReadonly();

    readonly components = computed<RuntimeComponent[]>(() => this._manifest().components);

    readonly services = computed<RuntimeService[]>(() => this._manifest().services ?? []);

    readonly pages = computed<StyleguidePage[]>(() => this._manifest().pages ?? []);

    readonly categories = computed<string[]>(() => {
        const manifest = this._manifest();
        const orderMap = new Map<string, number>();

        for (const comp of manifest.components) {
            const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
            const order = comp.meta.showcaseConfig.categoryOrder ?? Infinity;

            if (!orderMap.has(cat) || order < orderMap.get(cat)!) {
                orderMap.set(cat, order);
            }
        }
        for (const page of manifest.pages ?? []) {
            const cat = page.category ?? 'Uncategorized';

            if (!orderMap.has(cat)) {
                orderMap.set(cat, Infinity);
            }
        }
        return [...orderMap.keys()].sort((a, b) => {
            const orderA = orderMap.get(a)!;
            const orderB = orderMap.get(b)!;

            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b);
        });
    });

    readonly groupedByCategory = computed<Map<string, RuntimeComponent[]>>(() => {
        const manifest = this._manifest();
        const map = new Map<string, RuntimeComponent[]>();

        for (const comp of manifest.components) {
            const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
            const list = map.get(cat) ?? [];

            list.push(comp);
            map.set(cat, list);
        }
        return map;
    });

    updateManifest(manifest: RuntimeManifest): void {
        this._manifest.set(manifest);
    }
}
