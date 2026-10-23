import { importKey, localName, ManifestImports } from './manifest-imports.js';

describe('ManifestImports', () => {
    it('imports a class under its own name', () => {
        const imports = new ManifestImports([]);

        expect(imports.local('lib', 'IconComponent')).toBe('IconComponent');
        expect(imports.lines()).toEqual(["import { IconComponent } from 'lib';"]);
    });

    it('gives a class from the same module the identifier it already has', () => {
        const imports = new ManifestImports([]);

        imports.keep('lib', 'IconComponent');

        expect(imports.local('lib', 'IconComponent')).toBe('IconComponent');
        expect(imports.lines()).toEqual(["import { IconComponent } from 'lib';"]);
    });

    it('imports a class of the same name from another module under an alias', () => {
        const imports = new ManifestImports([]);

        imports.local('a', 'Icon');

        expect(imports.local('b', 'Icon')).toBe('Icon__2');
        expect(imports.lines()).toEqual(["import { Icon } from 'a';", "import { Icon as Icon__2 } from 'b';"]);
    });

    it('numbers the aliases and keeps the alias of a class it was asked for twice', () => {
        const imports = new ManifestImports([]);

        imports.local('a', 'Icon');

        expect(imports.local('b', 'Icon')).toBe('Icon__2');
        expect(imports.local('c', 'Icon')).toBe('Icon__3');
        expect(imports.local('b', 'Icon')).toBe('Icon__2');
    });

    it('does not take an alias that a class of that name has', () => {
        const imports = new ManifestImports([]);

        imports.keep('a', 'Icon__2');

        expect(imports.local('b', 'Icon__2')).toBe('Icon__2__2');
    });

    it('does not give a reserved identifier to a class', () => {
        expect(new ManifestImports(['input']).local('lib', 'input')).toBe('input__2');
    });

    it('does not rename a class it keeps', () => {
        const imports = new ManifestImports([]);

        imports.local('a', 'Icon');
        imports.keep('b', 'Icon');

        expect(imports.names().size).toBe(0);
        expect(imports.lines()).toEqual(["import { Icon } from 'a';", "import { Icon } from 'b';"]);
    });

    it('lists the identifiers that differ from the name by module and name', () => {
        const imports = new ManifestImports([]);

        imports.local('a', 'Icon');
        imports.local('b', 'Icon');
        const names = imports.names();

        expect([...names]).toEqual([['b#Icon', 'Icon__2']]);
        expect(localName(names, 'b', 'Icon')).toBe('Icon__2');
        expect(localName(names, 'a', 'Icon')).toBe('Icon');
        expect(importKey('b', 'Icon')).toBe('b#Icon');
    });

    it('imports the classes of a module in one statement, in the order they were used', () => {
        const imports = new ManifestImports([]);

        imports.keep('a', 'One');
        imports.keep('b', 'Two');
        imports.local('a', 'Three');

        expect(imports.lines()).toEqual(["import { One, Three } from 'a';", "import { Two } from 'b';"]);
    });
});
