/** A handle to a toast that is on screen. */
export class ToastRef {
    private open = true;

    /** Closes the toast before its duration is over. */
    dismiss(): void {
        this.open = false;
    }
}
