import { GraphQLEnumType, GraphQLSchema } from 'graphql/type';
import { Enum, ObjectType } from './_types';

export const findUsageEnums = (types: ObjectType[], schema: GraphQLSchema): Enum[] => {
  const enums: GraphQLEnumType[] = [];
  for (let type of types) {
    for (let e of findEnumInType(type, schema, enums)) {
      if (!enums.includes(e)) {
        enums.push(e);
      }
    }
  }

  return enums.map(e => ({
    name: e.name,
    values: e.getValues().map(({ name, value }) => ({ name, value })),
  }));
};

export const findEnumInSchema = (name: string, schema: GraphQLSchema) => {
  const type = schema.getType(name);
  if (type instanceof GraphQLEnumType) {
    return type;
  }
};

const findEnumInType = (type: ObjectType, schema: GraphQLSchema, ignore: GraphQLEnumType[]) => {
  const enums = [];
  for (let field of type.fields) {
    const type = schema.getType(field.typeName);
    if (type instanceof GraphQLEnumType && !ignore.includes(type)) {
      enums.push(type);
    }
  }
  return enums;
};
