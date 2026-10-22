import type { ApiMethod, ScannedPipe } from '@ng-prism/core/plugin';
import { importLines, joinUsageBlocks, setupBlock, setupImports } from './service-usage.js';

/**
 * The snippet that shows how to use a pipe: the imports, the `providers`
 * entries its setup asks for, the component's `imports` entry and a template
 * line. Imports and setup are written as for a service.
 *
 * Like the service snippet it is generated and says nothing about values: the
 * template line names the piped value `value` and each argument by its
 * parameter name. It shows the first signature that is not `@deprecated`, the
 * way a new template should call the pipe, or the first one when all are.
 */
export function generatePipeUsage(pipe: ScannedPipe): string {
    const { className, pipeName, api } = pipe;
    const signature = api.transform.find((method) => !method.tags.deprecated) ?? api.transform[0];

    return joinUsageBlocks([
        importLines(pipe, setupImports(api.setup)),
        setupBlock(api.setup),
        ['// in the component that uses it', `@Component({ imports: [${className}], … })`],
        ['// in its template', `{{ value | ${pipeName}${pipeArguments(signature)} }}`]
    ]);
}

/**
 * The arguments of the template line, from a signature's parameters after the
 * piped value: `: pattern` for each one the call has to pass. Pipe arguments
 * are positional, so what can be left out is the optional and rest parameters
 * at the end; one with a default that a required parameter follows stays in.
 */
function pipeArguments(signature: ApiMethod | undefined): string {
    const params = signature?.params.slice(1) ?? [];
    const lastRequired = params.map((param) => !param.optional && !param.rest).lastIndexOf(true);

    return params
        .slice(0, lastRequired + 1)
        .map((param) => `: ${param.name}`)
        .join('');
}
