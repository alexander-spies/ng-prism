import { DEPRECATED_THEME_TOKENS, deprecatedTokenNotice } from '../../app/theme/deprecated-tokens.js';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';

/** Config options declared since the first release that nothing has ever read. */
const DEPRECATED_CONFIG_OPTIONS = ['ui', 'themeStylesheet', 'headless', 'appComponent'] as const;

const NEVER_HAD_AN_EFFECT = 'which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.';

/** The config options that hold theme token overrides. */
const THEME_OPTIONS = ['theme', 'darkTheme', 'lightTheme'] as const;

/**
 * One notice per deprecated option the config or one of its plugins sets, and
 * per deprecated theme token an override names. The options never had an
 * effect, so their notice only asks to remove them; a token's names what
 * replaces it.
 */
export function describeDeprecatedOptions(config: NgPrismConfig, configFile: string): string[] {
    const notices: string[] = [];

    for (const option of DEPRECATED_CONFIG_OPTIONS) {
        if (config[option] !== undefined) notices.push(`${configFile} sets "${option}", ${NEVER_HAD_AN_EFFECT}`);
    }

    for (const option of THEME_OPTIONS) {
        for (const token of Object.keys(config[option] ?? {})) {
            if (token in DEPRECATED_THEME_TOKENS) notices.push(`${configFile} sets ${token} in "${option}": ${deprecatedTokenNotice(token)}`);
        }
    }

    for (const plugin of config.plugins ?? []) {
        if (plugin.wrapComponent !== undefined) notices.push(`plugin "${plugin.name}" sets wrapComponent, ${NEVER_HAD_AN_EFFECT}`);

        for (const panel of plugin.panels ?? []) {
            if (panel.position !== undefined) notices.push(`plugin "${plugin.name}" sets position on panel "${panel.id}", ${NEVER_HAD_AN_EFFECT}`);
        }
    }
    return notices;
}
