import { Injectable } from '@angular/core';
import { provideToast, TOAST_LABELS } from './provide-toast.js';
import { Showcase } from './showcase.js';

@Showcase({ title: 'Toast Service', category: 'Feedback', setup: () => [provideToast, TOAST_LABELS] })
@Injectable({ providedIn: 'root' })
export class ToastService {}
