const { print } = require('graphql/index');
const { getUsedFragments } = require('./query');
const { GraphQLInputObjectType } = require('graphql/type');
const renderType = ({ name, fields, union }) => {
  return `export type ${name} = ${union ? union.join('&') + '&' : ''} { ${renderTypeField(fields)} };`;
};

const renderHeader = text => `/** \n ${text} \n **/`;
const renderTypeField = fields => {
  return fields
    .map(({ isList, isNullable, typeName, name, fields, isScalar, union, type, inLine }) => {
      let tsType = '';
      if (union && union.length) {
        tsType += [...union, ''].join(' & ');
      }
      if (isScalar) {
        tsType += getScalarTsType(typeName);
      } else if (inLine) {
        tsType += typeName;
      } else {
        if (type instanceof GraphQLInputObjectType) {
          tsType += typeName;
        } else {
          tsType += `{${renderTypeField(fields)}}`;
        }
      }
      return `${name}${isNullable ? '?' : ''}: ${tsType}${isList ? '[]' : ''}`;
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
const renderFunction = ({ name, variables, results }) => {
  return `(variables: ${variables.name}, config?: AxiosRequestConfig) => client.post<GraphqlResponse<${results.name}>>("", {variables, query: ${name}RawQuery}, config).then(handleResponse)`;
};

const renderQuery = ({ name, ast, allFragments }) => {
  const raw = print(ast).replace('@firstOrFail', '').replace('@first', '').replace('@nonNullable', '');

  let fragments = getUsedFragments(raw, allFragments);
  fragments = [...new Set(fragments)].map(f => print(f.type));

  const gql = fragments.join('\n') + '\n' + raw;
  return `const ${name}RawQuery = \`${gql}\`;`;
};

const getScalarTsType = name => `Scalar["${name}"]`;

const renderEnum = e => {
  let str = `export enum ${e.name} {`;
  for (let { name, value } of e.values) {
    str += `${name} = "${value}",`;
  }
  str += `};`;
  return str;
};
const renderScalars = (scalars, map = {}) => {
  map = {
    String: 'string',
    Boolean: 'boolean',
    Int: 'number',
    Float: 'number',
    ...map,
  };
  return `export type Scalar = {${scalars
    .map(({ name }) => {
      const type = map[name] || 'string';
      return `${name}: ${type}`;
    })
    .join(',')}};`;
};
module.exports = { renderType, renderQuery, renderSdk, renderScalars, renderEnum, renderHeader };
