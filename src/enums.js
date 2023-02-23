const { GraphQLEnumType } = require('graphql/type');
const findUsageEnums = (types, schema) => {
  const enums = [];
  for (let type of types) {
    enums.push(...findEnumInType(type, schema, enums));
  }

  return enums.map(e => ({
    name: e.name,
    values: e._values.map(({ name, value }) => ({ name, value })),
  }));
};

const findEnumInType = (type, schema, ignore) => {
  const enums = [];
  for (let field of type.fields) {
    const type = schema._typeMap[field.typeName];
    if (type instanceof GraphQLEnumType && !ignore.includes(type)) {
      enums.push(type);
    }
  }
  return enums;
};
module.exports = { findUsageEnums };
