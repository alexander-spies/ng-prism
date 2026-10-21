import { Component } from '@angular/core';
import { ButtonComponent } from 'test-lib';

@Component({
    selector: 'button-patterns-page',
    standalone: true,
    imports: [ButtonComponent],
    template: `
        <div class="patterns">
            <h2>Button Patterns</h2>
            <p class="patterns__intro">Common button usage patterns and combinations.</p>

            <section class="pattern">
                <h3>Button Group</h3>
                <div class="pattern__row">
                    <lib-button label="Save" variant="filled" />
                    <lib-button label="Save Draft" variant="outlined" />
                    <lib-button label="Cancel" variant="text" />
                </div>
            </section>

            <section class="pattern">
                <h3>Destructive Action</h3>
                <div class="pattern__row">
                    <lib-button label="Delete Account" variant="filled" />
                    <lib-button label="Cancel" variant="text" />
                </div>
            </section>

            <section class="pattern">
                <h3>Variants in Context</h3>
                <div class="pattern__row" style="align-items: center;">
                    <lib-button label="Primary Action" variant="filled" />
                    <lib-button label="Secondary" variant="elevated" />
                    <lib-button label="Outlined" variant="outlined" />
                </div>
            </section>

            <section class="pattern">
                <h3>Full Width</h3>
                <div class="pattern__stack">
                    <lib-button label="Sign In" variant="filled" />
                    <lib-button label="Create Account" variant="outlined" />
                </div>
            </section>
        </div>
    `,
    styles: `
        .patterns {
            max-width: 600px;
            margin: 0 auto;
            padding: 32px;
            font-family: var(--prism-font-sans);
            color: var(--prism-text);
        }
        .patterns h2 {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .patterns__intro {
            color: var(--prism-text-2);
            margin-bottom: 24px;
        }
        .pattern {
            margin-bottom: 28px;
        }
        .pattern h3 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--prism-text-2);
        }
        .pattern__row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .pattern__stack {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 300px;
        }
        .pattern__stack lib-button {
            display: block;
        }
    `
})
export class ButtonPatternsPageComponent {}
