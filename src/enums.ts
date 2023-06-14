import {
  assertEnumType,
  assertObjectType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  isEnumType,
} from 'graphql/type';
import { getNamedType } from 'graphql/type/definition';
import { FragmentDefinitionNode } from 'graphql/language/ast';
import { Kind } from 'graphql/language';
import { Operation } from './_types';

export const findUsageEnums = (
  inputs: GraphQLInputObjectType[],
  objects: GraphQLObjectType[],
  fragments: FragmentDefinitionNode[],
  operations: Operation[],
  schema: GraphQLSchema,
): GraphQLEnumType[] => {
  const enums = new Set<GraphQLEnumType>();
  for (let input of inputs) {
    for (let field of Object.values(input.getFields())) {
      if (isEnumType(getNamedType(field.type))) {
        enums.add(assertEnumType(getNamedType(field.type)));
      }
    }
  }
  for (let fragment of fragments) {
    const parent = assertObjectType(schema.getType(fragment.typeCondition.name.value));
    for (let selection of fragment.selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const parentField = parent.getFields()[selection.name.value];
        if (isEnumType(getNamedType(parentField.type))) {
          enums.add(assertEnumType(getNamedType(parentField.type)));
        }
      }
    }
  }
  for (let object of objects) {
    for (let value of Object.values(object.getFields())) {
      const type = getNamedType(value.type);
      if (isEnumType(type)) {
        enums.add(type);
      }
    }
  }
  for (let operation of operations) {
    if (operation.variables && operation.variables.kind === 'object')
      for (let field of operation.variables.fields) {
        if (field.kind === 'inLine') {
          const type = schema.getType(field.type);
          if (isEnumType(getNamedType(type))) {
            enums.add(assertEnumType(getNamedType(type)));
          }
        }
      }
  }

  return [...enums];
};
