const fs = require('fs');
const path = require('path');
const { print } = require('graphql');

const getType = (name, operationType, type) => {
  name = name.charAt(0).toUpperCase() + name.slice(1);
  operationType = operationType.charAt(0).toUpperCase() + operationType.slice(1);
  switch (type) {
    case 'variables':
      return `${name}${operationType}Variables`;
    case 'results':
      return `${name}${operationType}`;
  }
};

const functionsToString = functions => {
  let str = '{';
  for (let [name, body] of Object.entries(functions)) {
    str += `${name}: ${body},\n`;
  }
  str += '}';
  return str;
};

const getUsedFragments = (raw, allFragments, results = []) => {
  const fragments = [...raw.matchAll(/\.\.\.(\w*)$/gm)]
    .map(([_, name]) => name)
    .map(name => allFragments.find(d => d.name.value === name));

  for (let fragment of fragments) {
    getUsedFragments(print(fragment), allFragments, results);
  }
  results.push(...fragments);
  return results;
};

const printOperation = (ast, allFragments) => {
  ast.directives = ast.directives.filter(d => !['first', 'firstOrFail'].includes(d.name.value));
  const raw = print(ast).replace('@firstOrFail', '').replace('@first', '').replace('@nonNullable', '');

  let fragments = getUsedFragments(raw, allFragments);
  fragments = [...new Set(fragments)].map(f => print(f));

  return fragments.join('\n') + '\n' + raw;
};

const helpers = fs.readFileSync(path.join(__dirname, 'helpers.ts'), 'utf-8');

module.exports = {
  plugin(schema, documents, config) {
    const functions = {};
    const queries = [];
    const fragments = [];

    for (let { document } of documents) {
      for (const definition of document.definitions) {
        if (definition.kind === 'FragmentDefinition') {
          fragments.push(definition);
        }
      }
    }

    for (let { document } of documents) {
      for (const definition of document.definitions) {
        const name = definition.name.value;

        if (definition.kind !== 'OperationDefinition') {
          continue;
        }
        const variablesType = getType(name, definition.operation, 'variables');
        const resultsType = getType(name, definition.operation, 'results');

        queries.push(`const ${name}RawQuery = \`${printOperation(definition, fragments)}\`;`);
        let func = `(variables: ${variablesType}, config?: AxiosRequestConfig) => client.post<GraphqlResponse<${resultsType}>>("", {variables, query: ${name}RawQuery}, config).then(handleResponse)`;

        if (definition.selectionSet.selections.length === 1) {
          if (!['query', 'mutation'].includes(definition.operation)) {
            continue;
          }
          const selection = definition.selectionSet.selections[0];
          const directives = selection.directives.map(d => d.name.value);
          const propertyName = selection.name.value;
          func += `.then(unpackSingleResults("${propertyName}"))\n`;
          for (let directive of directives) {
            func += `.then(${directive})\n`;
          }
        }
        functions[name] = func;
      }
    }

    const sdk = `export const getSdk = (client: AxiosInstance) => (${functionsToString(functions)})`;
    return [...queries, helpers, sdk].join('\n');
  },
  addToSchema: /* GraphQL */ `
    directive @first on OBJECT
    directive @firstOrFail on OBJECT
    directive @nonNullable on OBJECT
  `,
};
