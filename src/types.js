const {
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLObjectType,
} = require('graphql/type');
const getGraphqlTypeInfo = (type, isList = false, isNullable = true) => {
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

const getGraphqlType = type => {
  if (type instanceof GraphQLEnumType) {
    return 'enum';
  }
  if (type instanceof GraphQLInputObjectType) {
    return 'input';
  }
};
const assignDirectivesToType = (typeInfo, directives) => {
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
module.exports = { getGraphqlTypeInfo, assignDirectivesToType, getGraphqlType };
