import { Component } from '@angular/core';

@Component({
    selector: 'getting-started-page',
    standalone: true,
    template: `
        <div class="gs-page">
            <h1>Getting Started</h1>
            <p class="gs-page__intro">Quick guide to installing and using the test-lib component library.</p>

            <section>
                <h2>Installation</h2>
                <pre><code>npm install test-lib</code></pre>
            </section>

            <section>
                <h2>Basic Usage</h2>
                <pre><code>import {{ '{' }} ButtonComponent {{ '}' }} from 'test-lib';

&#64;Component({{ '{' }}
  imports: [ButtonComponent],
  template: \`&lt;lib-button label="Click me" /&gt;\`
{{ '}' }})
export class MyComponent {{ '{' }}{{ '}' }}</code></pre>
            </section>

            <section>
                <h2>Available Components</h2>
                <p>Browse the sidebar to explore all available components with live examples and interactive controls.</p>
            </section>
        </div>
    `,
    styles: `
        .gs-page {
            max-width: 700px;
            margin: 0 auto;
            padding: 32px;
            font-family: var(--prism-font-sans);
            color: var(--prism-text);
        }
        .gs-page h1 {
            font-size: 28px;
            margin-bottom: 8px;
        }
        .gs-page__intro {
            color: var(--prism-text-2);
            margin-bottom: 32px;
        }
        .gs-page section {
            margin-bottom: 32px;
        }
        .gs-page h2 {
            font-size: 18px;
            margin-bottom: 12px;
        }
        .gs-page pre {
            background: var(--prism-bg-elevated);
            color: var(--prism-text);
            padding: 16px;
            border: 1px solid var(--prism-border);
            border-radius: 8px;
            overflow-x: auto;
            font-size: 14px;
            line-height: 1.5;
        }
        .gs-page code {
            font-family: var(--prism-font-mono);
        }
        .gs-page p {
            line-height: 1.6;
            color: var(--prism-text-2);
        }
    `
})
export class GettingStartedPageComponent {}
