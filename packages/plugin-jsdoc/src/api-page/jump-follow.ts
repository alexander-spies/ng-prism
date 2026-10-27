/** How long the page has to stay still, neither resized nor scrolled, before a jump lets go of its target. */
export const JUMP_QUIET_MS = 1000;

/**
 * A jump on the API page, from the scroll to its target until the reader takes
 * over or the page has stopped moving.
 *
 * The page still grows under a jump that starts right after a render, as the
 * one to `activePart` and every link opened cold do: a code block gets its
 * text a frame after it renders, and its highlighting once highlight.js has
 * loaded. While the jump lasts, the page puts its target back in place each
 * time it moves (`moved()`). The scroll of the jump does not end it: an
 * instant one, under reduced motion, is over a frame after it starts, long
 * before the blocks above the target have grown. What ends it is the reader
 * (`end()`, on a wheel, a touch, a key or a pointer) or a page that has been
 * still for `quietMs`.
 */
export class JumpFollow {
    private current: string | null = null;
    private timer?: ReturnType<typeof setTimeout>;

    /** `onEnd` runs once per jump, however it ends. */
    constructor(
        private readonly onEnd: () => void,
        private readonly quietMs = JUMP_QUIET_MS
    ) {}

    /** The anchor the jump keeps in place, `null` when no jump is on. */
    get target(): string | null {
        return this.current;
    }

    /** A jump to `target` starts, and takes over from one still going on. */
    start(target: string): void {
        this.current = target;
        this.waitForQuiet();
    }

    /**
     * The page moved under the jump, resized or scrolled: the jump goes on, and
     * the quiet time starts over. Returns the target to keep in place, `null`
     * when no jump is on.
     */
    moved(): string | null {
        if (this.current !== null) this.waitForQuiet();

        return this.current;
    }

    /** The jump is over: the reader took over, or the page shows something else. */
    end(): void {
        if (this.current === null) return;

        this.current = null;
        clearTimeout(this.timer);
        this.onEnd();
    }

    private waitForQuiet(): void {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.end(), this.quietMs);
    }
}
