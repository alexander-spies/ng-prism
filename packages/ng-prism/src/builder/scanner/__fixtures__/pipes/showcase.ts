/** A local `@Showcase`, as in `../button.component.ts`: the scanner reads the decorator by name, not by import. */
export interface ShowcaseConfig {
    title: string;
    description?: string;
    category?: string;
    status?: 'stable' | 'beta' | 'wip' | 'deprecated' | string;
    variants?: { name: string; inputs?: Record<string, unknown> }[];
    renderPage?: string;
    setup?: () => readonly unknown[];
}

export function Showcase(config: ShowcaseConfig): ClassDecorator {
    return () => {};
}
