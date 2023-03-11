import { assignDirectivesToType, getGraphqlTypeInfo } from './types';

import { capitalize } from './utils';
import {
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql/language/ast';
import { GraphQLObjectType, GraphQLSchema } from 'graphql/type';
import { ObjectType, ObjectTypeField } from './_types';
import { Kind } from 'graphql/language/kinds';

export const getResultType = (
  definition: OperationDefinitionNode,
  schema: GraphQLSchema,
  document: DocumentNode,
  useSingleResults: boolean,
): ObjectType => {
  const name = capitalize(`${definition.name.value}Results`);
  const fields = getResultsFields(definition, schema);
  if (useSingleResults) {
    return {
      ...fields[0],
      name,
    };
  }
  return {
    name,
    fields,
    union: [],
    gqlType: 'type',
  };
};
export const getResultsFields = (definition: OperationDefinitionNode, schema: GraphQLSchema) => {
  let parent: GraphQLObjectType;
  switch (definition.operation) {
    case OperationTypeNode.MUTATION:
      parent = schema.getMutationType();
      break;
    case OperationTypeNode.QUERY:
      parent = schema.getQueryType();
      break;
    default:
      throw new Error(`unsupported operation type ${definition.operation}`);
  }
  const fields = definition.selectionSet.selections
    .filter(s => s.kind === Kind.FIELD)
    .map((selection: FieldNode) => getField(parent, selection, schema));
  return fields;
};

export const getField = (parent: GraphQLObjectType, field: FieldNode, schema: GraphQLSchema): ObjectTypeField => {
  const name = field.name.value;
  const selections = field.selectionSet?.selections || [];
  const fragments = selections.filter(s => s.kind === Kind.FRAGMENT_SPREAD) as FragmentSpreadNode[];
  const fields = selections
    .filter(s => s.kind === Kind.FIELD)
    .map((f: FieldNode) => getField(type.type as GraphQLObjectType, f, schema));

  let type = assignDirectivesToType(getGraphqlTypeInfo(parent.getFields()[name].type), field.directives);
  const union = fragments.map(f => f.name.value);

  return {
    name,
    ...type,
    fields,
    union,
    alias: field.alias?.value,
    inLine: false,
  };
};
