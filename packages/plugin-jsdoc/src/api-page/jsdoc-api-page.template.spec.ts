import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The API page around its sections, read from the templates: the components
 * declare `input()`, which this workspace's JIT test setup cannot render.
 */
const PAGE = readFileSync(join(__dirname, 'jsdoc-api-page.component.html'), 'utf8');
const PANEL = readFileSync(join(__dirname, '..', 'jsdoc-panel.component.html'), 'utf8');
const STYLES = readFileSync(join(__dirname, 'jsdoc-api-page.component.css'), 'utf8');

describe('api page', () => {
    it("renders the page's own sections unscoped", () => {
        expect(PAGE).toMatch(/<prism-jsdoc-api-sections \[page\]="page\(\)" \/>/);
    });

    it('renders a Parts block per part, anchored and headed by title and selector', () => {
        expect(PAGE).toMatch(/@for \(part of parts\(\); track part\.className\)/);
        expect(PAGE).toContain('[attr.data-toc-id]="part.scope"');
        expect(PAGE).toMatch(/<prism-jsdoc-api-sections[^>]*\[scope\]="part\.scope"[^>]*nested/);
        expect(PAGE).toContain('{{ part.selector }}');
    });

    it('opens the Parts only when there are parts', () => {
        expect(PAGE).toMatch(/@if \(parts\(\)\.length\) \{\s*<div class="prism-jsdoc-api-page__parts-title">Parts<\/div>/);
    });

    /** A jump to a part lights up its block the way a jump to a type lights up the card. */
    it('highlights the block of a part that was jumped to', () => {
        expect(PAGE).toContain('[class.prism-jsdoc-api-page__part--highlighted]="highlightedId() === part.scope"');
        expect(STYLES).toMatch(/\.prism-jsdoc-api-page__part--highlighted \{[^}]*box-shadow/);
    });

    it('lists the parts in "On this page" under their own title', () => {
        expect(PAGE).toMatch(/toc-title">Parts</);
        expect(PAGE).toMatch(/@for \(entry of partsToc\(\); track entry\.id\)/);
    });

    it('sets the entry of a part apart from the sections below it', () => {
        expect(PAGE).toContain('[class.prism-jsdoc-api-page__toc-link--part]="entry.part"');
        expect(PAGE).toContain('[class.prism-jsdoc-api-page__toc-link--sub]="entry.level === 2"');
    });
});

/**
 * The wiring of a jump, read from the class: the page needs a real layout,
 * which jsdom has none of. What the jump does over time is `JumpFollow`'s,
 * tested on its own; here only who starts it, moves it and ends it.
 */
describe('api page jumps', () => {
    const SOURCE = readFileSync(join(__dirname, 'jsdoc-api-page.component.ts'), 'utf8');

    it('starts following the target with every jump', () => {
        expect(SOURCE).toMatch(/goTo\(id: string\): void \{[\s\S]*?this\.follow\.start\(id\);[\s\S]*?this\.host\.scrollTo\(/);
    });

    /** An instant scroll (reduced motion) ends a frame after it starts, before the code blocks above the target have their text. */
    it("does not let a jump's own scrollend end it", () => {
        expect(SOURCE).not.toMatch(/scrollend/);
    });

    it('ends the jump when the reader takes over', () => {
        expect(SOURCE).toMatch(/for \(const type of READER_INPUT\) this\.host\.addEventListener\(type, endJump/);
        expect(SOURCE).toMatch(/const endJump = \(\) => this\.follow\.end\(\);/);
    });

    it('keeps the target in place when the page resizes, and counts a scroll as movement', () => {
        expect(SOURCE).toMatch(/new ResizeObserver\(\(\) => this\.followJump\(\)\)/);
        expect(SOURCE).toMatch(/private followJump\(\): void \{\s*const target = this\.follow\.moved\(\);/);
        expect(SOURCE).toMatch(/private onScroll\(\): void \{\s*this\.follow\.moved\(\);/);
    });

    it('marks the target in "On this page" for as long as the jump lasts', () => {
        expect(SOURCE).toContain('jumpTarget: this.follow.target');
    });
});

describe('api panel', () => {
    it('hands the page the parts and the part to show', () => {
        expect(PANEL).toMatch(/<prism-jsdoc-api-page[^>]*\[parts\]="parts\(\)"[^>]*\[activePart\]="activePart\(\)"/);
    });
});
