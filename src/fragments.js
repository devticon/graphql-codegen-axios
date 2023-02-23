const { GraphQLObjectType } = require('graphql/type');
const { getGraphqlTypeInfo } = require('./types');
const { getField } = require('./results');
const findUsageFragments = (documents, schema) => {
  const fragments = [];
  for (let { document } of documents) {
    for (const definition of document.definitions) {
      if (definition.kind === 'FragmentDefinition') {
        const name = definition.name.value;
        const parentName = definition.typeCondition.name.value;
        const parent = findObjectTypeInSchema(schema, parentName);
        const nestedFragments = definition.selectionSet.selections.filter(s => s.kind === 'FragmentSpread');
        const fields = definition.selectionSet.selections.filter(s => s.kind !== 'FragmentSpread');
        const union = nestedFragments.map(f => f.name.value);

        fragments.push({
          name,
          type: definition,
          union,
          fields: fields.map(f => getField(parent, f, schema)),
          gqlType: 'fragment',
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
