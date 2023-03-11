import { GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLSchema } from 'graphql/type';
import { getGraphqlTypeInfo } from './types';
import { GraphQLInputType, GraphQLNullableType } from 'graphql/type/definition';
import { CodegenDocuments, ObjectType, ObjectTypeField } from './_types';
import { NamedTypeNode, TypeNode } from 'graphql/language/ast';
import { Kind } from 'graphql/language';

export const findUsageInputs = (documents: CodegenDocuments, schema: GraphQLSchema): ObjectType[] => {
  const inputs: GraphQLInputObjectType[] = [];
  for (let { document } of documents) {
    for (let definition of document.definitions) {
      if (definition.kind !== 'OperationDefinition') {
        continue;
      }
      for (const variableDefinition of definition.variableDefinitions) {
        const type = unpackVariableType(variableDefinition.type);
        const name = type.name.value;
        const input = findInputInSchema(name, schema);
        if (input && !inputs.includes(input)) {
          inputs.push(input);
          inputs.push(...findInputDependencies(input, schema, inputs));
        }
      }
    }
  }
  return [...new Set(inputs)].map(input => ({
    name: input.name,
    fields: getInputFields(input),
    gqlType: 'input',
    type: input,
    union: [],
  }));
};
export const findInputInSchema = (name: string, schema: GraphQLSchema) => {
  const type = schema.getType(name);
  if (type instanceof GraphQLInputObjectType) {
    return type;
  }
};

const findInputDependencies = (input: GraphQLInputObjectType, schema: GraphQLSchema, ignore: any[]) => {
  const dependencies: GraphQLInputObjectType[] = [];
  for (let field of Object.values(input.getFields())) {
    const type = unpackInputType(field.type);
    if (type instanceof GraphQLInputObjectType && !ignore.includes(type)) {
      dependencies.push(type);
      dependencies.push(...findInputDependencies(type, schema, [...ignore, ...dependencies]));
    }
  }
  return dependencies;
};

const getInputFields = (input: GraphQLInputObjectType): ObjectTypeField[] => {
  return Object.values(input.getFields()).map(field => {
    const typeInfo = getGraphqlTypeInfo(field.type);
    return {
      name: field.name,
      alias: field.name,
      union: [],
      fields: [],
      ...typeInfo,
      inLine: !typeInfo.isScalar,
    };
  });
};

const unpackInputType = (type: GraphQLInputType): GraphQLNullableType => {
  if (type instanceof GraphQLNonNull) {
    return unpackInputType(type.ofType);
  }
  if (type instanceof GraphQLList) {
    return unpackInputType(type.ofType);
  }
  return type;
};

const unpackVariableType = (type: TypeNode): NamedTypeNode => {
  if (type.kind === Kind.LIST_TYPE) {
    return unpackVariableType(type.type);
  }
  if (type.kind === Kind.NON_NULL_TYPE) {
    return unpackVariableType(type.type);
  }
  return type;
};
