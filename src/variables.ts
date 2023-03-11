import { findInputInSchema } from './input';
import { findEnumInSchema } from './enums';
import { OperationDefinitionNode, TypeNode } from 'graphql/language/ast';
import { GraphQLSchema } from 'graphql/type';
import { Kind } from 'graphql/language';
import { ObjectTypeField } from './_types';

export const getVariablesFields = (definition: OperationDefinitionNode, schema: GraphQLSchema): ObjectTypeField[] => {
  return definition.variableDefinitions.map(variable => ({
    name: variable.variable.name.value,
    alias: variable.variable.name.value,
    union: [],
    ...getVariableType(variable.type, schema),
    fields: [],
  }));
};

const getVariableType = (
  type: TypeNode,
  schema: GraphQLSchema,
  isList = false,
  isNullable = true,
): Omit<ObjectTypeField, 'name' | 'alias' | 'fields' | 'union'> => {
  if (type.kind === Kind.LIST_TYPE) {
    isList = true;
    return getVariableType(type.type, schema, isList, isNullable);
  }
  if (type.kind === Kind.NON_NULL_TYPE) {
    isNullable = false;
    return getVariableType(type.type, schema, isList, isNullable);
  }
  const typeName = type.name.value;
  const isScalar = !findInputInSchema(typeName, schema) && !findEnumInSchema(typeName, schema);
  return {
    isList,
    isNullable,
    typeName,
    isScalar,
    inLine: !isScalar,
    gqlType: isScalar ? 'scalar' : 'input',
  };
};
