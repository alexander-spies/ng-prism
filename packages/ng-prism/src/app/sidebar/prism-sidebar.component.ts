import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import type { ComponentStatus } from '../../decorator/showcase.types.js';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { BUILTIN_NAVIGATION_DECORATIONS } from '../panels/builtin-navigation-decorations.js';
import { itemKey, itemShowcaseConfig } from '../services/navigation-item.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismBadgeComponent } from '../shared/prism-badge.component.js';
import {
    categoryCount,
    type CategoryRollup,
    decorateItem,
    type ItemDecorations,
    lifecycleIcon,
    resolveNavigationDecorations,
    rollupCategory,
    sectionFacet
} from './navigation-decorations.js';

const STORAGE_KEY = 'ng-prism-sidebar-collapsed';

const SECTION_ICONS: Record<string, string> = {
    Components: 'box',
    Directives: 'zap',
    Services: 'plug',
    Pipes: 'pipette'
};
const DEFAULT_SECTION_ICON = 'box-select';
const SERVICE_ICON = 'plug';
const PIPE_ICON = 'pipette';

function sectionIcon(name: string): string {
    return SECTION_ICONS[name] ?? DEFAULT_SECTION_ICON;
}

/** The glyph of an item's kind, shown unless it is a work in progress. `undefined` for a component: `lifecycleIcon` falls back to the box. */
function idleIcon(item: NavigationItem): string | undefined {
    switch (item.kind) {
        case 'service':
            return SERVICE_ICON;
        case 'pipe':
            return PIPE_ICON;
        default:
            return undefined;
    }
}

interface SidebarCategory {
    name: string;
    items: NavigationItem[];
}

interface SidebarItem {
    item: NavigationItem;
    icon: string;
    decorations: ItemDecorations | null;
}

interface ComponentCategory {
    name: string;
    items: SidebarItem[];
    rollup: CategoryRollup;
}

@Component({
    selector: 'prism-sidebar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent, PrismBadgeComponent],
    templateUrl: './prism-sidebar.component.html',
    styleUrl: './prism-sidebar.component.css'
})
export class PrismSidebarComponent {
    protected readonly navigationService = inject(PrismNavigationService);
    protected readonly searchService = inject(PrismSearchService);
    private readonly pluginService = inject(PrismPluginService);
    private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');

    private readonly decorations = computed(() => resolveNavigationDecorations(BUILTIN_NAVIGATION_DECORATIONS, this.pluginService.navigationDecorations()));

    @HostListener('document:keydown', ['$event'])
    protected onGlobalKey(e: KeyboardEvent): void {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = (e.target as HTMLElement).tagName;

        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        this.filterInput()?.nativeElement.focus();
    }

    private readonly collapsedSet = signal<Set<string>>(this.loadCollapsed());

    protected readonly totalPages = computed(() => {
        return this.searchService.filteredPages().length;
    });

    protected readonly pageCategories = computed<SidebarCategory[]>(() => {
        const pages = this.searchService.filteredPages();
        const catMap = new Map<string, NavigationItem[]>();

        for (const page of pages) {
            const cat = page.category ?? 'Docs';
            const list = catMap.get(cat) ?? [];

            list.push({ kind: 'page', data: page });
            catMap.set(cat, list);
        }
        return [...catMap.entries()].map(([name, items]) => ({
            name,
            items
        }));
    });

    protected readonly componentSections = computed(() => {
        const defs = this.decorations();

        return this.navigationService.sectionTree().map((section) => ({
            name: section.name,
            icon: sectionIcon(section.name),
            totalCount: section.totalCount,
            categories: section.categories.map((cat): ComponentCategory => {
                const items = cat.items.map((item) => ({
                    item,
                    icon: lifecycleIcon(this.itemStatus(item), idleIcon(item)),
                    decorations: decorateItem(item, defs)
                }));

                return {
                    name: cat.name,
                    rollup: rollupCategory(items.map((row) => row.decorations)),
                    items
                };
            })
        }));
    });

    protected isCollapsed(key: string): boolean {
        return this.collapsedSet().has(key);
    }

    protected toggleCollapse(key: string): void {
        this.collapsedSet.update((prev) => {
            const next = new Set(prev);

            if (next.has(key)) next.delete(key);
            else next.add(key);
            this.saveCollapsed(next);
            return next;
        });
    }

    protected readonly itemKey = itemKey;

    protected itemLabel(item: NavigationItem): string {
        return item.kind === 'page' ? item.data.title : item.data.meta.showcaseConfig.title;
    }

    protected itemStatus(item: NavigationItem): ComponentStatus | undefined {
        return itemShowcaseConfig(item)?.status;
    }

    /** The category head's count and problem chip. A clean category shows only its size. */
    protected countOf(rollup: CategoryRollup, total: number) {
        return categoryCount(rollup, total);
    }

    protected facet(sectionName: string) {
        return sectionFacet(sectionName);
    }

    protected itemTooltip(item: NavigationItem, decorations: ItemDecorations | null): string | null {
        const status = this.itemStatus(item);
        const lines: string[] = [];

        if (status === 'wip') lines.push('Work in progress');
        if (status === 'deprecated') lines.push('Deprecated / Legacy');
        if (decorations) lines.push(decorations.tooltip);
        return lines.length ? lines.join('\n') : null;
    }

    protected isActive(item: NavigationItem): boolean {
        const active = this.navigationService.activeItem();

        return active !== null && itemKey(active) === itemKey(item);
    }

    protected onSelect(item: NavigationItem): void {
        switch (item.kind) {
            case 'component':
                this.navigationService.select(item.data);
                break;
            case 'service':
                this.navigationService.selectService(item.data);
                break;
            case 'pipe':
                this.navigationService.selectPipe(item.data);
                break;
            case 'page':
                this.navigationService.selectPage(item.data);
                break;
        }
    }

    private loadCollapsed(): Set<string> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    }

    private saveCollapsed(set: Set<string>): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
        } catch {
            // Storage may be full or disabled (e.g. private browsing); the
            // collapsed set just stays unpersisted for this session.
        }
    }
}
