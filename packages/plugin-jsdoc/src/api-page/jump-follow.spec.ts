import { JUMP_QUIET_MS, JumpFollow } from './jump-follow.js';

describe('JumpFollow', () => {
    let ended: jest.Mock;
    let follow: JumpFollow;

    beforeEach(() => {
        jest.useFakeTimers();
        ended = jest.fn();
        follow = new JumpFollow(ended);
    });

    afterEach(() => {
        follow.end();
        jest.useRealTimers();
    });

    it('has no target before a jump', () => {
        expect(follow.target).toBeNull();
        expect(follow.moved()).toBeNull();
    });

    it('keeps the target of a jump while the page moves under it', () => {
        follow.start('part-0');

        expect(follow.target).toBe('part-0');
        expect(follow.moved()).toBe('part-0');
    });

    /** Under reduced motion the jump's own scroll is over a frame after it starts, long before the code blocks above the target have their text. */
    it('lasts past the end of its own scroll, for as long as the page keeps moving', () => {
        follow.start('part-0');

        for (let step = 0; step < 5; step++) {
            jest.advanceTimersByTime(JUMP_QUIET_MS - 1);
            expect(follow.moved()).toBe('part-0');
        }

        expect(ended).not.toHaveBeenCalled();
    });

    it('ends once the page has been still for the quiet time', () => {
        follow.start('part-0');
        jest.advanceTimersByTime(300);
        follow.moved();

        jest.advanceTimersByTime(JUMP_QUIET_MS - 1);
        expect(follow.target).toBe('part-0');

        jest.advanceTimersByTime(1);
        expect(follow.target).toBeNull();
        expect(follow.moved()).toBeNull();
        expect(ended).toHaveBeenCalledTimes(1);
    });

    it('ends at once when the reader takes over', () => {
        follow.start('inputs');
        follow.end();

        expect(follow.target).toBeNull();
        expect(ended).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(JUMP_QUIET_MS);
        expect(ended).toHaveBeenCalledTimes(1);
    });

    it('says nothing when there is no jump to end', () => {
        follow.end();

        expect(ended).not.toHaveBeenCalled();
    });

    it('takes over from a jump still going on, with a quiet time of its own', () => {
        follow.start('inputs');
        jest.advanceTimersByTime(JUMP_QUIET_MS - 1);
        follow.start('outputs');

        jest.advanceTimersByTime(JUMP_QUIET_MS - 1);
        expect(follow.target).toBe('outputs');
        expect(ended).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(ended).toHaveBeenCalledTimes(1);
    });

    it('waits as long as it is told to', () => {
        const short = new JumpFollow(ended, 50);

        short.start('usage');
        jest.advanceTimersByTime(50);

        expect(short.target).toBeNull();
    });
});
