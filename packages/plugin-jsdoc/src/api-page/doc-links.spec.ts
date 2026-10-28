import type { ApiTypeDoc } from '@ng-prism/core/plugin';
import { renderBlockMarkdown, renderInlineMarkdown } from '../markdown.js';
import { resolveDocLinks, typeLinkTarget } from './doc-links.js';

function typeDoc(name: string, id = name): ApiTypeDoc {
    return { id, name, kind: 'interface', importPath: 'fixture/toast', tags: {}, properties: [] };
}

const types = [typeDoc('TabItem'), typeDoc('Item'), typeDoc('Item', 'Item@fixture/b')];
const resolve = (target: string) => typeLinkTarget(types, target);

function button(anchor: string, text: string): string {
    return `<button type="button" class="prism-jsdoc-api-page__ref" data-prism-type-link="${anchor}">${text}</button>`;
}

describe('typeLinkTarget', () => {
    it('prefers an exact id to a name', () => {
        expect(typeLinkTarget(types, 'Item')).toBe('type-Item');
        expect(typeLinkTarget(types, 'Item@fixture/b')).toBe('type-Item@fixture/b');
    });

    it('falls back to the name when no id matches', () => {
        expect(typeLinkTarget([typeDoc('Item', 'Item@fixture/b')], 'Item')).toBe('type-Item@fixture/b');
    });

    it('names the type of a member reference', () => {
        expect(typeLinkTarget(types, 'TabItem.id')).toBe('type-TabItem');
        expect(typeLinkTarget(types, 'TabItem#id')).toBe('type-TabItem');
    });

    it('builds the anchor of the scope it is given', () => {
        expect(typeLinkTarget(types, 'TabItem', 'part-0')).toBe('part-0-type-TabItem');
        expect(typeLinkTarget(types, 'Item@fixture/b', 'part-0')).toBe('part-0-type-Item@fixture/b');
        expect(typeLinkTarget(types, 'TabItem.id', 'part-0')).toBe('part-0-type-TabItem');
    });

    it('is undefined for what is not on the page', () => {
        expect(typeLinkTarget(types, 'Nope')).toBeUndefined();
        expect(typeLinkTarget(types, 'TabsComponent.tabs')).toBeUndefined();
        expect(typeLinkTarget([], 'TabItem')).toBeUndefined();
        expect(typeLinkTarget(types, 'Nope', 'part-0')).toBeUndefined();
    });
});

describe('resolveDocLinks', () => {
    it('turns a link to a type on the page into a jump button', () => {
        expect(resolveDocLinks('Uses {@link TabItem}.', resolve)).toBe(`Uses ${button('type-TabItem', 'TabItem')}.`);
    });

    it('takes the link text after a bar or after a space', () => {
        expect(resolveDocLinks('{@link TabItem | the item}', resolve)).toBe(button('type-TabItem', 'the item'));
        expect(resolveDocLinks('{@link TabItem the item}', resolve)).toBe(button('type-TabItem', 'the item'));
        expect(resolveDocLinks('{@link TabItem|the item}', resolve)).toBe(button('type-TabItem', 'the item'));
    });

    it('reads {@linkcode} and {@linkplain} like {@link}', () => {
        expect(resolveDocLinks('{@linkcode TabItem}', resolve)).toBe(button('type-TabItem', 'TabItem'));
        expect(resolveDocLinks('{@linkplain TabItem}', resolve)).toBe(button('type-TabItem', 'TabItem'));
    });

    it('jumps to the type of a member and keeps the member in the text', () => {
        expect(resolveDocLinks('{@link TabItem.id}', resolve)).toBe(button('type-TabItem', 'TabItem.id'));
    });

    it('links each of several references', () => {
        expect(resolveDocLinks('{@link TabItem} and {@link Item}', resolve)).toBe(`${button('type-TabItem', 'TabItem')} and ${button('type-Item', 'Item')}`);
    });

    it('shows a target that is not on the page as code, or as its link text', () => {
        expect(resolveDocLinks('{@link Missing}', resolve)).toBe('`Missing`');
        expect(resolveDocLinks('{@link Missing | text}', resolve)).toBe('text');
        expect(resolveDocLinks('{@link Missing text}', resolve)).toBe('text');
        expect(resolveDocLinks('{@link TabsComponent.tabs}', resolve)).toBe('`TabsComponent.tabs`');
    });

    it('turns a URL target into a Markdown link, whatever the separator', () => {
        expect(resolveDocLinks('{@link https://angular.dev | Angular}', resolve)).toBe('[Angular](https://angular.dev)');
        expect(resolveDocLinks('{@link https://angular.dev Angular}', resolve)).toBe('[Angular](https://angular.dev)');
        expect(resolveDocLinks('{@link https://angular.dev}', resolve)).toBe('[https://angular.dev](https://angular.dev)');
    });

    it('leaves a link inside an inline code span as written', () => {
        expect(resolveDocLinks('Write `{@link TabItem}` like this', resolve)).toBe('Write `{@link TabItem}` like this');
        expect(resolveDocLinks('Write ``{@link TabItem}`` like this', resolve)).toBe('Write ``{@link TabItem}`` like this');
    });

    it('resolves a link next to a code span', () => {
        expect(resolveDocLinks('`a` {@link TabItem} `b`', resolve)).toBe(`\`a\` ${button('type-TabItem', 'TabItem')} \`b\``);
    });

    it('escapes the link text', () => {
        expect(resolveDocLinks('{@link TabItem | a<b}', resolve)).toBe(button('type-TabItem', 'a&lt;b'));
    });

    it('leaves text without a link alone', () => {
        expect(resolveDocLinks('Nothing {to} see', resolve)).toBe('Nothing {to} see');
        expect(resolveDocLinks('{@link}', resolve)).toBe('{@link}');
    });

    it('reaches the rendered HTML of both Markdown renderers', () => {
        expect(renderInlineMarkdown(resolveDocLinks('See {@link TabItem}.', resolve))).toContain('data-prism-type-link="type-TabItem"');
        expect(renderBlockMarkdown(resolveDocLinks('{@link TabItem} is the item.', resolve))).toContain(`<p>${button('type-TabItem', 'TabItem')} is the item.</p>`);
    });
});
