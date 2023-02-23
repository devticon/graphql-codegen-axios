const { GraphQLObjectType } = require('graphql/type');
const { getGraphqlTypeInfo } = require('./types');
const findUsageFragments = (documents, schema) => {
  const fragments = [];
  for (let { document } of documents) {
    for (const definition of document.definitions) {
      if (definition.kind === 'FragmentDefinition') {
        const parentName = definition.typeCondition.name.value;
        const parent = findObjectTypeInSchema(schema, parentName);
        fragments.push({
          name: definition.name.value,
          type: definition,
          fields: definition.selectionSet.selections.map(f => {
            const selections = f.selectionSet?.selections || [];
            const fragments = selections.filter(s => s.kind === 'FragmentSpread');
            const union = fragments.map(f => f.name.value);
            const parentField = parent._fields[f.name.value];
            const typeInfo = getGraphqlTypeInfo(parentField.type);
            return {
              name: f.name.value,
              ...typeInfo,
              fields: [],
              typeName: union.length ? '{}' : typeInfo.typeName,
              union,
            };
          }),
        });
      }
    }
  }
  return fragments;
};

const findObjectTypeInSchema = (schema, name) => {
  const type = schema._typeMap[name];
  if (type instanceof GraphQLObjectType) {
    return type;
  }
};
module.exports = { findUsageFragments };
