import { Injectable, type Provider } from '@angular/core';
import { Showcase } from './showcase.js';

/** Configures {@link OwnFileService}. Declared next to the service: its file is the only one that mentions it. */
export function provideOwnFile(): Provider {
    return [];
}

@Showcase({ title: 'Own file', setup: () => [provideOwnFile] })
@Injectable({ providedIn: 'root' })
export class OwnFileService {}
