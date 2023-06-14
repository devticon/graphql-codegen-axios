// @ts-nocheck
/* tslint:disable */

type Nullable<T> = T | undefined | null;

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
export const first = (key: string) => (data: any) => {
  set(key, get(key + '.0', data), data);
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

const data = {};
