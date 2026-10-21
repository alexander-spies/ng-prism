import { Component } from '@angular/core';

@Component({
    selector: 'design-tokens-page',
    standalone: true,
    template: `
        <div class="tokens-page">
            <h1>Design Tokens</h1>
            <p class="tokens-page__intro">Visual reference for all design tokens used across the component library.</p>

            <section class="tokens-section">
                <h2>Colors</h2>
                <div class="tokens-grid">
                    @for (color of colors; track color.name) {
                        <div class="token-swatch">
                            <div class="token-swatch__color" [style.background]="color.value"></div>
                            <span class="token-swatch__name">{{ color.name }}</span>
                            <code class="token-swatch__value">{{ color.value }}</code>
                        </div>
                    }
                </div>
            </section>

            <section class="tokens-section">
                <h2>Spacing Scale</h2>
                <div class="tokens-spacing">
                    @for (space of spacing; track space.name) {
                        <div class="token-space">
                            <div class="token-space__bar" [style.width.px]="space.px"></div>
                            <span class="token-space__label">{{ space.name }} · {{ space.px }}px</span>
                        </div>
                    }
                </div>
            </section>

            <section class="tokens-section">
                <h2>Typography</h2>
                <div class="tokens-type">
                    <p style="font-size: 32px; font-weight: 700;">Heading 1 · 32px Bold</p>
                    <p style="font-size: 24px; font-weight: 600;">Heading 2 · 24px Semibold</p>
                    <p style="font-size: 18px; font-weight: 600;">Heading 3 · 18px Semibold</p>
                    <p style="font-size: 16px; font-weight: 400;">Body · 16px Regular</p>
                    <p style="font-size: 14px; font-weight: 400; opacity: 0.7;">Caption · 14px Regular</p>
                    <p style="font-size: 12px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Overline · 12px Medium</p>
                </div>
            </section>
        </div>
    `,
    styles: `
        .tokens-page {
            max-width: 800px;
            margin: 0 auto;
            padding: 32px;
            font-family: var(--prism-font-sans);
            color: var(--prism-text);
        }
        .tokens-page h1 {
            font-size: 28px;
            margin-bottom: 8px;
        }
        .tokens-page__intro {
            color: var(--prism-text-2);
            margin-bottom: 32px;
        }
        .tokens-section {
            margin-bottom: 40px;
        }
        .tokens-section h2 {
            font-size: 18px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--prism-border-strong);
            padding-bottom: 8px;
        }
        .tokens-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 16px;
        }
        .token-swatch__color {
            width: 100%;
            height: 64px;
            border-radius: 8px;
            border: 1px solid var(--prism-border-strong);
        }
        .token-swatch__name {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-top: 8px;
        }
        .token-swatch__value {
            display: block;
            font-family: var(--prism-font-mono);
            font-size: 11px;
            color: var(--prism-text-muted);
        }
        .tokens-spacing {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .token-space {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .token-space__bar {
            height: 12px;
            background: #6366f1;
            border-radius: 4px;
            min-width: 4px;
        }
        .token-space__label {
            font-size: 13px;
            color: var(--prism-text-2);
        }
        .tokens-type {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tokens-type p {
            margin: 0;
        }
    `
})
export class DesignTokensPageComponent {
    colors = [
        { name: 'Primary', value: '#6366f1' },
        { name: 'Primary Dark', value: '#4f46e5' },
        { name: 'Success', value: '#22c55e' },
        { name: 'Warning', value: '#f59e0b' },
        { name: 'Error', value: '#ef4444' },
        { name: 'Info', value: '#3b82f6' },
        { name: 'Neutral 100', value: '#f5f5f5' },
        { name: 'Neutral 300', value: '#d4d4d4' },
        { name: 'Neutral 500', value: '#737373' },
        { name: 'Neutral 900', value: '#171717' }
    ];

    spacing = [
        { name: 'xs', px: 4 },
        { name: 'sm', px: 8 },
        { name: 'md', px: 16 },
        { name: 'lg', px: 24 },
        { name: 'xl', px: 32 },
        { name: '2xl', px: 48 }
    ];
}
