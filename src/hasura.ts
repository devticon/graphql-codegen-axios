import { Config, HasuraAction, NamedTsObjectType, NamedTsType } from './_types';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';
import {
  assertObjectType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  isInputObjectType,
  isObjectType,
} from 'graphql/type';
import { capitalize } from './utils';
import { getGraphqlTypeWrappers, graphqlTypeToTypescript } from './graphql';
import {
  printEnum,
  printHelpers,
  printIgnores,
  printInput,
  printNullable,
  printObjectType,
  printScalars,
  printTsTypeVariable,
} from './print';
import { getNamedType } from 'graphql/type/definition';
import { findDeepInputs } from './input';
import { findUsageEnums } from './enums';
import { findScalars } from './scalar';

export const findUsageObjects = (schema: GraphQLSchema, config: Config) => {
  const types = new Set<GraphQLObjectType>();
  if (!config.hasura.enabled) {
    return [...types];
  }
  const metadata = parseHasuraAction(schema, config);
  for (let action of metadata) {
    const type = getNamedType(action.operation.type);
    if (isObjectType(type)) {
      types.add(type);
      findDeepTypes(type, types);
    }
  }
  return [...types];
};

export const printHasura = (schema: GraphQLSchema, config: Config) => {
  const actionFunctions: {
    name: string;
    arguments: NamedTsObjectType;
    result: NamedTsType;
  }[] = [];
  const metadata = parseHasuraAction(schema, config);
  const inputs = findInputs(metadata);
  const objects = findUsageObjects(schema, config);
  const enums = findUsageEnums(inputs, objects, [], [], schema);
  for (let action of metadata) {
    const argumentsType: NamedTsObjectType = {
      kind: 'object',
      name: capitalize(action.name) + 'ActionArguments',
      fields: action.operation.args.map(argument => ({
        kind: 'inLine',
        name: argument.name,
        type: graphqlTypeToTypescript(argument.type, config),
        ...getGraphqlTypeWrappers(argument.type),
      })),
      isList: false,
      isNullable: false,
    };

    const resultType = graphqlTypeToTypescript(action.operation.type, config);

    actionFunctions.push({
      name: action.name,
      arguments: argumentsType,
      result: {
        kind: 'inLine',
        name: capitalize(action.operation.name) + 'ActionResults',
        type: action.relationsFields.length
          ? `Omit<${resultType}, ${action.relationsFields.map(r => `"${r}"`).join('|')}>`
          : resultType,
        ...getGraphqlTypeWrappers(action.operation.type),
      },
    });
  }
  let content = '';
  content += 'import {action} from "@cloudticon/functions";';
  content += [
    ...actionFunctions.map(action =>
      [printTsTypeVariable(action.arguments), printTsTypeVariable(action.result)].join('\n'),
    ),
  ].join('\n');

  const suffix = config.suffix?.action || '';
  content += printIgnores(config);
  content += printNullable(config);
  content += printScalars(findScalars(schema), config);
  content += inputs.map(i => printInput(i, config)).join('\n');
  content += objects.map(o => printObjectType(o, config)).join('\n');
  content += enums.map(e => printEnum(e, config)).join('\n');
  content += actionFunctions
    .map(action => `export const ${action.name}${suffix} = action<${action.arguments.name}, ${action.result.name}>;`)
    .join('\n');
  return content;
};

export const parseHasuraAction = (schema: GraphQLSchema, config: Config): HasuraAction[] => {
  const {
    actions,
    custom_types: { objects },
  } = yaml.load(fs.readFileSync(path.resolve(config.hasura.path, 'metadata/actions.yaml'), 'utf-8')) as {
    actions: {
      name: string;
    }[];
    custom_types: {
      objects: { name: string; relationships: { name: string }[] }[];
    };
  };

  return actions.map(action => {
    const operation =
      schema.getQueryType().getFields()[action.name] || schema.getMutationType().getFields()[action.name];
    const type = assertObjectType(getNamedType(operation.type));
    const object = objects.find(o => o.name === type.name);
    const relationsFields = (object.relationships || []).map(r => r.name);

    for (let relationsField of relationsFields) {
      if (type.getFields()[`${relationsField}Aggregate`]) {
        relationsFields.push(`${relationsField}Aggregate`);
      }
    }
    if (!operation) {
      throw new Error('Cannot find operation ' + action.name);
    }
    return {
      ...action,
      operation,
      relationsFields,
    };
  });
};

export const findInputs = (actions: HasuraAction[]) => {
  const inputs = new Set<GraphQLInputObjectType>();
  actions.forEach(action => {
    action.operation.args.forEach(arg => {
      const type = getNamedType(arg.type);
      if (isInputObjectType(type)) {
        inputs.add(type);
        findDeepInputs(type, inputs);
      }
    });
  });
  return [...inputs];
};

const findDeepTypes = (parent: GraphQLObjectType, types: Set<GraphQLObjectType>) => {
  for (let field of Object.values(parent.getFields())) {
    const fieldType = getNamedType(field.type);
    if (isObjectType(fieldType)) {
      if (!types.has(fieldType)) {
        types.add(fieldType);
        findDeepTypes(fieldType, types);
      }
    }
  }
  return types;
};
