import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent, TooltipDirective } from 'test-lib';

@Component({
    selector: 'prism-button-tooltip-page',
    standalone: true,
    imports: [ButtonComponent, TooltipDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page">
            <h3 class="page__heading">Button + Tooltip Directive</h3>
            <p class="page__description">
                The <code>[libTooltip]</code> directive can be applied to any element. Below are examples showing all four positions on a <code>lib-button</code>.
            </p>

            <div class="page__grid">
                <div class="page__example">
                    <span class="page__label">Top</span>
                    <lib-button libTooltip="Tooltip on top" tooltipPosition="top" label="Top" variant="filled" />
                </div>
                <div class="page__example">
                    <span class="page__label">Bottom</span>
                    <lib-button libTooltip="Tooltip on bottom" tooltipPosition="bottom" label="Bottom" variant="outlined" />
                </div>
                <div class="page__example">
                    <span class="page__label">Left</span>
                    <lib-button libTooltip="Tooltip on left" tooltipPosition="left" label="Left" variant="elevated" />
                </div>
                <div class="page__example">
                    <span class="page__label">Right</span>
                    <lib-button libTooltip="Tooltip on right" tooltipPosition="right" label="Right" variant="text" />
                </div>
            </div>
        </div>
    `,
    styles: `
        .page {
            max-width: 640px;
            font-family: var(--prism-font-sans);
        }
        .page__heading {
            font-size: 16px;
            font-weight: 600;
            color: var(--prism-text);
            margin: 0 0 8px;
        }
        .page__description {
            font-size: 14px;
            color: var(--prism-text-2);
            line-height: 1.5;
            margin: 0 0 24px;
        }
        .page__description code {
            background: var(--prism-input-bg);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--prism-font-mono);
            font-size: 13px;
            color: var(--prism-primary);
        }
        .page__grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
        }
        .page__example {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 24px;
            border: 1px solid var(--prism-border);
            border-radius: 8px;
            background: var(--prism-bg-surface);
        }
        .page__label {
            font-size: 12px;
            font-weight: 500;
            color: var(--prism-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    `
})
export class ButtonTooltipPageComponent {}
