const { GraphQLScalarType } = require('graphql/type');
const findScalars = schema => {
  return Object.values(schema._typeMap).filter(t => t instanceof GraphQLScalarType);
};

module.exports = { findScalars };
