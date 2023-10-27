import * as fs from 'fs';
import * as path from 'path';
import { findUsageInputs } from './input';
import { CodegenPlugin } from './_types';
import {
  printCreateSdkFunction,
  printEnum,
  printFragmentGql,
  printFragmentType,
  printHelpers,
  printIgnores,
  printInput,
  printNullable,
  printOperationTypes,
  printScalars,
} from './print';
import { findUsageEnums } from './enums';
import { findUsageFragments } from './fragments';
import { findUsageOperation, pluginDirectives, pluginDirectivesOptions } from './operation';
import { findScalars } from './scalar';
import { runPrettierIfExists } from './prettier';
import { printSchema } from 'graphql/utilities';
import { printHasura } from './hasura';

const directives = pluginDirectivesOptions
  .map(d => {
    let args = '';
    if (d.args && d.args.length) {
      args = d.args.map(a => `${a.name}: ${a.type}`).join(',');
      args = `(${args})`;
    }
    return `directive @${d.name}${args} on FIELD`;
  })
  .join('\n');
const plugin: CodegenPlugin = {
  plugin(schema, documents, config = {}) {
    try {
      config = {
        autoSingleResult: true,
        prettier: true,
        hasura: {
          enabled: false,
          ...(config.hasura || {}),
        },
        ...config,
      };
      if (config.emitDirectives) {
        const directivesPath = typeof config.emitDirectives === 'string' ? config.emitDirectives : 'directives.graphql';
        fs.mkdirSync(path.dirname(directivesPath), { recursive: true });
        fs.writeFileSync(path.join(directivesPath), directives);
      }
      if (config.emitSchema) {
        const schemaPath = typeof config.emitSchema === 'string' ? config.emitSchema : 'schema.graphql';
        fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
        fs.writeFileSync(path.join(schemaPath), printSchema(schema));
      }

      const imports = findUsageInputs(documents, schema, config);
      const fragments = findUsageFragments(documents);
      const operations = findUsageOperation(documents, schema, config);
      const enums = findUsageEnums(imports, [], fragments, operations, schema);
      const scalars = findScalars(schema);

      if (config.hasura.enabled) {
        const output = config.hasura.output || 'hasura.ts';
        if (!fs.existsSync(path.dirname(output))) {
          fs.mkdirSync(path.dirname(output), { recursive: true });
        }
        fs.writeFileSync(path.join(output), runPrettierIfExists(config, printHasura(schema, config)));
      }
      return runPrettierIfExists(
        config,
        [
          printIgnores(config),
          printNullable(config),
          printHelpers(config),
          printScalars(scalars, config),
          ...enums.map(e => printEnum(e, config)),
          ...imports.map(i => printInput(i, config, true)),
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
