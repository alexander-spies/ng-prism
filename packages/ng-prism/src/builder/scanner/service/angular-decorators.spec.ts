import path from 'node:path';
import ts from 'typescript';
import { findDecorator, getDecoratorArgument } from '../ast-utils.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { classifyShowcaseClass, findAngularCoreDecorator, readProvision } from './angular-decorators.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'services');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

/** The classes an entry file exports, by name, with the checker that resolves their decorators. */
function loadClasses(entry: string) {
    const entryFile = path.join(FIXTURES_DIR, entry);
    const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture/toast' }], compilerOptions);
    const checker = result.program.getTypeChecker();
    const classes = new Map(
        result.entries[0].exports.flatMap((sym) => {
            const decl = (sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym).declarations?.find(ts.isClassDeclaration);

            return decl ? [[sym.name, decl] as const] : [];
        })
    );

    function classOf(name: string): ts.ClassDeclaration {
        const decl = classes.get(name);

        if (!decl) throw new Error(`fixture class ${name} is not exported`);
        return decl;
    }

    function classify(name: string) {
        const decl = classOf(name);
        const showcase = findDecorator(decl, 'Showcase');

        return classifyShowcaseClass(decl, showcase && getDecoratorArgument(showcase), checker);
    }

    function provision(name: string) {
        const kind = classify(name);

        if (kind.kind !== 'service') throw new Error(`${name} is not a service`);
        return readProvision(kind.decorator, checker);
    }

    return { checker, classOf, classify, provision };
}

describe('angular-decorators', () => {
    let checker: ts.TypeChecker;
    let classOf: ReturnType<typeof loadClasses>['classOf'];
    let classify: ReturnType<typeof loadClasses>['classify'];
    let provision: ReturnType<typeof loadClasses>['provision'];

    beforeAll(() => {
        ({ checker, classOf, classify, provision } = loadClasses('services-api.ts'));
    });

    describe('findAngularCoreDecorator', () => {
        it('finds a decorator imported from @angular/core', () => {
            expect(findAngularCoreDecorator(classOf('AutoService'), 'Service', checker)).toBeDefined();
            expect(findAngularCoreDecorator(classOf('RootService'), 'Injectable', checker)).toBeDefined();
            expect(findAngularCoreDecorator(classOf('SetupOnComponent'), 'Component', checker)).toBeDefined();
        });

        it('ignores a decorator of the same name from another module', () => {
            expect(findAngularCoreDecorator(classOf('TypeDiService'), 'Service', checker)).toBeUndefined();
        });

        it('ignores a decorator the class does not carry', () => {
            expect(findAngularCoreDecorator(classOf('AutoService'), 'Injectable', checker)).toBeUndefined();
        });
    });

    describe('classifyShowcaseClass', () => {
        it('classifies @Service() and @Injectable() classes as services', () => {
            for (const name of ['AutoService', 'RootService', 'ManualService']) {
                expect(classify(name)).toMatchObject({ kind: 'service' });
            }
        });

        it('keeps a @Service decorator from another package a component', () => {
            expect(classify('TypeDiService')).toEqual({ kind: 'component' });
        });

        it('keeps a component a component', () => {
            expect(classify('SetupOnComponent')).toEqual({ kind: 'component' });
        });

        it('keeps a service with component-only fields a component', () => {
            expect(classify('LegacyPageService')).toEqual({ kind: 'legacy-component', fields: ['renderPage'] });
        });
    });

    describe('readProvision', () => {
        it('reads the provision', () => {
            expect(provision('AutoService')).toBe('auto');
            expect(provision('OptOutService')).toBe('manual');
            expect(provision('RootService')).toBe('auto');
            expect(provision('PlatformService')).toBe('auto');
            expect(provision('ManualService')).toBe('manual');
            expect(provision('DynamicService')).toBe('manual');
        });
    });
});

describe('angular-decorators edge cases', () => {
    let checker: ts.TypeChecker;
    let classOf: ReturnType<typeof loadClasses>['classOf'];
    let classify: ReturnType<typeof loadClasses>['classify'];
    let provision: ReturnType<typeof loadClasses>['provision'];

    beforeAll(() => {
        ({ checker, classOf, classify, provision } = loadClasses('edge-cases.services.ts'));
    });

    it('finds the component-only fields in the literal, in a spread and in a field it cannot read', () => {
        expect(classify('SpreadFieldService')).toEqual({ kind: 'legacy-component', fields: ['variants'] });
        expect(classify('LiteralFieldsService')).toEqual({ kind: 'legacy-component', fields: ['variants', 'bg'] });
        expect(classify('UnreadableFieldService')).toEqual({ kind: 'legacy-component', fields: ['bg'] });
    });

    it('classifies a service whose @Showcase has no component-only field, with or without a literal', () => {
        expect(classify('BareShowcaseService')).toMatchObject({ kind: 'service' });
        expect(classify('ConstantProvidedService')).toMatchObject({ kind: 'service' });
    });

    it('keeps a class with @Directive a component, whatever else it carries', () => {
        expect(classify('DirectiveService')).toEqual({ kind: 'component' });
    });

    it("does not take Injectable imported as Service for Angular's Service", () => {
        expect(findAngularCoreDecorator(classOf('AliasedInjectableService'), 'Service', checker)).toBeUndefined();
    });

    it('reads a provision from constants, and treats what it cannot read as manual', () => {
        expect(provision('ConstantProvidedService')).toBe('auto');
        expect(provision('ModuleProvidedService')).toBe('manual');
        expect(provision('ConstantOptOutService')).toBe('manual');
        expect(provision('VariableOptOutService')).toBe('manual');
        expect(provision('FactoryService')).toBe('auto');
    });
});
