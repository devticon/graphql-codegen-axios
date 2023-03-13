import { AxiosResponse, AxiosInstance, AxiosRequestConfig } from 'axios';
import { GraphQLError } from 'graphql';

type Nullable<T> = T | undefined;

type GraphqlResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

type GraphqlRequestParams = {
  query: string;
  variables?: any;
};
const first = (key: string) => (data: any) => {
  data[key] = data[key][0];
  return data;
};

const firstOrFail = (key: string) => (data: any) => {
  data[key] = (data as any)[key][0];
  if (!data[key]) {
    throw {
      message: `Empty list for ${key} `,
      code: 'EMPTY_LIST',
    };
  }
  return data;
};

const required = (path: string) => (data: any) => {
  const p = path.split('.');
  let d: any = data;
  while (p.length) {
    const k = p.shift();
    const f = d[k!];
    if (Array.isArray(f)) {
      for (let i of f) {
        required(p.join('.'))(i);
      }
    } else if (p.length > 0) {
      d = f;
    } else if (!f) {
      throw {
        message: `missing required field: ${path}`,
        code: 'MISSING_FIELD',
      };
    }
  }
  return data;
};

const execute = (
  client: AxiosInstance,
  body: GraphqlRequestParams,
  functions: ((data: any) => any)[],
  config?: AxiosRequestConfig,
) =>
  client.post('', body, config).then(({ data }: AxiosResponse<GraphqlResponse<any>>) => {
    const errors = data.errors;
    if (errors && errors.length > 0) {
      throw new GraphqlError('Request failed', errors);
    }
    let d = data.data;
    for (let func of functions) {
      try {
        d = func(d);
      } catch (e: any) {
        if (e.code) {
          throw new QueryError(e.message, e.code, body);
        } else {
          throw e;
        }
      }
    }
    return d;
  });

export const singleResult = (key: string) => (data: any) => data[key];

export class GraphqlError extends Error {
  constructor(message: string, public gqlErrors: GraphQLError[]) {
    super(`${message} ${gqlErrors.map(e => e.message).join('\n')}`);
  }
}

export class QueryError extends Error {
  query: string;
  variables: any;
  constructor(message: string, code: string, params: GraphqlRequestParams) {
    super(message);
    this.query = params.query;
    this.variables = params.variables;
  }
}
