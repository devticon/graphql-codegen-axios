import { DocumentNode, OperationDefinitionNode } from 'graphql/language/ast';
import { GraphQLObjectType, GraphQLSchema } from 'graphql/type';
import { GraphQLType } from 'graphql/type/definition';

export type ObjectType = {
  name: string;
  type?: any;
  fields: ObjectTypeField[];
  union: string[];
  gqlType: string;
};

export type ObjectTypeField = {
  name: string;
  alias: string;
  fields: any[];
  union: string[];
  isList: boolean;
  isNullable: boolean;
  gqlType: any;
  typeName: string;
  type?: GraphQLType;
  isScalar: boolean;
  inLine: boolean;
};

export type SdkFunction = {
  name: string;
  variables: ObjectType;
  results: ObjectType;
  chain: string[];
};

export type Enum = {
  name: string;
  values: { name: string; value: string }[];
};

export type Query = {
  name: string;
  ast: OperationDefinitionNode;
  allFragments: ObjectType[];
};
export type Config = {
  autoSingleResult?: boolean;
  directivesFilePath?: string;
  suffix?: {
    fragment?: string;
    input?: string;
    enum?: string;
  };
  scalars?: Record<string, string>;
};
export type CodegenDocuments = { document: DocumentNode }[];
export type CodegenPlugin = {
  plugin: (schema: GraphQLSchema, documents: CodegenDocuments, config: Config) => string | Promise<string>;
  addToSchema?: string;
};
