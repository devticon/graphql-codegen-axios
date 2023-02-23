const { GraphQLInputObjectType, GraphQLNonNull, GraphQLList } = require('graphql/type');
const { getGraphqlTypeInfo } = require('./types');
const findUsageInputs = (documents, schema) => {
  const inputs = [];
  for (let { document } of documents) {
    for (let definition of document.definitions) {
      if (definition.kind !== 'OperationDefinition') {
        continue;
      }
      for (const variableDefinition of definition.variableDefinitions) {
        const type = unpackVariableType(variableDefinition.type);
        const name = type.name.value;
        const input = findInputInSchema(name, schema);
        if (input && !inputs.includes(input)) {
          inputs.push(input);
          inputs.push(...findInputDependencies(input, schema, inputs));
        }
      }
    }
  }
  return [...new Set(inputs)].map(input => ({
    name: input.name,
    fields: getInputFields(input),
  }));
};
const findInputInSchema = (name, schema) => {
  const type = schema._typeMap[name];
  if (type instanceof GraphQLInputObjectType) {
    return type;
  }
};
const findInputDependencies = (input, schema, ignore) => {
  const dependencies = [];
  for (let field of Object.values(input._fields)) {
    const type = unpackInputType(field.type);
    if (type instanceof GraphQLInputObjectType && !ignore.includes(type)) {
      dependencies.push(type);
      dependencies.push(...findInputDependencies(type, schema, [...ignore, ...dependencies]));
    }
  }
  return dependencies;
};

const getInputFields = input => {
  return Object.values(input._fields).map(field => {
    const typeInfo = getGraphqlTypeInfo(field.type);
    return {
      name: field.name,
      fields: [],
      ...typeInfo,
      inLine: !typeInfo.isScalar,
    };
  });
};

const unpackInputType = type => {
  if (type instanceof GraphQLNonNull) {
    return unpackInputType(type.ofType);
  }
  if (type instanceof GraphQLList) {
    return unpackInputType(type.ofType);
  }
  return type;
};

const unpackVariableType = type => {
  if (type.kind === 'ListType') {
    return unpackVariableType(type.type);
  }
  if (type.kind === 'NonNullType') {
    return unpackVariableType(type.type);
  }
  return type;
};

module.exports = { findUsageInputs, findInputInSchema };
