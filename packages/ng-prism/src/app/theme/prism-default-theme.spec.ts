import { PRISM_BASE_TOKENS, PRISM_DARK_THEME, PRISM_LIGHT_THEME } from './prism-default-theme.js';

describe('spacing scale', () => {
    it('declares seven steps', () => {
        const steps = ['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-7'];

        for (const step of steps) {
            expect(PRISM_BASE_TOKENS[step]).toMatch(/^\d+px$/);
        }
    });

    it('is strictly ascending', () => {
        const px = (key: string) => Number.parseInt(PRISM_BASE_TOKENS[key], 10);
        const values = [1, 2, 3, 4, 5, 6, 7].map((n) => px(`--sp-${n}`));

        for (let i = 1; i < values.length; i++) {
            expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
    });
});

describe('density and band heights', () => {
    it('defaults density to 1', () => {
        expect(PRISM_BASE_TOKENS['--density']).toBe('1');
    });

    /**
     * The point of the band tokens is that one CSS variable rescales the whole
     * chrome. A band declared as a bare pixel value silently opts out, and
     * no other test would notice.
     */
    it.each(['--band-header', '--band-head', '--band-rail', '--band-tabs'])('%s scales with density', (key) => {
        expect(PRISM_BASE_TOKENS[key]).toMatch(/^calc\(\d+px \* var\(--density\)\)$/);
    });

    it('keeps --prism-header-height as an alias so published CSS keeps working', () => {
        expect(PRISM_BASE_TOKENS['--prism-header-height']).toBe('var(--band-header)');
    });
});

describe('mark roles', () => {
    const themes = [
        ['dark', PRISM_DARK_THEME],
        ['light', PRISM_LIGHT_THEME]
    ] as const;

    /**
     * The nominal role is a colour, not an absence.
     *
     * It began as `transparent`, on the argument that drawing anything for a
     * healthy value is the wallpaper problem in another hue. That still holds
     * where a mark would otherwise not exist: the sidebar renders nothing for a
     * clean component, because `decorateItem` returns `null`. But the status
     * chip, the header badges and the gauge render regardless, and there grey
     * made "measured and fine" look like "not measured at all". Those read this
     * token; nothing has been added to the sidebar.
     */
    /**
     * Since 22.7 the marks are aliases of the one status family, so a status
     * colour and its mark can no longer drift apart.
     */
    it.each(themes)('%s theme points every mark at its status colour', (_n, theme) => {
        expect(theme['--prism-mark-nominal']).toBe('var(--prism-success)');
        expect(theme['--prism-mark-attention']).toBe('var(--prism-warn)');
        expect(theme['--prism-mark-critical']).toBe('var(--prism-danger)');
    });

    it.each(themes)('%s theme keeps the deprecated spectrum pointing at the brand gradient', (_n, theme) => {
        expect(theme['--prism-spectrum']).toBe('var(--prism-brand-gradient)');
    });
});

describe('stage tokens', () => {
    const themes = [
        ['dark', PRISM_DARK_THEME],
        ['light', PRISM_LIGHT_THEME]
    ] as const;

    it.each(themes)('%s theme declares a stage surface', (_name, theme) => {
        expect(theme['--prism-stage']).toBeDefined();
    });

    it.each(themes)('%s theme declares a stage edge', (_name, theme) => {
        expect(theme['--prism-stage-edge']).toBeDefined();
    });

    /**
     * Regression check: the stage and its container both read
     * `--prism-bg-surface`, so in light mode the boundary between tool and
     * specimen disappears entirely. The stage needs a surface of its own.
     */
    it.each(themes)('%s theme keeps the stage distinct from the container surface', (_name, theme) => {
        expect(theme['--prism-stage']).not.toBe(theme['--prism-bg-surface']);
    });
});
