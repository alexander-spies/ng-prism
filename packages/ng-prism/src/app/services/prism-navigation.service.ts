import { computed, inject, Injectable, signal } from '@angular/core';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeComponent, ScannedComponent } from '../../plugin/plugin.types.js';
import type { PanelTarget, RuntimeService } from '../../plugin/service.types.js';
import { itemShowcaseConfig } from './navigation-item.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

const DEFAULT_SECTION_ORDER: Record<string, number> = {
    Components: 0,
    Directives: 10,
    Services: 20,
    Pipes: 30
};

const SECTION_TIEBREAK: readonly string[] = ['Components', 'Directives', 'Services', 'Pipes'];

export interface CategoryNode {
    name: string;
    items: NavigationItem[];
}

export interface SectionNode {
    name: string;
    order: number;
    totalCount: number;
    categories: CategoryNode[];
}

export function resolveSection(c: ScannedComponent): string {
    if (c.showcaseConfig.section) return c.showcaseConfig.section;
    return c.componentMeta.isDirective ? 'Directives' : 'Components';
}

/** An item that carries a `@Showcase` config, so everything but a page. */
type ShowcasedItem = Exclude<NavigationItem, { kind: 'page' }>;

/** The section an item lists under: its own `section`, else the default for what it is. */
function resolveItemSection(item: ShowcasedItem): string {
    switch (item.kind) {
        case 'component':
            return resolveSection(item.data.meta);
        case 'service':
            return item.data.meta.showcaseConfig.section ?? 'Services';
        case 'pipe':
            return item.data.meta.showcaseConfig.section ?? 'Pipes';
    }
}

function defaultSectionOrder(name: string): number {
    return DEFAULT_SECTION_ORDER[name] ?? 100;
}

function sectionTiebreak(a: string, b: string): number {
    const ia = SECTION_TIEBREAK.indexOf(a);
    const ib = SECTION_TIEBREAK.indexOf(b);

    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
}

@Injectable({ providedIn: 'root' })
export class PrismNavigationService {
    private readonly searchService = inject(PrismSearchService);
    private readonly manifestService = inject(PrismManifestService);

    readonly activeItem = signal<NavigationItem | null>(null);

    readonly activeComponent = computed<RuntimeComponent | null>(() => {
        const item = this.activeItem();

        if (item?.kind !== 'component') return null;
        const manifest = this.manifestService.manifest();
        const relinked = manifest.components.find((c) => c.meta.className === item.data.meta.className);

        return relinked ?? null;
    });

    readonly activeService = computed<RuntimeService | null>(() => {
        const item = this.activeItem();

        if (item?.kind !== 'service') return null;
        const relinked = this.manifestService.services().find((s) => s.meta.className === item.data.meta.className);

        return relinked ?? null;
    });

    readonly activePipe = computed<RuntimePipe | null>(() => {
        const item = this.activeItem();

        if (item?.kind !== 'pipe') return null;
        const relinked = this.manifestService.pipes().find((p) => p.meta.className === item.data.meta.className);

        return relinked ?? null;
    });

    /**
     * What the active item is, for the panels that apply to one kind only.
     * Built from the re-linked signals, so an item the manifest no longer has
     * (and a page, which no panel targets) reports `null`.
     */
    readonly activeTarget = computed<PanelTarget | null>(() => {
        if (this.activeComponent()) return 'component';
        if (this.activeService()) return 'service';
        if (this.activePipe()) return 'pipe';
        return null;
    });

    readonly activePage = computed<StyleguidePage | null>(() => {
        const item = this.activeItem();

        if (item?.kind !== 'page') return null;
        const manifest = this.manifestService.manifest();
        const relinked = manifest.pages?.find((p) => p.title === item.data.title && p.type === item.data.type);

        return relinked ?? null;
    });

    readonly sectionTree = computed<SectionNode[]>(() => {
        const items: ShowcasedItem[] = [
            ...this.searchService.filteredComponents().map((data): ShowcasedItem => ({ kind: 'component', data })),
            ...this.searchService.filteredServices().map((data): ShowcasedItem => ({ kind: 'service', data })),
            ...this.searchService.filteredPipes().map((data): ShowcasedItem => ({ kind: 'pipe', data }))
        ];

        const sections = new Map<string, Map<string, NavigationItem[]>>();
        const sectionOrders = new Map<string, number>();

        for (const item of items) {
            const config = item.data.meta.showcaseConfig;
            const section = resolveItemSection(item);
            const category = config.category ?? 'Uncategorized';

            const catMap = sections.get(section) ?? new Map<string, NavigationItem[]>();
            const list = catMap.get(category) ?? [];

            list.push(item);
            catMap.set(category, list);
            sections.set(section, catMap);

            const explicit = config.sectionOrder;
            const current = sectionOrders.get(section);

            if (explicit !== undefined) {
                sectionOrders.set(section, current === undefined ? explicit : Math.min(current, explicit));
            }
        }

        const result: SectionNode[] = [];

        for (const [name, catMap] of sections.entries()) {
            const order = sectionOrders.get(name) ?? defaultSectionOrder(name);

            const categories: CategoryNode[] = [];

            for (const [catName, catItems] of catMap.entries()) {
                catItems.sort((a, b) => {
                    const oa = itemShowcaseConfig(a)?.componentOrder ?? Infinity;
                    const ob = itemShowcaseConfig(b)?.componentOrder ?? Infinity;

                    if (oa !== ob) return oa - ob;
                    const la = itemShowcaseConfig(a)?.title ?? '';
                    const lb = itemShowcaseConfig(b)?.title ?? '';

                    return la.localeCompare(lb);
                });
                categories.push({ name: catName, items: catItems });
            }

            categories.sort((a, b) => {
                const oa = Math.min(...a.items.map((i) => itemShowcaseConfig(i)?.categoryOrder ?? Infinity));
                const ob = Math.min(...b.items.map((i) => itemShowcaseConfig(i)?.categoryOrder ?? Infinity));

                if (oa !== ob) return oa - ob;
                return a.name.localeCompare(b.name);
            });

            const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);

            result.push({ name, order, totalCount, categories });
        }

        result.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return sectionTiebreak(a.name, b.name);
        });

        return result;
    });

    /** The component that has a part of the class `className`: a part has no page of its own, so its parent's is where it opens. Since 22.7.0. */
    parentOfPart(className: string): RuntimeComponent | undefined {
        return this.manifestService.components().find((comp) => comp.parts?.some((part) => part.meta.className === className));
    }

    select(comp: RuntimeComponent): void {
        this.activeItem.set({ kind: 'component', data: comp });
    }

    selectService(service: RuntimeService): void {
        this.activeItem.set({ kind: 'service', data: service });
    }

    selectPipe(pipe: RuntimePipe): void {
        this.activeItem.set({ kind: 'pipe', data: pipe });
    }

    selectPage(page: StyleguidePage): void {
        this.activeItem.set({ kind: 'page', data: page });
    }

    selectFirst(): void {
        const pages = this.searchService.filteredPages();

        if (pages.length > 0) {
            this.activeItem.set({ kind: 'page', data: pages[0] });
            return;
        }
        const comps = this.searchService.filteredComponents();

        if (comps.length > 0) {
            this.activeItem.set({ kind: 'component', data: comps[0] });
            return;
        }
        const services = this.searchService.filteredServices();

        if (services.length > 0) {
            this.activeItem.set({ kind: 'service', data: services[0] });
            return;
        }
        const pipes = this.searchService.filteredPipes();

        if (pipes.length > 0) {
            this.activeItem.set({ kind: 'pipe', data: pipes[0] });
            return;
        }
        this.activeItem.set(null);
    }
}
