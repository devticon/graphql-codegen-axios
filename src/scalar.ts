import { GraphQLScalarType, GraphQLSchema } from 'graphql/type';

export const findScalars = (schema: GraphQLSchema) => {
  return Object.values(schema.getTypeMap()).filter(t => t instanceof GraphQLScalarType) as GraphQLScalarType[];
};
