import { AxiosResponse, AxiosInstance, AxiosRequestConfig } from 'axios';
import { GraphQLError } from 'graphql';

type GraphqlResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

type GraphqlRequestParams = {
  query: string;
  variables?: any;
};

export const get = (key: string, data: any) => {
  const p = key.split('.');
  let d = data;
  while (p.length) {
    const k = p.shift();
    d = d[k];
    if (p.length === 0) {
      return d;
    }
    if (d === undefined) {
      throw new Error(`Invalid path ${key} missing ${k}`);
    }
  }
};

export const set = (key: string, value: any, data: any) => {
  const p = key.split('.');
  let d = data;
  while (p.length) {
    const k = p.shift();
    if (p.length === 0) {
      d[k] = value;
      return;
    }
    d = d[k];
    if (d === undefined) {
      throw new Error(`Invalid path ${key} missing ${k}`);
    }
  }
};

export const first = (key: string) => (data: any) => {
  let p = key.split('.');
  while (p.length) {
    const k = p.shift();
    let d = get(k, data);

    if (!p.length) {
      if (!Array.isArray(d)) {
        throw new Error(`${key} is not array`);
      }
      set(k, d[0], data);
      break;
    }
    if (Array.isArray(d)) {
      for (let i of d.keys()) {
        first(p.join('.'))(d[i]);
      }
      break;
    }
  }
  return data;
};

export const firstOrFail = (key: string) => (data: any) => {
  first(key)(data);
  if (!get(key, data)) {
    throw {
      message: `Empty list for ${key} `,
      code: 'EMPTY_LIST',
    };
  }
  return data;
};

export const required = (path: string) => (data: any) => {
  const p = path.split('.');
  let d: any = data;
  while (p.length) {
    const k = p.shift();
    const f = d[k!];
    if (Array.isArray(f) && p.length) {
      for (let i of f) {
        required(p.join('.'))(i);
      }
      return data;
    } else if (p.length > 0) {
      d = f;
    } else if (f === undefined || f === null) {
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

export const singleResult = (key: string) => (data: any) => get(key, data);

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
