import { PRISM_BASE_TOKENS, PRISM_DARK_THEME, PRISM_LIGHT_THEME } from './prism-default-theme.js';

/** The three theme options of `NgPrismConfig`, as the theme service receives them. */
export interface ThemeOverrides {
    theme?: Record<string, string>;
    darkTheme?: Record<string, string>;
    lightTheme?: Record<string, string>;
}

export interface ResolvedTheme {
    /** Every token for one mode, ready to be set as custom properties. */
    tokens: Record<string, string>;
    /** Deprecated tokens the user overrode, so the caller can warn once about each. */
    deprecatedOverrides: string[];
}

/**
 * The deprecated mark roles and the status colours that replaced them in 22.7.
 * Core reads only the successors, so an override of a mark is carried over to
 * keep working until the marks are removed.
 */
const MARK_SUCCESSORS: ReadonlyArray<readonly [string, string]> = [
    ['--prism-mark-nominal', '--prism-success'],
    ['--prism-mark-attention', '--prism-warn'],
    ['--prism-mark-critical', '--prism-danger']
];

/**
 * All tokens for one mode: base tokens, the mode's theme, the user's
 * mode-specific overrides, then the user's `theme` overrides, which win.
 *
 * Two overrides are carried further than the key they name. A `--prism-mark-*`
 * override lands on its successor unless that one is overridden too. And an
 * override of `--prism-primary` alone pulls `--prism-primary-fill` and its hover
 * along, and so does the active toggle track: since 22.7 fills read their own
 * tokens, and a user who recolours the primary would otherwise get blue buttons
 * next to links in their colour.
 *
 * Pure, so the header can ask for the dark set while the app runs light.
 */
export function resolveThemeTokens(mode: 'dark' | 'light', overrides: ThemeOverrides): ResolvedTheme {
    const modeTheme = mode === 'dark' ? PRISM_DARK_THEME : PRISM_LIGHT_THEME;
    const modeOverrides = (mode === 'dark' ? overrides.darkTheme : overrides.lightTheme) ?? {};
    const user = { ...modeOverrides, ...overrides.theme };
    const tokens = { ...PRISM_BASE_TOKENS, ...modeTheme, ...user };
    const deprecatedOverrides: string[] = [];

    for (const [mark, successor] of MARK_SUCCESSORS) {
        if (!(mark in user)) continue;
        deprecatedOverrides.push(mark);
        if (!(successor in user)) tokens[successor] = user[mark];
    }

    if ('--prism-primary' in user) {
        if (!('--prism-primary-fill' in user)) tokens['--prism-primary-fill'] = user['--prism-primary'];
        if (!('--prism-primary-fill-hover' in user)) tokens['--prism-primary-fill-hover'] = user['--prism-primary'];
        if (!('--prism-toggle-on' in user)) tokens['--prism-toggle-on'] = user['--prism-primary'];
    }

    return { tokens, deprecatedOverrides };
}
