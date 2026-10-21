import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Swatch {
    name: string;
    hex: string;
}

interface Palette {
    name: string;
    description: string;
    swatches: Swatch[];
}

@Component({
    selector: 'design-tokens-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="doc-page">
            <header class="doc-header">
                <p class="doc-eyebrow">Foundations</p>
                <h1 class="doc-title">Design Tokens</h1>
                <p class="doc-lead"
                    >The colours, spacing, radii and type sizes test-lib's components are built from. Reach for these values first when you build something that has to
                    sit next to them.</p
                >
            </header>

            <section class="doc-section">
                <h2 class="doc-section__title">Colour</h2>
                <p class="doc-section__lead">Indigo carries the brand, four hues carry status, and a cool grey does the rest.</p>
                @for (palette of palettes; track palette.name) {
                    <div class="palette">
                        <div class="palette__head">
                            <h3 class="doc-label">{{ palette.name }}</h3>
                            <span class="palette__description">{{ palette.description }}</span>
                        </div>
                        <div class="doc-grid" style="--doc-grid-min: 120px">
                            @for (swatch of palette.swatches; track swatch.hex) {
                                <figure class="swatch">
                                    <div class="swatch__chip" [style.background]="swatch.hex"></div>
                                    <figcaption class="swatch__caption">
                                        <span class="swatch__name">{{ swatch.name }}</span>
                                        <code class="swatch__hex">{{ swatch.hex }}</code>
                                    </figcaption>
                                </figure>
                            }
                        </div>
                    </div>
                }
            </section>

            <section class="doc-section">
                <h2 class="doc-section__title">Spacing</h2>
                <p class="doc-section__lead">A 4px base. Related controls sit <code>sm</code> apart, sections <code>lg</code> and up.</p>
                <div class="doc-card scale">
                    @for (space of spacing; track space.name) {
                        <div class="scale__row">
                            <code class="scale__name">{{ space.name }}</code>
                            <span class="scale__value">{{ space.px }}px</span>
                            <div class="scale__bar" [style.width.px]="space.px"></div>
                        </div>
                    }
                </div>
            </section>

            <section class="doc-section">
                <h2 class="doc-section__title">Radius</h2>
                <p class="doc-section__lead">Small elements get small corners, surfaces get larger ones, and toggles and chips are fully round.</p>
                <div class="doc-grid" style="--doc-grid-min: 150px">
                    @for (radius of radii; track radius.name) {
                        <div class="doc-card radius">
                            <div class="radius__sample" [style.border-radius.px]="radius.px"></div>
                            <span class="swatch__name">{{ radius.name }}</span>
                            <code class="swatch__hex">{{ radius.px === 999 ? 'full' : radius.px + 'px' }}</code>
                        </div>
                    }
                </div>
            </section>

            <section class="doc-section">
                <h2 class="doc-section__title">Typography</h2>
                <p class="doc-section__lead">One family, the system UI font, in six steps.</p>
                <div class="doc-card type">
                    @for (step of typeScale; track step.name) {
                        <div class="type__row">
                            <div class="type__meta">
                                <span class="swatch__name">{{ step.name }}</span>
                                <code class="swatch__hex">{{ step.size }}px · {{ step.weight }}</code>
                            </div>
                            <p class="type__sample" [class.type__sample--overline]="step.overline" [style.font-size.px]="step.size" [style.font-weight]="step.weight">
                                The quick brown fox jumps over the lazy dog
                            </p>
                        </div>
                    }
                </div>
            </section>
        </article>
    `,
    styleUrls: ['./page-frame.css'],
    styles: `
        .palette + .palette {
            margin-top: 28px;
        }

        .palette__head {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 4px 12px;
            margin-bottom: 12px;
        }

        .palette__description {
            font-size: 13px;
            color: var(--prism-text-muted);
        }

        .swatch {
            margin: 0;
        }

        .swatch__chip {
            height: 56px;
            border: 1px solid var(--prism-border-strong);
            border-radius: 8px;
        }

        .swatch__caption {
            display: flex;
            flex-direction: column;
            margin-top: 8px;
        }

        .swatch__name {
            font-size: 13px;
            font-weight: 500;
            color: var(--prism-text);
        }

        .swatch__hex {
            font-size: 11px;
            color: var(--prism-text-muted);
        }

        .scale {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .scale__row {
            display: grid;
            grid-template-columns: 48px 48px minmax(0, 1fr);
            align-items: center;
            gap: 12px;
        }

        .scale__name {
            color: var(--prism-text);
        }

        .scale__value {
            font-size: 13px;
            color: var(--prism-text-muted);
        }

        .scale__bar {
            height: 12px;
            border-radius: 3px;
            background: var(--prism-primary);
        }

        .radius {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .radius__sample {
            width: 56px;
            height: 56px;
            margin-bottom: 10px;
            border: 2px solid var(--prism-primary);
            background: var(--prism-input-bg);
        }

        .doc-card.type {
            display: flex;
            flex-direction: column;
            padding: 4px 20px;
        }

        .type__row {
            display: grid;
            grid-template-columns: 140px minmax(0, 1fr);
            align-items: baseline;
            gap: 16px;
            padding: 16px 0;
        }

        .type__row + .type__row {
            border-top: 1px solid var(--prism-border);
        }

        .type__meta {
            display: flex;
            flex-direction: column;
        }

        .type__sample {
            margin: 0;
            overflow: hidden;
            font-family: system-ui, sans-serif;
            line-height: 1.3;
            color: var(--prism-text);
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .type__sample--overline {
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
    `
})
export class DesignTokensPageComponent {
    protected readonly palettes: Palette[] = [
        {
            name: 'Brand',
            description: 'Buttons, tabs, toggles, sliders and spinners',
            swatches: [
                { name: 'Indigo 50', hex: '#eef2ff' },
                { name: 'Indigo 100', hex: '#e0e7ff' },
                { name: 'Indigo 500', hex: '#6366f1' },
                { name: 'Indigo 600', hex: '#4f46e5' },
                { name: 'Indigo 700', hex: '#4338ca' }
            ]
        },
        {
            name: 'Status',
            description: 'Alerts, badges and progress bars',
            swatches: [
                { name: 'Info', hex: '#3b82f6' },
                { name: 'Success', hex: '#22c55e' },
                { name: 'Warning', hex: '#f59e0b' },
                { name: 'Error', hex: '#ef4444' }
            ]
        },
        {
            name: 'Neutral',
            description: 'Text, borders and surfaces',
            swatches: [
                { name: 'Grey 50', hex: '#f9fafb' },
                { name: 'Grey 100', hex: '#f3f4f6' },
                { name: 'Grey 200', hex: '#e5e7eb' },
                { name: 'Grey 300', hex: '#d1d5db' },
                { name: 'Grey 400', hex: '#9ca3af' },
                { name: 'Grey 500', hex: '#6b7280' },
                { name: 'Grey 700', hex: '#374151' },
                { name: 'Grey 900', hex: '#111827' }
            ]
        }
    ];

    protected readonly spacing = [
        { name: 'xs', px: 4 },
        { name: 'sm', px: 8 },
        { name: 'md', px: 16 },
        { name: 'lg', px: 24 },
        { name: 'xl', px: 32 },
        { name: '2xl', px: 48 }
    ];

    protected readonly radii = [
        { name: 'Small', px: 4 },
        { name: 'Medium', px: 8 },
        { name: 'Large', px: 12 },
        { name: 'Full', px: 999 }
    ];

    protected readonly typeScale = [
        { name: 'Heading 1', size: 32, weight: 700, overline: false },
        { name: 'Heading 2', size: 24, weight: 600, overline: false },
        { name: 'Heading 3', size: 18, weight: 600, overline: false },
        { name: 'Body', size: 16, weight: 400, overline: false },
        { name: 'Caption', size: 14, weight: 400, overline: false },
        { name: 'Overline', size: 12, weight: 500, overline: true }
    ];
}
