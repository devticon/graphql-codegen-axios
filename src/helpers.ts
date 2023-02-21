import { AxiosResponse, AxiosInstance, AxiosRequestConfig } from 'axios';
import { GraphQLError } from 'graphql';

type GraphqlResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

const first = <T>(data: T[]) => data[0];

const firstOrFail = <T>(data: T[]) => {
  const row = data[0];
  if (!row) {
    throw new Error('Not found');
  }
  return row;
};

const nonNullable = <T>(data: T) => {
  const row = data;
  if (!row) {
    throw new Error('Not found');
  }
  return row;
};

export const handleResponse = <T>({ data }: AxiosResponse<GraphqlResponse<T>>) => {
  const errors = data.errors;
  if (errors && errors.length > 0) {
    throw new GraphqlError('Request failed', errors);
  }
  return data.data;
};

export const unpackSingleResults =
  <T extends Object, K extends keyof T>(key: K) =>
  (data: T) =>
    data[key];

export class GraphqlError extends Error {
  constructor(message: string, public gqlErrors: GraphQLError[]) {
    const msg = `${message} ${gqlErrors.map(e => e.message).join('\n')}`;
    super(msg);
  }
}
