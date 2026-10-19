/**
 * @jest-environment jsdom
 */

import { parseContentToNodes } from './projectable-content.js';

describe('parseContentToNodes', () => {
    it('puts string content into the unnamed slot', () => {
        const slots = parseContentToNodes('<span>Hello</span>', ['*']);

        expect(slots).toHaveLength(1);
        expect((slots[0][0] as Element).outerHTML).toBe('<span>Hello</span>');
    });

    it('fills the slots in the order of the template, not of the keys', () => {
        const slots = parseContentToNodes(
            {
                '[card-footer]': '<button>Action</button>',
                default: '<p>Body</p>',
                '[card-header]': '<h3>Title</h3>'
            },
            ['[card-header]', '*', '[card-footer]']
        );

        expect(slots).toHaveLength(3);
        expect((slots[0][0] as Element).tagName).toBe('H3');
        expect((slots[1][0] as Element).tagName).toBe('P');
        expect((slots[2][0] as Element).tagName).toBe('BUTTON');
    });

    it('leaves a slot without content empty', () => {
        const slots = parseContentToNodes({ '[card-header]': '<h3>Title</h3>' }, ['[card-header]', '*']);

        expect((slots[0][0] as Element).tagName).toBe('H3');
        expect(slots[1]).toHaveLength(0);
    });

    it('puts string content into the unnamed slot wherever the template has it', () => {
        const slots = parseContentToNodes('Body', ['[card-header]', '*']);

        expect(slots[0]).toHaveLength(0);
        expect(slots[1][0].textContent).toBe('Body');
    });

    it('applies an attribute selector to named slot content', () => {
        const slots = parseContentToNodes({ '[card-header]': '<h3>Title</h3>' }, ['*', '[card-header]']);

        const projected = slots[1][0] as Element;

        expect(projected.tagName).toBe('H3');
        expect(projected.hasAttribute('card-header')).toBe(true);
    });

    it('wraps bare text for a named slot in a span carrying the selector', () => {
        const slots = parseContentToNodes({ '[card-footer]': 'Footer' }, ['*', '[card-footer]']);

        const projected = slots[1][0] as Element;

        expect(projected.tagName).toBe('SPAN');
        expect(projected.textContent).toBe('Footer');
        expect(projected.hasAttribute('card-footer')).toBe(true);
    });

    it('drops content for a slot the template does not have and reports its key', () => {
        const onUnmatchedKey = jest.fn();
        const slots = parseContentToNodes({ default: 'Body', '[card-badge]': 'New' }, ['*'], onUnmatchedKey);

        expect(slots).toHaveLength(1);
        expect(slots[0][0].textContent).toBe('Body');
        expect(onUnmatchedKey).toHaveBeenCalledTimes(1);
        expect(onUnmatchedKey).toHaveBeenCalledWith('[card-badge]');
    });

    it('reports string content for a component without an unnamed slot as "default"', () => {
        const onUnmatchedKey = jest.fn();
        const slots = parseContentToNodes('Body', ['[card-header]'], onUnmatchedKey);

        expect(slots).toEqual([[]]);
        expect(onUnmatchedKey).toHaveBeenCalledWith('default');
    });
});
