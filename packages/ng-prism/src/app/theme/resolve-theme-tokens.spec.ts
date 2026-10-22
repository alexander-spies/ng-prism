import { PRISM_BASE_TOKENS, PRISM_DARK_THEME, PRISM_LIGHT_THEME } from './prism-default-theme.js';
import { resolveThemeTokens } from './resolve-theme-tokens.js';

describe('resolveThemeTokens', () => {
    it('merges base, mode theme, mode overrides, then theme overrides in that order', () => {
        const { tokens } = resolveThemeTokens('light', {
            lightTheme: { '--prism-text': '#111111', '--prism-bg': '#222222' },
            darkTheme: { '--prism-bg': '#333333' },
            theme: { '--prism-bg': '#444444' }
        });

        expect(tokens['--font-sans']).toBe(PRISM_BASE_TOKENS['--font-sans']);
        expect(tokens['--prism-text-2']).toBe(PRISM_LIGHT_THEME['--prism-text-2']);
        expect(tokens['--prism-text']).toBe('#111111');
        expect(tokens['--prism-bg']).toBe('#444444');
    });

    it('carries a --prism-mark-* override onto its successor and reports it', () => {
        const resolved = resolveThemeTokens('dark', { theme: { '--prism-mark-attention': '#ff0000' } });

        expect(resolved.tokens['--prism-warn']).toBe('#ff0000');
        expect(resolved.deprecatedOverrides).toEqual(['--prism-mark-attention']);
    });

    it('lets an explicit successor win over the deprecated mark', () => {
        const { tokens } = resolveThemeTokens('dark', { darkTheme: { '--prism-mark-critical': '#ff0000', '--prism-danger': '#00ff00' } });

        expect(tokens['--prism-danger']).toBe('#00ff00');
    });

    it('pulls the fill along when only --prism-primary is overridden', () => {
        const { tokens } = resolveThemeTokens('light', { theme: { '--prism-primary': '#e11d48' } });

        expect(tokens['--prism-primary-fill']).toBe('#e11d48');
        expect(tokens['--prism-primary-fill-hover']).toBe('#e11d48');
    });

    it('flattens the toggle track to an overridden primary', () => {
        const { tokens } = resolveThemeTokens('dark', { theme: { '--prism-primary': '#e11d48' } });

        expect(tokens['--prism-toggle-on']).toBe('#e11d48');
    });

    it('keeps an explicitly overridden fill', () => {
        const { tokens } = resolveThemeTokens('light', { theme: { '--prism-primary': '#e11d48', '--prism-primary-fill': '#9f1239' } });

        expect(tokens['--prism-primary-fill']).toBe('#9f1239');
        expect(tokens['--prism-primary-fill-hover']).toBe('#e11d48');
    });

    it('leaves the fill alone without a primary override', () => {
        const { tokens, deprecatedOverrides } = resolveThemeTokens('dark', {});

        expect(tokens['--prism-primary-fill']).toBe(PRISM_DARK_THEME['--prism-primary-fill']);
        expect(deprecatedOverrides).toEqual([]);
    });

    /**
     * The header renders this set in both themes. A third-party header widget
     * reads its status colours from here without any code of its own, so the
     * user's dark overrides have to reach it and the light ones must not.
     */
    it('builds the header set from the dark theme including darkTheme overrides', () => {
        const { tokens } = resolveThemeTokens('dark', {
            darkTheme: { '--prism-warn': '#ffaa00' },
            lightTheme: { '--prism-warn': '#000000' }
        });

        expect(tokens['--prism-warn']).toBe('#ffaa00');
        expect(tokens['--prism-bg']).toBe(PRISM_DARK_THEME['--prism-bg']);
    });
});
