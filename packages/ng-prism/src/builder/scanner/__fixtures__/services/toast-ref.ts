/** A handle to a toast that is on screen. */
export class ToastRef {
    private open = true;

    /**
     * @param id Identifies the toast on screen.
     */
    constructor(
        readonly id = 'toast',
        private readonly host?: unknown
    ) {}

    /** Closes the toast before its duration is over. */
    dismiss(): void {
        this.open = false;
    }
}
