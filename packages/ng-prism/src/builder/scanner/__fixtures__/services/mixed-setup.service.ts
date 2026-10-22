import { Injectable } from '@angular/core';
import { provideToast, TOAST_LABELS } from './provide-toast.js';
import { Showcase } from './showcase.js';

const SOME_STRING = 'not a function';

function localProvide() {
    return [];
}

/** Valid entries next to broken ones: only the broken ones are dropped. Not part of `services-api.ts`. */
@Showcase({ title: 'Mixed setup', setup: () => [provideToast, localProvide, SOME_STRING, TOAST_LABELS] })
@Injectable({ providedIn: 'root' })
export class MixedSetupService {}
