/** A local `@Showcase`, as in `../services/showcase.ts`: the scanner reads the decorator by name, not by import. */
export interface ShowcaseConfig {
    title: string;
}

export function Showcase(config: ShowcaseConfig): ClassDecorator {
    return () => {};
}
