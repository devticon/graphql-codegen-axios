import { FragmentDefinitionNode } from 'graphql/language/ast';
import { CodegenDocuments } from './_types';
import { Kind } from 'graphql/language';

export const findUsageFragments = (documents: CodegenDocuments) => {
  const fragments: FragmentDefinitionNode[] = [];
  for (let { document } of documents) {
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.push(definition);
      }
    }
  }
  return fragments;
};
