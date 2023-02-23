const { print } = require('graphql/index');
const { getUsedFragments } = require('./query');
const { GraphQLInputObjectType, GraphQLEnumType } = require('graphql/type');
const { get } = require('axios');

const getName = (name, type, config) => {
  const suffix = config.suffix ? config.suffix[type] || '' : '';
  return `${name}${suffix}`;
};
const renderType = ({ name, fields, union, isList, isNullable, gqlType }, config) => {
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

const renderHeader = text => `/** \n ${text} \n **/`;
const renderTypeField = (fields, config) => {
  return fields
    .map(({ isList, isNullable, typeName, name, fields, isScalar, union, type, inLine, gqlType }) => {
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
          tsType += `{${renderTypeField(fields)}}`;
        }
      }
      tsType = `(${tsType})`;
      if (isList) {
        tsType += '[]';
      }
      if (isNullable) {
        tsType = `Nullable<${tsType}>`;
      }
      return `${name}${isNullable ? '?' : ''}: ${tsType}`;
    })
    .join(',\n');
};

const renderSdk = functions => {
  let str = '{';
  for (let func of functions) {
    str += `${func.name}: ${renderFunction(func)},\n`;
  }
  str += '}';
  return `export const getSdk = (client: AxiosInstance) => (${str})`;
};
const renderFunction = ({ name, variables, results, chain }) => {
  const chainStr = chain.map(f => `.then(${f})`).join('');
  return `(variables: ${variables.name}, config?: AxiosRequestConfig): Promise<${results.name}> => {
    const body = {variables, query: ${name}RawQuery};
    return client.post("", body, config).then(handleResponse)${chainStr}
}`;
};

const renderQuery = ({ name, ast, allFragments }) => {
  const raw = print(ast).replace('@firstOrFail', '').replace('@first', '').replace('@nonNullable', '');

  let fragments = getUsedFragments(raw, allFragments);
  fragments = [...new Set(fragments)].map(f => `\${${f.name}FragmentQuery}`);

  const gql = fragments.join('\n') + '\n' + raw;
  return `const ${name}RawQuery = \`${gql}\`;`;
};

const getScalarTsType = name => `Scalar["${name}"]`;

const renderEnum = (e, config) => {
  let str = `export enum ${getName(e.name, 'enum', config)} {`;
  for (let { name, value } of e.values) {
    str += `${name} = "${value}",`;
  }
  str += `};`;
  return str;
};

const renderFragment = fragment => {
  return `export const ${fragment.name}FragmentQuery = \`${print(fragment.type)}\`;`;
};
const renderScalars = (scalars, config = {}) => {
  const map = {
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
module.exports = { renderType, renderQuery, renderSdk, renderScalars, renderEnum, renderHeader, renderFragment };
