import { Injectable, Pipe, type PipeTransform } from '@angular/core';
import { Showcase } from './showcase.js';

let dynamicName = 'dynamic';
let dynamicPure = true;

dynamicName = dynamicName.trim();
dynamicPure = !dynamicPure;

const dynamicOptions = { name: dynamicName };

@Showcase({ title: 'Standalone' })
@Pipe({ name: 'standalone' })
export class StandalonePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Impure' })
@Pipe({ name: 'impure', pure: false })
export class ImpurePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'NgModule' })
@Pipe({ name: 'ngModule', standalone: false })
export class NgModulePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'NgModule page', renderPage: 'NgModulePage' })
@Pipe({ name: 'ngModulePage', standalone: false })
export class NgModulePagePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Legacy page', renderPage: 'LegacyPage' })
@Pipe({ name: 'legacyPage' })
export class LegacyPagePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Injectable' })
@Pipe({ name: 'injectable' })
@Injectable({ providedIn: 'root' })
export class InjectablePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Dynamic name' })
@Pipe({ name: dynamicName })
export class DynamicNamePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Dynamic purity' })
@Pipe({ name: 'dynamicPure', pure: dynamicPure })
export class DynamicPurePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

@Showcase({ title: 'Dynamic options' })
@Pipe(dynamicOptions)
export class DynamicOptionsPipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}
