import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AlertComponent, ButtonComponent, TooltipDirective } from 'test-lib';

@Component({
    selector: 'button-patterns-page',
    standalone: true,
    imports: [AlertComponent, ButtonComponent, TooltipDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="doc-page">
            <header class="doc-header">
                <p class="doc-eyebrow">Patterns</p>
                <h1 class="doc-title">Button Patterns</h1>
                <p class="doc-lead"
                    >How the button variants work together. Each pattern renders live with the library's components, the snippet below it is all it takes.</p
                >
            </header>

            <section class="doc-section doc-section--tight">
                <div class="doc-card">
                    <h2 class="doc-card__title">Dialog actions</h2>
                    <p class="doc-card__text"
                        >The main action goes last and is the only <code>filled</code> button. The way out sits left of it as a <code>text</code> button.</p
                    >
                    <div class="doc-stage stage--end">
                        <lib-button label="Cancel" variant="text" />
                        <lib-button label="Save changes" variant="filled" />
                    </div>
                    <pre class="doc-code"><code>{{ snippets.dialog }}</code></pre>
                </div>
            </section>

            <section class="doc-section doc-section--tight">
                <div class="doc-card">
                    <h2 class="doc-card__title">Ranking by emphasis</h2>
                    <p class="doc-card__text">
                        <code>filled</code>, <code>outlined</code> and <code>text</code> rank actions from most to least important. Two filled buttons side by side
                        compete for attention.
                    </p>
                    <div class="doc-stage">
                        <lib-button label="Publish" variant="filled" />
                        <lib-button label="Save draft" variant="outlined" />
                        <lib-button label="Preview" variant="text" />
                    </div>
                    <pre class="doc-code"><code>{{ snippets.emphasis }}</code></pre>
                </div>
            </section>

            <section class="doc-section doc-section--tight">
                <div class="doc-card">
                    <h2 class="doc-card__title">Destructive confirmation</h2>
                    <p class="doc-card__text">There is no danger button. An alert names what the action destroys, and the button says what it does.</p>
                    <div class="doc-stage stage--column">
                        <sg-alert severity="warning" title="Delete this project?" message="All of its pages, comments and history are removed for good." />
                        <div class="stage__actions">
                            <lib-button label="Keep project" variant="text" />
                            <lib-button label="Delete project" variant="filled" />
                        </div>
                    </div>
                    <pre class="doc-code"><code>{{ snippets.destructive }}</code></pre>
                </div>
            </section>

            <section class="doc-section doc-section--tight">
                <div class="doc-card">
                    <h2 class="doc-card__title">Toolbar</h2>
                    <p class="doc-card__text">
                        <code>icon-only</code> buttons save space but say nothing on their own. Give each one a <code>libTooltip</code> that names its action.
                    </p>
                    <div class="doc-stage">
                        <lib-button variant="icon-only" icon="✎" libTooltip="Edit" tooltipPosition="bottom" />
                        <lib-button variant="icon-only" icon="⧉" libTooltip="Duplicate" tooltipPosition="bottom" />
                        <lib-button variant="icon-only" icon="★" libTooltip="Add to favourites" tooltipPosition="bottom" />
                    </div>
                    <pre class="doc-code"><code>{{ snippets.toolbar }}</code></pre>
                </div>
            </section>

            <section class="doc-section doc-section--tight">
                <div class="doc-card">
                    <h2 class="doc-card__title">Stacked full width</h2>
                    <p class="doc-card__text">In narrow forms, <code>fullWidth</code> stacks the actions and gives them one shared edge.</p>
                    <div class="doc-stage">
                        <div class="stage__stack">
                            <lib-button label="Sign in" variant="filled" [fullWidth]="true" />
                            <lib-button label="Create account" variant="outlined" [fullWidth]="true" />
                        </div>
                    </div>
                    <pre class="doc-code"><code>{{ snippets.stacked }}</code></pre>
                </div>
            </section>
        </article>
    `,
    styleUrls: ['./page-frame.css'],
    styles: `
        .stage--end {
            justify-content: flex-end;
        }

        .stage--column {
            flex-direction: column;
            align-items: stretch;
        }

        .stage__actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .stage__stack {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 280px;
        }
    `
})
export class ButtonPatternsPageComponent {
    protected readonly snippets = {
        dialog: `<lib-button label="Cancel" variant="text" />
<lib-button label="Save changes" variant="filled" />`,
        emphasis: `<lib-button label="Publish" variant="filled" />
<lib-button label="Save draft" variant="outlined" />
<lib-button label="Preview" variant="text" />`,
        destructive: `<sg-alert
  severity="warning"
  title="Delete this project?"
  message="All of its pages, comments and history are removed for good." />
<lib-button label="Keep project" variant="text" />
<lib-button label="Delete project" variant="filled" />`,
        toolbar: `<lib-button variant="icon-only" icon="✎" libTooltip="Edit" tooltipPosition="bottom" />
<lib-button variant="icon-only" icon="⧉" libTooltip="Duplicate" tooltipPosition="bottom" />
<lib-button variant="icon-only" icon="★" libTooltip="Add to favourites" tooltipPosition="bottom" />`,
        stacked: `<lib-button label="Sign in" variant="filled" [fullWidth]="true" />
<lib-button label="Create account" variant="outlined" [fullWidth]="true" />`
    };
}
