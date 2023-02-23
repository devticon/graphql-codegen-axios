const { GraphQLList, GraphQLNonNull, GraphQLScalarType } = require('graphql/type');
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
  return { type, isList, isNullable, typeName: type.name, isScalar };
};

module.exports = { getGraphqlTypeInfo };
