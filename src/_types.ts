import { DocumentNode, OperationDefinitionNode } from 'graphql/language/ast';
import { GraphQLSchema } from 'graphql/type';

export type NamedTsType = TsType & { name: string };
export type NamedTsObjectType = TsTypeObject & { name: string };
export type TsTypedBase = {
  name: string;
  isList: boolean;
  isNullable: boolean;
  unions?: string[];
};

export type TsTypeInLine = TsTypedBase & { kind: 'inLine'; type: string };
export type TsTypeObject = TsTypedBase & { kind: 'object'; fields: TsType[] };
export type TsType = TsTypeInLine | TsTypeObject;
export type Query = {
  name: string;
  ast: OperationDefinitionNode;
  allFragments: TsType[];
};
export type Config = {
  autoSingleResult?: boolean;
  prettier?: boolean;
  emitDirectives?: string | boolean;
  emitSchema?: string | boolean;

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

export type Operation = {
  name: string;
  definition: OperationDefinitionNode;
  singleResultKey?: string;
  variables?: NamedTsObjectType;
  results: NamedTsObjectType;
  fragments: string[];
  directives: Directive[];
};

export type Directive = {
  name: string;
  path: string;
  args: Record<string, string>;
};

export type FieldsMap = Record<string, TsTypedBase & { fields: FieldsMap }>;
