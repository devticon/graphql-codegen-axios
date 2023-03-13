import { SelectionNode, TypeNode } from 'graphql/language/ast';
import { Config, Directive, TsType, TsTypeObject } from './_types';
import { getNamedType, GraphQLType } from 'graphql/type/definition';
import {
  assertObjectType,
  getNullableType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  isListType,
  isNonNullType,
  isNullableType,
} from 'graphql/type';
import { Kind } from 'graphql/language';
import { pluginDirectives } from './operation';

export const selectionSetToTsType = (
  parent: GraphQLObjectType,
  selections: SelectionNode[] | readonly SelectionNode[],
  config: Config,
) => {
  const type: Pick<TsTypeObject, 'unions' | 'fields'> = {
    fields: [],
    unions: [],
  };
  for (let selection of selections) {
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const suffix = config.suffix?.fragment || '';
      type.unions.push(selection.name.value + suffix);
    }

    if (selection.kind === Kind.FIELD) {
      const parentField = parent.getFields()[selection.name.value];
      const directives = selection.directives.map(d => d.name.value);
      let field: TsType;
      if (selection.selectionSet && selection.selectionSet.selections.length) {
        const nestedParent = assertObjectType(getNamedType(parentField.type));
        field = {
          kind: 'object',
          name: selection.alias?.value || selection.name.value,
          ...selectionSetToTsType(nestedParent, selection.selectionSet.selections, config),
          ...getGraphqlTypeWrappers(parentField.type),
        };
      } else {
        field = {
          kind: 'inLine',
          name: selection.alias?.value || selection.name.value,
          type: graphqlTypeToTypescript(parentField.type, config),
          ...getGraphqlTypeWrappers(parentField.type),
        };
      }
      for (let directive of directives) {
        switch (directive) {
          case 'first':
            field.isList = false;
            break;
          case 'firstOrFail':
            field.isList = false;
            field.isNullable = false;
            break;
          case 'required':
            field.isNullable = false;
            break;
        }
      }
      type.fields.push(field);
    }
  }
  return type;
};

export const getGraphqlTypeWrappers = (type: GraphQLType) => {
  return {
    isList: isListType(isNonNullType(type) ? getNullableType(type) : type),
    isNullable: isNullableType(type),
  };
};

export const graphqlTypeToTypescript = (type: GraphQLType, config: Config) => {
  const namedType = getNamedType(type);

  if (namedType instanceof GraphQLScalarType) {
    return `Scalar["${namedType.name}"]`;
  }

  switch (namedType.astNode.kind) {
    case Kind.ENUM_TYPE_DEFINITION:
      return namedType.name + (config?.suffix?.enum || '');
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return namedType.name + (config?.suffix?.input || '');
    default:
      throw new Error(`unsupported kind: ${namedType.astNode.kind}`);
  }
};

const typeNodeToGraphqlType = (
  type: TypeNode,
  schema: GraphQLSchema,
  isNullable = true,
  isList = false,
): GraphQLType => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return typeNodeToGraphqlType(type.type, schema, false, isList);
  }
  if (type.kind === Kind.LIST_TYPE) {
    return typeNodeToGraphqlType(type.type, schema, isNullable, true);
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
