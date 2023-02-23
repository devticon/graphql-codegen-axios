const fs = require('fs');
const path = require('path');
const { findUsageInputs } = require('./input');
const { getVariablesFields } = require('./variables');
const { getResultType } = require('./results');
const { findScalars } = require('./scalar');
const {
  renderType,
  renderQuery,
  renderSdk,
  renderScalars,
  renderEnum,
  renderHeader,
  renderFragment,
} = require('./render');
const { findUsageEnums } = require('./enums');
const { findUsageFragments } = require('./fragments');
const { getFunctionChain, isSingleResultOperation } = require('./functions');
const { capitalize } = require('./utils');

const helpers = fs.readFileSync(path.join(__dirname, 'helpers.ts'), 'utf-8');
const directives = ` directive @first on OBJECT
    directive @firstOrFail on OBJECT
    directive @singleResult on OBJECT
    directive @nonNullable on OBJECT`;
module.exports = {
  plugin(schema, documents, config) {
    try {
      fs.writeFileSync('directives.graphql', directives);
      const functions = [];
      const queries = [];
      const inputs = findUsageInputs(documents, schema);
      const fragments = findUsageFragments(documents, schema);
      const types = [];
      const scalars = findScalars(schema);

      for (let { document } of documents) {
        for (const definition of document.definitions) {
          if (definition.kind !== 'OperationDefinition') {
            continue;
          }
          const name = definition.name.value;
          const useSingleResults = isSingleResultOperation(definition, config);

          const results = getResultType(definition, schema, document, useSingleResults);
          types.push(results);

          const variables = {
            name: capitalize(`${name}Variables`),
            fields: getVariablesFields(definition, schema),
          };
          types.push(variables);

          queries.push({
            name,
            ast: definition,
            allFragments: fragments,
          });

          functions.push({
            name,
            results,
            variables,
            chain: getFunctionChain(definition, useSingleResults),
          });
        }
      }

      const enums = findUsageEnums([...types, ...inputs, ...fragments], schema);
      return [
        renderHeader('HELPERS'),
        helpers,
        renderHeader('Scalars'),
        renderScalars(scalars, config),
        renderHeader('Enum'),
        ...enums.map(e => renderEnum(e, config)),
        renderHeader('FRAGMENTS'),
        ...fragments.map(t => renderType(t, config)),
        ...fragments.map(f => renderFragment(f)),
        renderHeader('INPUTS'),
        ...inputs.map(t => renderType(t, config)),
        renderHeader('TYPES'),
        ...types.map(t => renderType(t, config)),
        renderHeader('QUERIES'),
        ...queries.map(q => renderQuery(q)),
        renderSdk(functions),
      ].join('\n');
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  },
  addToSchema: directives,
};
