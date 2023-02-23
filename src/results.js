const { getGraphqlTypeInfo, assignDirectivesToType } = require('./types');
const { capitalize } = require('./utils');

const getResultType = (definition, schema, document, useSingleResults) => {
  const name = capitalize(`${definition.name.value}Results`);
  const fields = getResultsFields(definition, schema, document, useSingleResults);
  if (useSingleResults) {
    return {
      ...fields[0],
      name,
    };
  }
  return {
    name,
    fields,
  };
};
const getResultsFields = (definition, schema, document) => {
  const operationType = definition.operation;
  const name = schema[`_${operationType}Type`].name;
  const parent = schema._typeMap[name];
  const fields = definition.selectionSet.selections.map(field => getField(parent, field, schema, document));
  return fields;
};

const getField = (parent, field, schema, document) => {
  const name = field.name.value;
  const selections = field.selectionSet?.selections || [];
  const fragments = selections.filter(s => s.kind === 'FragmentSpread');
  let type = assignDirectivesToType(getGraphqlTypeInfo(parent._fields[name].type), field.directives);
  const union = fragments.map(f => f.name.value);
  const fields = selections.filter(s => s.kind !== 'FragmentSpread').map(f => getField(type.type, f, schema, document));

  return {
    name,
    ...type,
    fields,
    union,
    alias: field.alias?.value,
  };
};

module.exports = { getResultType, getField };
