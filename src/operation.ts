import {
  CodegenDocuments,
  Config,
  Directive,
  FieldsMap,
  NamedTsObjectType,
  NamedTsType,
  Operation,
  TsType,
  TsTypeObject,
} from './_types';
import { Kind } from 'graphql/language/kinds';
import { FieldNode, FragmentDefinitionNode, OperationTypeNode, SelectionNode, TypeNode } from 'graphql/language/ast';
import { capitalize } from './utils';
import { getGraphqlTypeWrappers, graphqlTypeToTypescript, selectionSetToTsType } from './graphql';
import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema } from 'graphql/type';
import { GraphQLType } from 'graphql/type/definition';
import { findUsageFragments } from './fragments';

export const pluginDirectives = ['firstOrFail', 'first', 'singleResult', 'required'];
export const findUsageOperation = (documents: CodegenDocuments, schema: GraphQLSchema, config: Config) => {
  const allFragments = findUsageFragments(documents);
  const operations: Operation[] = [];
  for (let { document } of documents) {
    for (let definition of document.definitions) {
      if (definition.kind === Kind.OPERATION_DEFINITION) {
        const name = definition.name.value;
        let root: GraphQLObjectType;
        if (definition.operation === OperationTypeNode.QUERY) {
          root = schema.getQueryType();
        } else if (definition.operation === OperationTypeNode.MUTATION) {
          root = schema.getMutationType();
        } else if (definition.operation === OperationTypeNode.SUBSCRIPTION) {
          throw new Error('subscription operation is not supported');
        }

        const directives = findDirectives(definition.selectionSet.selections);
        if (
          config.autoSingleResult !== false &&
          definition.selectionSet.selections.length === 1 &&
          !directives.some(d => d.name === 'singleResult')
        ) {
          const fields = definition.selectionSet.selections.filter(f => f.kind === Kind.FIELD) as FieldNode[];
          directives.push({
            name: 'singleResult',
            path: fields[0].name.value,
            args: {},
          });
        }

        let resultsType: NamedTsObjectType = {
          name: capitalize(name) + 'Results',
          kind: 'object',
          unions: [],
          isNullable: false,
          isList: false,
          ...selectionSetToTsType(root, definition.selectionSet.selections, config),
        };
        for (let directive of directives) {
          switch (directive.name) {
            case 'first':
              changeTsTypeField(resultsType, directive.path, { isList: false });
              break;
            case 'firstOrFail':
              changeTsTypeField(resultsType, directive.path, { isList: false, isNullable: false });
              break;
            case 'required':
              changeTsTypeField(resultsType, directive.path, { isNullable: false });
              break;
          }
        }
        const singleResult = directives.find(d => d.name === 'singleResult');

        if (singleResult) {
          const type = getNestedType(resultsType, singleResult.path);
          resultsType = {
            ...type,
            name: resultsType.name,
          };
        }

        operations.push({
          name,
          definition,
          directives,
          singleResultKey: singleResult ? singleResult.path : '',
          variables: definition.variableDefinitions.length
            ? {
                kind: 'object',
                name: capitalize(name) + 'Variables',
                fields: definition.variableDefinitions.map(variableDefinition => {
                  const type = parseVariableNode(variableDefinition.type, schema);
                  return {
                    name: variableDefinition.variable.name.value,
                    kind: 'inLine',
                    type: graphqlTypeToTypescript(type, config),
                    ...getGraphqlTypeWrappers(type),
                  };
                }),
                unions: [],
                isList: false,
                isNullable: false,
              }
            : undefined,
          results: resultsType,
          fragments: findFragmentsUsedInSelection(definition.selectionSet.selections, allFragments),
        });
      }
    }
  }
  return operations;
};

const findDirectives = (selections: readonly SelectionNode[], key = '') => {
  const directives: Directive[] = [];
  for (let selection of selections) {
    if (selection.kind === Kind.FIELD) {
      const path = key + selection.name.value;
      for (let directive of selection.directives) {
        if (pluginDirectives.includes(directive.name.value)) {
          directives.push({
            name: directive.name.value,
            path,
            args: directive.arguments.reduce((args, arg) => {
              if ('value' in arg.value) {
                args[arg.name.value] = arg.value.value;
              }
              return args;
            }, {} as Record<string, any>),
          });
        }
      }
      if (selection.selectionSet?.selections.length) {
        directives.push(...findDirectives(selection.selectionSet.selections, path + '.'));
      }
    }
  }
  return directives;
};

const getNestedType = (type: TsType, path: string) => {
  let t = type as TsTypeObject;
  for (let key of path.split('.')) {
    const field = t.fields.find(f => f.name === key);
    if (!field) {
      throw new Error(`cannot find field ${key}`);
    }
    t = field as TsTypeObject;
  }
  return t;
};

const changeTsTypeField = <T extends any>(type: TsTypeObject, path: string, value: Partial<TsType>) => {
  const p = path.split('.');
  let t: { fields: TsType[] } = type;
  while (p.length) {
    const k = p.shift();
    const f = t.fields.find(f => f.name === k);
    if (!f) {
      throw new Error(`cannot find field ${k}`);
    }
    if (p.length === 0) {
      Object.assign(f, value);
    } else if (f.kind === 'object') {
      t = f;
    } else {
      throw new Error('logic error');
    }
  }
};

const toFieldsMap = (f: TsTypeObject) => {
  const fields: FieldsMap = {};
  for (let field of f.fields) {
    fields[field.name] = {
      ...field,
      fields: field.kind === 'object' ? toFieldsMap(field) : {},
    };
  }
  return fields;
};

const parseVariableNode = (type: TypeNode, schema: GraphQLSchema, isNullable = true, isList = false): GraphQLType => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return parseVariableNode(type.type, schema, false, isList);
  }
  if (type.kind === Kind.LIST_TYPE) {
    return parseVariableNode(type.type, schema, isNullable, true);
  }

  let gqlType: GraphQLType = schema.getType(type.name.value);
  if (isList) {
    gqlType = new GraphQLList(gqlType);
  }
  if (!isNullable) {
    gqlType = new GraphQLNonNull(gqlType);
  }

  return gqlType;
};

const findFragmentsUsedInSelection = (
  selections: readonly SelectionNode[],
  allFragments: FragmentDefinitionNode[],
  fragments = new Set<string>(),
) => {
  for (let selection of selections) {
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      const fragment = allFragments.find(f => f.name.value === name);
      fragments.add(name);
      findFragmentsUsedInSelection(fragment.selectionSet.selections, allFragments, fragments);
    }
    if (selection.kind === Kind.FIELD && selection.selectionSet?.selections.length) {
      findFragmentsUsedInSelection(selection.selectionSet.selections, allFragments, fragments);
    }
  }

  return [...fragments];
};
