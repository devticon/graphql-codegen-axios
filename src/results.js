const { getGraphqlTypeInfo } = require('./types');
const getResultsFields = (definition, schema, document) => {
  const operationType = definition.operation.charAt(0).toUpperCase() + definition.operation.slice(1);
  const parent = schema._typeMap[operationType];
  return definition.selectionSet.selections.map(field => getField(parent, field, schema, document));
};

const getField = (parent, field, schema, document) => {
  const name = field.name.value;
  const selections = field.selectionSet?.selections || [];
  const fragments = selections.filter(s => s.kind === 'FragmentSpread');
  let type = getGraphqlTypeInfo(parent._fields[name].type);
  const union = fragments.map(f => f.name.value);
  const fields = selections.filter(s => s.kind !== 'FragmentSpread').map(f => getField(type.type, f, schema, document));

  //
  // const fields = [];
  // for (let selection of selections) {
  //   const isFragment = selection.kind === 'FragmentSpread';
  //   if (isFragment) {
  //     fields.push({ typeName: selection.name.value, isScalar: false, isList: false, isNullable: false, fields: [] });
  //   } else {
  //     fields.push(getField(type.type, selection, schema, document));
  //   }
  // }
  return {
    name,
    ...type,
    fields,
    union,
  };
};

module.exports = { getResultsFields };
