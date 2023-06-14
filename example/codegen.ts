export default {
  schema: 'schema.graphql',
  config: {
    scalars: {
      bigint: 'number',
      jsonb: 'any',
      timestamptz: 'Date | string',
      timestamp: 'Date | string',
    },
    nullableValue: 'T | undefined | null',
    suffix: {
      fragment: 'Fragment',
    },
    hasura: {
      enabled: false,
      path: 'hasura',
    },
    emitDirectives: true,
  },
  generates: {
    './src/generated.ts': {
      documents: 'graphql/*.graphql',
      plugins: ['@devticon-os/graphql-codegen-axios'],
    },
  },
  pluginLoader: async name => {
    return require('../lib/index.js');
  },
};
