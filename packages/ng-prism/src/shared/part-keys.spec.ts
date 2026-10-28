import { partKeys } from './part-keys.js';

describe('partKeys', () => {
    it('keys each part by its class name', () => {
        expect(partKeys(['OptionComponent', 'OptgroupComponent'])).toEqual(['OptionComponent', 'OptgroupComponent']);
    });

    it('numbers the second and later part of a class name that parts share, in their order', () => {
        expect(partKeys(['ItemComponent', 'GroupComponent', 'ItemComponent', 'ItemComponent'])).toEqual([
            'ItemComponent',
            'GroupComponent',
            'ItemComponent~2',
            'ItemComponent~3'
        ]);
    });

    it('is empty for a component without parts', () => {
        expect(partKeys([])).toEqual([]);
    });
});
