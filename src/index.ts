import * as fs from 'fs';
import * as path from 'path';
import { findUsageInputs } from './input';
import { CodegenPlugin, Config } from './_types';
import {
  printCreateSdkFunction,
  printEnum,
  printFragmentGql,
  printFragmentType,
  printHelpers,
  printInput,
  printOperationTypes,
  printScalars,
} from './print';
import { findUsageEnums } from './enums';
import { findUsageFragments } from './fragments';
import { findUsageOperation, pluginDirectives } from './operation';
import { findScalars } from './scalar';
import { runPrettierIfExists } from './prettier';
import { printSchema } from 'graphql/utilities';

const configDefaults: Partial<Config> = {
  autoSingleResult: true,
  prettier: true,
};
const directives = pluginDirectives.map(d => `directive @${d} on FIELD`).join('\n');
const plugin: CodegenPlugin = {
  plugin(schema, documents, config) {
    try {
      config = {
        ...configDefaults,
        ...config,
      };
      if (config.emitDirectives) {
        const directivesPath = typeof config.emitDirectives === 'string' ? config.emitDirectives : 'directives.graphql';
        fs.writeFileSync(path.join(directivesPath), directives);
      }
      if (config.emitSchema) {
        const schemaPath = typeof config.emitSchema === 'string' ? config.emitSchema : 'schema.graphql';
        fs.writeFileSync(path.join(schemaPath), printSchema(schema));
      }

      const imports = findUsageInputs(documents, schema);
      const fragments = findUsageFragments(documents);
      const operations = findUsageOperation(documents, schema, config);
      const enums = findUsageEnums(imports, fragments, operations, schema);
      const scalars = findScalars(schema);

      return runPrettierIfExists(
        config,
        [
          printHelpers(),
          printScalars(scalars, config),
          ...enums.map(e => printEnum(e, config)),
          ...imports.map(i => printInput(i, config)),
          ...fragments.map(f => printFragmentType(f, schema, config)),
          ...fragments.map(f => printFragmentGql(f)),
          ...operations.map(o => printOperationTypes(o, config)),
          printCreateSdkFunction(operations, config),
        ].join('\n'),
      );
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  },
  addToSchema: directives,
};

module.exports = plugin;
