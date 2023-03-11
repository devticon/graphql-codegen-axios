import { FieldNode, FragmentSpreadNode, OperationDefinitionNode } from 'graphql/language/ast';
import { Config } from './_types';

export const getFunctionChain = (operation: OperationDefinitionNode, useSingleResults: boolean) => {
  const chain: string[] = [];
  const selections = operation.selectionSet.selections.filter(s => 'name' in s) as (FieldNode | FragmentSpreadNode)[];
  for (let selection of selections) {
    const directives = selection.directives.map(d => d.name.value);
    const propertyName = selection.name.value;
    for (let directive of directives) {
      if (!['first', 'firstOrFail', 'nonNullable', 'singleResult'].includes(directive)) {
        continue;
      }
      if (directive === 'nonNullable' || directive === 'firstOrFail') {
        chain.push(`${directive}("${propertyName}", body)`);
      } else if (directive === 'first') {
        chain.push(`${directive}("${propertyName}")`);
      } else {
        chain.push(directive);
      }
    }
  }

  if (useSingleResults) {
    const propertyName = selections[0].name.value;
    chain.push(`unpackSingleResults("${propertyName}")`);
  }
  return chain;
};

export const isSingleResultOperation = (operation: OperationDefinitionNode, config: Config) => {
  if (config.autoSingleResult === undefined || config.autoSingleResult === true) {
    return operation.selectionSet.selections.length === 1;
  }
  return operation.directives.some(d => d.name.value === 'singleResult');
};
