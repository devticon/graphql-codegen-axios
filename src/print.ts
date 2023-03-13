import {
  assertObjectType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLScalarType,
  GraphQLSchema,
} from 'graphql/type';
import { Config, NamedTsType, Operation, TsType } from './_types';
import { print } from 'graphql/language';
import { FragmentDefinitionNode } from 'graphql/language/ast';
import { getGraphqlTypeWrappers, graphqlTypeToTypescript, selectionSetToTsType } from './graphql';
import * as fs from 'fs';
import * as path from 'path';
import { pluginDirectives } from './operation';
import { capitalize } from './utils';

export const printOperationTypes = (operation: Operation, config: Config) => {
  const content: string[] = [];
  if (operation.variables) {
    content.push(printTsTypeVariable(operation.variables));
  }
  content.push(printTsTypeVariable(operation.results));

  const queryFragments = operation.fragments.map(fragment => `$\{${fragment}FragmentQuery}\n`);
  let query = print(operation.definition);
  for (let pluginDirective of pluginDirectives) {
    query = query.replace(new RegExp('@' + pluginDirective, 'g'), '');
  }
  content.push(`const ${getOperationQueryName(operation.name)} = \`${queryFragments.join('')}${query}\`;`);
  return content.join('\n');
};

export const printCreateSdkFunction = (operations: Operation[], config: Config) => {
  const fields = operations
    .map(operation => {
      const hasVariables = !!operation.variables;
      const functions: string[] = [];

      for (let directive of operation.directives) {
        switch (directive.name) {
          case 'first':
          case 'firstOrFail':
          case 'required':
            functions.push(`${directive.name}("${directive.path}")`);
            break;
        }
      }

      if (operation.singleResultKey) {
        functions.push(`singleResult("${operation.singleResultKey}")`);
      }
      const defArgs: string[] = [];
      const execArgs: string[] = ['client'];
      if (hasVariables) {
        defArgs.push(`variables: ${operation.variables.name}`);
        execArgs.push(`{variables, query: ${getOperationQueryName(operation.name)}}`);
      } else {
        execArgs.push(`{query: ${getOperationQueryName(operation.name)}}`);
      }
      execArgs.push(`[${functions.join(',')}]`);
      execArgs.push('config');
      defArgs.push(`config?: AxiosRequestConfig`);
      return `${operation.name}: (${defArgs.join(',')}): Promise<${operation.results.name}> => execute(${execArgs.join(
        ',',
      )})`;
    })
    .join(',');
  return `export const createSdk = (client: AxiosInstance) => ({${fields}});`;
};
export const printEnum = (e: GraphQLEnumType, config: Config) => {
  const suffix = config?.suffix?.enum || '';
  const values = e.getValues().map(({ name, value }) => `${capitalize(name.toLowerCase())} = "${value}"`);
  return `export enum ${e.name + suffix} {${values.join(',')}};`;
};
export const printFragmentType = (fragment: FragmentDefinitionNode, schema: GraphQLSchema, config: Config) => {
  const suffix = config?.suffix?.fragment || '';
  const parent = assertObjectType(schema.getType(fragment.typeCondition.name.value));
  return printTsTypeVariable({
    name: fragment.name.value + suffix,
    kind: 'object',
    isList: false,
    isNullable: false,
    ...selectionSetToTsType(parent, fragment.selectionSet.selections, config),
  });
};

export const printFragmentGql = (fragment: FragmentDefinitionNode) => {
  return `const ${fragment.name.value}FragmentQuery = \`${print(fragment)}\``;
};

export const printInput = (input: GraphQLInputObjectType, config: Config) => {
  const suffix = config?.suffix?.input || '';
  return printTsTypeVariable({
    kind: 'object',
    name: input.name + suffix,
    fields: Object.values(input.getFields()).map(field => ({
      name: field.name,
      kind: 'inLine',
      type: graphqlTypeToTypescript(field.type, config),
      ...getGraphqlTypeWrappers(field.type),
    })),
    isNullable: false,
    isList: false,
  });
};

export const printHelpers = () => {
  return fs.readFileSync(path.resolve(__dirname, '../templates/helpers.ts'));
};

export const printScalars = (scalars: GraphQLScalarType[], config: Config) => {
  const map: Record<string, string> = {
    String: 'string',
    Int: 'number',
    Float: 'number',
    Boolean: 'boolean',
    ...(config.scalars || {}),
  };

  for (let scalar of scalars) {
    if (!map[scalar.name]) {
      map[scalar.name] = 'any';
    }
  }
  return `export type Scalar = {${Object.entries(map).map(([name, value]) => `${name}: ${value}`)}};`;
};
const printTsType = (type: TsType) => {
  let ts: string;
  if (type.kind === 'object') {
    ts = type.fields.map(field => `${field.name}${field.isNullable ? '?' : ''}: ${printTsType(field)}`).join(',');
    ts = `{${ts}}`;
  } else {
    ts = type.type;
  }
  if (type.unions?.length) {
    ts = '(' + [...type.unions, ts].join(' & ') + ')';
  }
  if (type.isList) {
    ts += '[]';
  }
  if (type.isNullable) {
    ts = `Nullable<${ts}>`;
  }

  return ts;
};
const printTsTypeVariable = (type: NamedTsType) => {
  return `export type ${type.name} = ${printTsType(type)};`;
};

const getOperationQueryName = (name: string) => `${name}Query`;
