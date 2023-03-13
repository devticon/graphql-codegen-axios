export default {
  schema: 'schema.graphql',
  config: {
    scalars: {
      bigint: 'number',
      jsonb: 'any',
      timestamptz: 'Date | string',
      timestamp: 'Date | string',
    },
    emitDirectives: true,
    suffix: {
      input: 'Input',
      fragment: 'Fragment',
    },
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
