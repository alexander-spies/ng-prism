import type { NgPrismConfig } from '../../plugin/plugin.types.js';

/** Config options declared since the first release that nothing has ever read. */
const DEPRECATED_CONFIG_OPTIONS = ['ui', 'themeStylesheet', 'headless', 'appComponent'] as const;

const NEVER_HAD_AN_EFFECT = 'which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.';

/**
 * One notice per deprecated option the config or one of its plugins sets.
 * They never had an effect, so the notice only asks to remove them.
 */
export function describeDeprecatedOptions(config: NgPrismConfig, configFile: string): string[] {
    const notices: string[] = [];

    for (const option of DEPRECATED_CONFIG_OPTIONS) {
        if (config[option] !== undefined) notices.push(`${configFile} sets "${option}", ${NEVER_HAD_AN_EFFECT}`);
    }

    for (const plugin of config.plugins ?? []) {
        if (plugin.wrapComponent !== undefined) notices.push(`plugin "${plugin.name}" sets wrapComponent, ${NEVER_HAD_AN_EFFECT}`);

        for (const panel of plugin.panels ?? []) {
            if (panel.position !== undefined) notices.push(`plugin "${plugin.name}" sets position on panel "${panel.id}", ${NEVER_HAD_AN_EFFECT}`);
        }
    }
    return notices;
}
