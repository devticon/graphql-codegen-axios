import { print } from 'graphql/index';
import { getUsedFragments } from './query';
import { GraphQLEnumType, GraphQLInputObjectType, GraphQLScalarType } from 'graphql/type';
import { capitalize } from './utils';
import { Config, Enum, ObjectType, ObjectTypeField, Query, SdkFunction } from './_types';

const getName = (name: string, type: 'fragment' | 'input' | 'enum', config: Config) => {
  const suffix = config.suffix ? config.suffix[type] || '' : '';
  return `${name}${suffix}`;
};
const renderType = ({ name, fields, union, isList, isNullable, gqlType }: ObjectTypeField, config: Config) => {
  let tsType = '';
  if (union && union.length) {
    tsType += [...union.map(u => getName(u, 'fragment', config)), ''].join(' & ');
  }
  tsType += `{${renderTypeField(fields, config)}}`;
  tsType = `(${tsType})`;
  if (isList) {
    tsType += '[]';
  }
  if (isNullable) {
    tsType = `Nullable<${tsType}>`;
  }

  return `export type ${gqlType ? getName(name, gqlType, config) : name} =  ${tsType}`;
};

const renderHeader = (text: string) => `/** \n ${text} \n **/`;
const renderTypeField = (fields: ObjectTypeField[], config: Config) => {
  return fields
    .map(({ isList, isNullable, typeName, name, fields, isScalar, union, type, inLine, gqlType, alias }) => {
      let tsType = '';
      if (union && union.length) {
        tsType += [...union.map(u => getName(u, 'fragment', config)), ''].join(' & ');
      }
      if (isScalar) {
        tsType += getScalarTsType(typeName);
      } else if (inLine) {
        tsType += gqlType ? getName(typeName, gqlType, config) : typeName;
      } else {
        if (type instanceof GraphQLInputObjectType || type instanceof GraphQLEnumType) {
          tsType += gqlType ? getName(typeName, gqlType, config) : typeName;
        } else {
          tsType += `{${renderTypeField(fields, config)}}`;
        }
      }
      tsType = `(${tsType})`;
      if (isList) {
        tsType += '[]';
      }
      if (isNullable) {
        tsType = `Nullable<${tsType}>`;
      }
      return `${alias || name}${isNullable ? '?' : ''}: ${tsType}`;
    })
    .join(',\n');
};

const renderSdk = (functions: SdkFunction[]) => {
  let str = '{';
  for (let func of functions) {
    str += `${func.name}: ${renderFunction(func)},\n`;
  }
  str += '}';
  return `export const getSdk = (client: AxiosInstance) => (${str})`;
};
const renderFunction = ({ name, variables, results, chain }: SdkFunction) => {
  const chainStr = chain.map(f => `.then(${f})`).join('');
  return `(variables: ${variables.name}, config?: AxiosRequestConfig): Promise<${results.name}> => {
    const body = {variables, query: ${name}RawQuery};
    return client.post("", body, config).then(handleResponse)${chainStr}
}`;
};

const renderQuery = ({ name, ast, allFragments }: Query) => {
  const raw = print(ast)
    .replace(/@firstOrFail/g, '')
    .replace(/@first/g, '')
    .replace(/@nonNullable/g, '')
    .replace(/@singleResult/g, '');

  const fragments = getUsedFragments(raw, allFragments);
  const fragmentNames = [...new Set(fragments)].map(f => `\${${f.name}FragmentQuery}`);
  const gql = fragmentNames.join('\n') + '\n' + raw;
  return `const ${name}RawQuery = \`${gql}\`;`;
};

const getScalarTsType = (name: string) => `Scalar["${name}"]`;

const renderEnum = (e: Enum, config: Config) => {
  let str = `export enum ${getName(e.name, 'enum', config)} {`;
  for (let { name, value } of e.values) {
    str += `${capitalize(name.toLowerCase())} = "${value}",`;
  }
  str += `};`;
  return str;
};

export const renderFragment = (fragment: ObjectType) => {
  return `export const ${fragment.name}FragmentQuery = \`${print(fragment.type)}\`;`;
};
export const renderScalars = (scalars: GraphQLScalarType[], config: Config = {}) => {
  const map: Record<string, string> = {
    String: 'string',
    Boolean: 'boolean',
    Int: 'number',
    Float: 'number',
    ...(config.scalars || {}),
  };
  return `export type Scalar = {${scalars
    .map(({ name }) => {
      const type = map[name] || 'string';
      return `${name}: ${type}`;
    })
    .join(',')}};`;
};
