const { GraphQLEnumType } = require('graphql/type');
const findUsageEnums = (types, schema) => {
  const enums = [];
  for (let type of types) {
    for (let e of findEnumInType(type, schema, enums)) {
      if (!enums.includes(e)) {
        enums.push(e);
      }
    }
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

const findEnumInSchema = (name, schema) => {
  const type = schema._typeMap[name];
  if (type instanceof GraphQLEnumType) {
    return type;
  }
};
module.exports = { findUsageEnums, findEnumInSchema };
