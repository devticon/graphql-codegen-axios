import { AxiosResponse, AxiosInstance, AxiosRequestConfig } from 'axios';
import { GraphQLError } from 'graphql';

type Nullable<T> = T | undefined;

type GraphqlResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

type GraphqlRequestParams = {
  query: string;
  variables: any;
};
const first = (key: string) => (data: any) => {
  data[key] = data[key][0];
  return data;
};

const firstOrFail = (key: string, reqParams: GraphqlRequestParams) => (data: any) => {
  data[key] = (data as any)[key][0];
  if (!data[key]) {
    throw new QueryNoResultsError(reqParams);
  }
  return data;
};

const nonNullable = (key: string, reqParams: GraphqlRequestParams) => (data: any) => {
  const row = data[key];
  if (!row) {
    throw new QueryNoResultsError(reqParams);
  }
  return data;
};

export const handleResponse = ({ data }: AxiosResponse<GraphqlResponse<any>>): any => {
  const errors = data.errors;
  if (errors && errors.length > 0) {
    throw new GraphqlError('Request failed', errors);
  }
  return data.data;
};
export const unpackSingleResults = (key: string) => (data: any) => data[key];

export class GraphqlError extends Error {
  constructor(message: string, public gqlErrors: GraphQLError[]) {
    super(`${message} ${gqlErrors.map(e => e.message).join('\n')}`);
  }
}

export class QueryNoResultsError extends Error {
  query: string;
  variables: any;
  constructor(params: GraphqlRequestParams) {
    super(`Query has no results`);
    this.query = params.query;
    this.variables = params.variables;
  }
}
