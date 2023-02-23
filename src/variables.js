const { findInputInSchema } = require('./input');
const getVariablesFields = (definition, schema) => {
  return definition.variableDefinitions.map(variable => ({
    name: variable.variable.name.value,
    ...getVariableType(variable.type, schema),
    fields: [],
  }));
};

const getVariableType = (type, schema, isList = false, isNullable = true) => {
  if (type.kind === 'ListType') {
    isList = true;
    return getVariableType(type.type, schema, isList, isNullable);
  }
  if (type.kind === 'NonNullType') {
    isNullable = false;
    return getVariableType(type.type, schema, isList, isNullable);
  }
  const typeName = type.name.value;
  const isScalar = !findInputInSchema(typeName, schema);
  return { type: type.type, isList, isNullable, typeName, isScalar };
};

module.exports = { getVariablesFields };
