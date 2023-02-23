const fs = require('fs');
const path = require('path');
const { print } = require('graphql');
const { GraphQLList, GraphQLNonNull, GraphQLInputObjectType } = require('graphql/type');
const { findUsageInputs } = require('./input');
const { getVariablesFields } = require('./variables');
const { getResultsFields } = require('./results');
const { findScalars } = require('./scalar');
const { renderType, renderQuery, renderSdk, renderScalars, renderEnum } = require('./render');
const { findUsageEnums } = require('./enums');
const { findUsageFragments } = require('./fragments');

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const helpers = fs.readFileSync(path.join(__dirname, 'helpers.ts'), 'utf-8');
module.exports = {
  plugin(schema, documents, config) {
    try {
      const functions = [];
      const queries = [];
      const fragments = findUsageFragments(documents, schema);
      const types = [...fragments];
      const scalars = findScalars(schema);

      for (let { document } of documents) {
        const inputs = findUsageInputs(document, schema);
        types.push(...inputs);

        for (const definition of document.definitions) {
          if (definition.kind !== 'OperationDefinition') {
            continue;
          }
          const name = definition.name.value;

          const results = {
            name: capitalize(`${name}Results`),
            fields: getResultsFields(definition, schema, document),
          };
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
            chain: [],
          });
        }

        //   if (definition.selectionSet.selections.length === 1) {
        //     if (!['query', 'mutation'].includes(definition.operation)) {
        //       continue;
        //     }
        //     const selection = definition.selectionSet.selections[0];
        //     const directives = selection.directives.map(d => d.name.value);
        //     const propertyName = selection.name.value;
        //     func += `.then(unpackSingleResults("${propertyName}"))\n`;
        //     for (let directive of directives) {
        //       if (directive === 'nonNullable' || directive === 'firstOrFail') {
        //         func += `.then(${directive}({variables, query: ${name}RawQuery}))\n`;
        //       } else {
        //         func += `.then(${directive})\n`;
        //       }
        //     }
        //   }
        //   functions[name] = func;
        // }
      }

      const enums = findUsageEnums(types, schema);
      return [
        helpers,
        renderScalars(scalars),
        ...enums.map(e => renderEnum(e)),
        ...types.map(t => renderType(t)),
        ...queries.map(q => renderQuery(q)),
        renderSdk(functions),
      ].join('\n');
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  },
  addToSchema: /* GraphQL */ `
    directive @first on OBJECT
    directive @firstOrFail on OBJECT
    directive @nonNullable on OBJECT
  `,
};
