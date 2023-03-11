import { GraphQLEnumType, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLScalarType } from 'graphql/type';
import { GraphQLInputType, GraphQLOutputType, GraphQLType } from 'graphql/type/definition';
import { ObjectTypeField } from './_types';
import { DirectiveNode } from 'graphql/language/ast';

export const getGraphqlTypeInfo = (
  type: GraphQLType,
  isList = false,
  isNullable = true,
): Omit<ObjectTypeField, 'name' | 'alias' | 'union' | 'inLine' | 'fields'> => {
  if (type instanceof GraphQLList) {
    isList = true;
    return getGraphqlTypeInfo(type.ofType, isList, isNullable);
  }
  if (type instanceof GraphQLNonNull) {
    isNullable = false;
    return getGraphqlTypeInfo(type.ofType, isList, isNullable);
  }
  const isScalar = type instanceof GraphQLScalarType;
  return { type, isList, isNullable, typeName: type.name, isScalar, gqlType: getGraphqlType(type) };
};

const getGraphqlType = (type: GraphQLOutputType | GraphQLInputType) => {
  if (type instanceof GraphQLEnumType) {
    return 'enum';
  }
  if (type instanceof GraphQLInputObjectType) {
    return 'input';
  }
};
export const assignDirectivesToType = (
  typeInfo: Omit<ObjectTypeField, 'name' | 'alias' | 'union' | 'inLine' | 'fields'>,
  directives: readonly DirectiveNode[],
) => {
  const newType = { ...typeInfo };
  for (let directive of directives) {
    switch (directive.name.value) {
      case 'firstOrFail':
        newType.isList = false;
        newType.isNullable = false;
        break;
      case 'first':
        newType.isList = false;
        newType.isNullable = true;
        break;
      case 'nonNullable':
        newType.isNullable = false;
        break;
    }
  }
  return newType;
};
