import { Injectable } from '@angular/core';
import { provideToast } from './provide-toast.js';
import { Showcase } from './showcase.js';

const SOME_STRING = 'not a function';

function localProvide() {
    return [];
}

@Showcase({ title: 'Not an arrow', setup: [provideToast] })
@Injectable({ providedIn: 'root' })
export class NotArrowService {}

@Showcase({ title: 'Unexported', setup: () => [localProvide] })
@Injectable({ providedIn: 'root' })
export class UnexportedService {}

@Showcase({ title: 'Not a function', setup: () => [SOME_STRING] })
@Injectable({ providedIn: 'root' })
export class NotAFunctionService {}

@Showcase({
    title: 'Block body',
    setup: () => {
        return [provideToast];
    }
})
@Injectable({ providedIn: 'root' })
export class BlockBodyService {}
