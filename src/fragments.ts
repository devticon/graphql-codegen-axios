import { FieldNode, FragmentSpreadNode } from 'graphql/language/ast';
import { GraphQLObjectType, GraphQLSchema } from 'graphql/type';
import { getField } from './results';
import { CodegenDocuments, ObjectType } from './_types';
import { Kind } from 'graphql/language';

export const findUsageFragments = (documents: CodegenDocuments, schema: GraphQLSchema): ObjectType[] => {
  const fragments: ObjectType[] = [];
  for (let { document } of documents) {
    for (const definition of document.definitions) {
      if (definition.kind === 'FragmentDefinition') {
        const name = definition.name.value;
        const parentName = definition.typeCondition.name.value;
        const parent = findObjectTypeInSchema(schema, parentName);
        const nestedFragments = definition.selectionSet.selections.filter(
          s => s.kind === 'FragmentSpread',
        ) as FragmentSpreadNode[];
        const fields = definition.selectionSet.selections.filter(s => s.kind === Kind.FRAGMENT_SPREAD) as FieldNode[];
        const union = nestedFragments.map(f => f.name.value);

        fragments.push({
          name,
          type: definition,
          union,
          fields: fields.map(f => getField(parent, f, schema)),
          gqlType: 'fragment',
        });
      }
    }
  }
  return fragments;
};

const findObjectTypeInSchema = (schema: GraphQLSchema, name: string) => {
  const type = schema.getType(name);
  if (type instanceof GraphQLObjectType) {
    return type;
  }
};
