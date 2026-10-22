export type FixtureVariant = 'filled' | 'outlined';

export interface FixtureTab {
    id: string;
    label: string;
    badge?: FixtureBadge;
}

export interface FixtureBadge {
    text: string;
}

export enum FixtureSize {
    S = 's',
    M = 'm'
}

/** @internal */
export interface FixtureInternal {
    x: number;
}
