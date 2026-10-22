import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { type ComponentStatus, PrismManifestService, PrismNavigationService, type RuntimeComponent, type ShowcaseConfig } from '@ng-prism/core';

interface Entry {
    key: string;
    title: string;
    status: ComponentStatus;
    open: () => void;
}

interface EntryGroup {
    title: string;
    entries: Entry[];
}

@Component({
    selector: 'getting-started-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="doc-page">
            <header class="doc-header">
                <p class="doc-eyebrow">Guide</p>
                <h1 class="doc-title">Getting Started</h1>
                <p class="doc-lead">
                    test-lib is a small Angular library of standalone, signal-based building blocks. This page takes you from the install to your first component.
                </p>
            </header>

            <div class="stats">
                @for (stat of stats(); track stat.label) {
                    <div class="doc-card stat">
                        <span class="stat__value">{{ stat.value }}</span>
                        <span class="doc-label">{{ stat.label }}</span>
                    </div>
                }
            </div>

            <section class="doc-section">
                <h2 class="doc-section__title">Set up</h2>
                <p class="doc-section__lead">Three steps. There is no NgModule to import, every component is standalone.</p>
                <ol class="steps">
                    <li class="step">
                        <span class="step__number">1</span>
                        <div class="step__body">
                            <h3 class="doc-card__title">Install the package</h3>
                            <pre class="doc-code"><code>npm install test-lib</code></pre>
                        </div>
                    </li>
                    <li class="step">
                        <span class="step__number">2</span>
                        <div class="step__body">
                            <h3 class="doc-card__title">Set app-wide defaults <span class="step__optional">optional</span></h3>
                            <p class="doc-card__text">
                                <code>NotificationService</code> and the <code>timeAgo</code> pipe work without configuration. Their providers change the defaults for the
                                whole app.
                            </p>
                            <pre class="doc-code"><code>{{ providersSnippet }}</code></pre>
                        </div>
                    </li>
                    <li class="step">
                        <span class="step__number">3</span>
                        <div class="step__body">
                            <h3 class="doc-card__title">Import what you use</h3>
                            <pre class="doc-code"><code>{{ usageSnippet }}</code></pre>
                        </div>
                    </li>
                </ol>
            </section>

            <section class="doc-section">
                <h2 class="doc-section__title">What's inside</h2>
                <p class="doc-section__lead">This list is read from the styleguide's own manifest, so it is never out of date. Pick a component to open it.</p>
                <div class="doc-grid">
                    @for (group of groups(); track group.title) {
                        <section class="doc-card category">
                            <h3 class="doc-label">{{ group.title }}</h3>
                            <ul class="category__list">
                                @for (entry of group.entries; track entry.key) {
                                    <li>
                                        <button type="button" class="category__item" (click)="entry.open()">
                                            <span>{{ entry.title }}</span>
                                            <span class="status" [attr.data-status]="entry.status">{{ entry.status }}</span>
                                        </button>
                                    </li>
                                }
                            </ul>
                        </section>
                    }
                </div>
            </section>
        </article>
    `,
    styleUrls: ['./page-frame.css'],
    styles: `
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 48px;
        }

        .doc-card.stat {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 16px 20px;
        }

        .stat__value {
            font-size: 28px;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -0.02em;
            color: var(--prism-text);
        }

        .steps {
            display: flex;
            flex-direction: column;
            gap: 24px;
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .step {
            display: grid;
            grid-template-columns: 32px minmax(0, 1fr);
            gap: 16px;
        }

        .step__number {
            display: grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border: 1px solid var(--prism-border-strong);
            border-radius: 50%;
            font-size: 13px;
            font-weight: 600;
            color: var(--prism-primary);
        }

        .step__body .doc-card__title {
            margin: 4px 0 10px;
        }

        .step__body .doc-card__text {
            margin-bottom: 12px;
        }

        .step__optional {
            margin-left: 6px;
            font-size: 12px;
            font-weight: 500;
            color: var(--prism-text-muted);
        }

        .category__list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin: 12px 0 0;
            padding: 0;
            list-style: none;
        }

        .category__item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            padding: 6px 10px;
            border: 0;
            border-radius: 6px;
            background: none;
            font: inherit;
            color: var(--prism-text);
            text-align: left;
            cursor: pointer;
        }

        .category__item:hover {
            background: var(--prism-input-bg);
        }

        .category__item:focus-visible {
            outline: 2px solid var(--prism-primary);
            outline-offset: -2px;
        }

        .status {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--prism-text-muted);
        }

        .status[data-status='stable'] {
            color: var(--prism-mark-nominal);
        }

        .status[data-status='beta'],
        .status[data-status='deprecated'] {
            color: var(--prism-mark-attention);
        }
    `
})
export class GettingStartedPageComponent {
    private readonly manifest = inject(PrismManifestService);
    private readonly navigation = inject(PrismNavigationService);

    protected readonly providersSnippet = `// app.config.ts
import { provideNotifications, provideTimeAgo } from 'test-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNotifications({ position: 'top-right' }),
    provideTimeAgo({ style: 'short' }),
  ],
};`;

    protected readonly usageSnippet = `import { ButtonComponent } from 'test-lib';

@Component({
  imports: [ButtonComponent],
  template: \`<lib-button label="Save" (clicked)="save()" />\`,
})
export class EditorComponent {}`;

    /** Components first, then directives, then services and pipes: the order of the sidebar. */
    protected readonly groups = computed<EntryGroup[]>(() => {
        const services = this.manifest.services().map((s) => this.entry(s.meta.className, s.meta.showcaseConfig, () => this.navigation.selectService(s)));
        const pipes = this.manifest.pipes().map((p) => this.entry(p.meta.className, p.meta.showcaseConfig, () => this.navigation.selectPipe(p)));
        const servicesAndPipes = [...services, ...pipes];

        return [
            ...this.componentGroups(false),
            ...this.componentGroups(true),
            ...(servicesAndPipes.length ? [{ title: 'Services & Pipes', entries: servicesAndPipes }] : [])
        ];
    });

    protected readonly stats = computed(() => {
        const components = this.manifest.components();
        const directives = components.filter((c) => c.meta.componentMeta.isDirective).length;

        return [
            { label: 'Components', value: components.length - directives },
            { label: 'Directives', value: directives },
            { label: 'Services', value: this.manifest.services().length },
            { label: 'Pipes', value: this.manifest.pipes().length }
        ];
    });

    private componentGroups(directives: boolean): EntryGroup[] {
        const grouped = this.manifest.groupedByCategory();
        const byOrder = (a: RuntimeComponent, b: RuntimeComponent): number =>
            (a.meta.showcaseConfig.componentOrder ?? Infinity) - (b.meta.showcaseConfig.componentOrder ?? Infinity) ||
            a.meta.showcaseConfig.title.localeCompare(b.meta.showcaseConfig.title);

        return this.manifest
            .categories()
            .map((title) => ({
                title,
                entries: (grouped.get(title) ?? [])
                    .filter((c) => c.meta.componentMeta.isDirective === directives)
                    .sort(byOrder)
                    .map((c) => this.entry(c.meta.className, c.meta.showcaseConfig, () => this.navigation.select(c)))
            }))
            .filter((group) => group.entries.length > 0);
    }

    private entry(key: string, config: ShowcaseConfig, open: () => void): Entry {
        return { key, title: config.title, status: config.status ?? 'stable', open };
    }
}
