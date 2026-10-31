import { handoffTarget } from './focus-handoff.js';

function sidebar(markup: string): HTMLElement {
    const root = document.createElement('nav');

    root.innerHTML = markup;
    document.body.appendChild(root);
    return root;
}

describe('handoffTarget', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should pick the active entry', () => {
        const root = sidebar('<div class="sb-filter"><input /></div><button class="sb-item">A</button><button class="sb-item sb-item--active">B</button>');

        expect(handoffTarget(root)?.textContent).toBe('B');
    });

    it('should fall back to the filter without an active entry', () => {
        const root = sidebar('<div class="sb-filter"><input /></div><button class="sb-item">A</button>');

        expect(handoffTarget(root)?.tagName).toBe('INPUT');
    });
});
