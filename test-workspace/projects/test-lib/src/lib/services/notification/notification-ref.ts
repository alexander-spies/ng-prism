/** Handle to one open notification, returned by `NotificationService.show()`. */
export class NotificationRef {
    constructor(
        readonly id: number,
        private readonly onDismiss: (id: number) => void
    ) {}

    /** Closes the notification. Does nothing once it is closed. */
    dismiss(): void {
        this.onDismiss(this.id);
    }
}
