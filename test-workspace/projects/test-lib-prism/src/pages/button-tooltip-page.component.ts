import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismManifestService, PrismNavigationService } from '@ng-prism/core';
import { ButtonComponent, TooltipDirective } from 'test-lib';

@Component({
    selector: 'prism-button-tooltip-page',
    standalone: true,
    imports: [ButtonComponent, TooltipDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="doc-page">
            <header class="doc-header">
                <p class="doc-eyebrow">Directives</p>
                <h1 class="doc-title">Button + Tooltip</h1>
                <p class="doc-lead">
                    <code>libTooltip</code> adds a hover tooltip to any element, no wrapper component needed. Here it sits on <code>lib-button</code>, once for every
                    position.
                </p>
            </header>

            <section class="doc-section">
                <h2 class="doc-section__title">Positions</h2>
                <p class="doc-section__lead">Hover a button to see where <code>tooltipPosition</code> puts the tooltip.</p>
                <div class="doc-stage compass">
                    <lib-button class="compass__top" label="Top" variant="filled" libTooltip="Tooltip on top" tooltipPosition="top" />
                    <lib-button class="compass__left" label="Left" variant="elevated" libTooltip="Tooltip on the left" tooltipPosition="left" />
                    <lib-button class="compass__right" label="Right" variant="outlined" libTooltip="Tooltip on the right" tooltipPosition="right" />
                    <lib-button class="compass__bottom" label="Bottom" variant="text" libTooltip="Tooltip below" tooltipPosition="bottom" />
                </div>
            </section>

            <section class="doc-section">
                <h2 class="doc-section__title">Usage</h2>
                <p class="doc-section__lead">Import the directive next to the element it decorates and give it the text. The position defaults to <code>top</code>.</p>
                <pre class="doc-code"><code>{{ usageSnippet }}</code></pre>
            </section>

            @if (directive(); as entry) {
                <section class="doc-section">
                    <div class="doc-card more">
                        <div>
                            <h2 class="doc-card__title">Every input in one place</h2>
                            <p class="more__text">The directive's own page lists its inputs and lets you try each position on its own.</p>
                        </div>
                        <button type="button" class="more__link" (click)="navigation.select(entry)">Open Tooltip Directive →</button>
                    </div>
                </section>
            }
        </article>
    `,
    styleUrls: ['./page-frame.css'],
    styles: `
        .doc-stage.compass {
            display: grid;
            grid-template-areas:
                '. top .'
                'left . right'
                '. bottom .';
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 24px 16px;
            justify-items: center;
            padding: 56px 28px;
        }

        .compass__top {
            grid-area: top;
        }

        .compass__left {
            grid-area: left;
        }

        .compass__right {
            grid-area: right;
        }

        .compass__bottom {
            grid-area: bottom;
        }

        .doc-card.more {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .more__text {
            margin: 0;
        }

        .more__link {
            padding: 8px 14px;
            border: 1px solid var(--prism-border-strong);
            border-radius: 6px;
            background: none;
            font: inherit;
            font-weight: 500;
            color: var(--prism-primary);
            cursor: pointer;
        }

        .more__link:hover {
            background: var(--prism-input-bg);
        }

        .more__link:focus-visible {
            outline: 2px solid var(--prism-primary);
            outline-offset: 2px;
        }
    `
})
export class ButtonTooltipPageComponent {
    private readonly manifest = inject(PrismManifestService);
    protected readonly navigation = inject(PrismNavigationService);

    protected readonly directive = computed(() => this.manifest.components().find((c) => c.meta.className === 'TooltipDirective'));

    protected readonly usageSnippet = `import { ButtonComponent, TooltipDirective } from 'test-lib';

@Component({
  imports: [ButtonComponent, TooltipDirective],
  template: \`
    <lib-button
      label="Save"
      libTooltip="Saves a draft, nothing is published yet"
      tooltipPosition="bottom" />
  \`,
})
export class EditorToolbarComponent {}`;
}
