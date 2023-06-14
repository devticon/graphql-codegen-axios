import {
  assertInputType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSchema,
  isInputObjectType,
  isInputType,
} from 'graphql/type';
import { getNamedType, GraphQLEnumType, GraphQLInputType, GraphQLScalarType } from 'graphql/type/definition';
import { CodegenDocuments, Config, TsType } from './_types';
import { NamedTypeNode, TypeNode } from 'graphql/language/ast';
import { Kind } from 'graphql/language';
import { parseHasuraAction } from './hasura';

export const findUsageInputs = (documents: CodegenDocuments, schema: GraphQLSchema, config: Config) => {
  const inputs = new Set<GraphQLInputObjectType>();
  for (let { document } of documents) {
    for (let definition of document.definitions) {
      if (definition.kind === Kind.OPERATION_DEFINITION) {
        for (const variableDefinition of definition.variableDefinitions) {
          const type = unpackVariableType(variableDefinition.type);
          const name = type.name.value;
          const input = findInputInSchema(name, schema);
          if (input && !inputs.has(input)) {
            inputs.add(input);
            findDeepInputs(input, inputs);
          }
        }
      }
    }
  }

  if (config.hasura.enabled) {
    const actions = parseHasuraAction(schema, config);
    for (let action of actions) {
      for (let arg of action.operation.args) {
        const type = getNamedType(arg.type);
        if (isInputObjectType(type) && !inputs.has(type)) {
          inputs.add(type);
          findDeepInputs(type, inputs);
        }
      }
    }
  }
  return [...inputs];
};

export const findDeepInputs = (parent: GraphQLInputObjectType, imports: Set<GraphQLInputObjectType>) => {
  for (let field of Object.values(parent.getFields())) {
    const fieldType = getNamedType(field.type);
    if (fieldType instanceof GraphQLInputObjectType) {
      if (!imports.has(fieldType)) {
        imports.add(fieldType);
        findDeepInputs(fieldType, imports);
      }
    }
  }
  return imports;
};

export const findInputInSchema = (name: string, schema: GraphQLSchema) => {
  const type = schema.getType(name);
  if (type instanceof GraphQLInputObjectType) {
    return type;
  }
};

const unpackInputType = (type: GraphQLInputType): GraphQLScalarType | GraphQLEnumType | GraphQLInputObjectType => {
  if (type instanceof GraphQLNonNull) {
    return unpackInputType(type.ofType);
  }
  if (type instanceof GraphQLList) {
    return unpackInputType(type.ofType);
  }
  return type;
};

const unpackVariableType = (type: TypeNode): NamedTypeNode => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return unpackVariableType(type.type);
  }
  if (type.kind === Kind.LIST_TYPE) {
    return unpackVariableType(type.type);
  }

  return type;
};
