import type { Shot } from './shot.ts';

/** The styleguide in the tilted window of the end card: one 2× still, no pointer. */
export const endcard: Shot = {
    id: 'endcard',
    query: 'component=ButtonComponent&variant=0',
    ready: '.demo-wrap[data-prism-rendered="ButtonComponent:0"]',
    kind: 'still',
    async run() {}
};
