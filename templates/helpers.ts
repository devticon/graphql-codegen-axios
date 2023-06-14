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

const get = (key: string, data: any) => {
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

const set = (key: string, value: any, data: any) => {
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

const first = (key: string) => (data: any) => {
  let p = key.split('.');
  while (p.length) {
    const k = p.shift();
    let d = data[k];
    if (Array.isArray(d)) {
      for (let [index] of d.entries()) {
        let i = index.toString();
        if (p.length) {
          i += '.' + p.join('.');
        }
        first(i)(d);
      }
    } else {
      if (p.length) {
        set(key, get(key + '.0', data), data);
      }
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

const required = (path: string) => (data: any) => {
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
