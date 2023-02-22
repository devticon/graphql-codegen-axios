## graphql-codegen-axios
A code generation tool that generates an Axios SDK based on your GraphQL queries. This tool makes it easy to consume GraphQL APIs in your Axios projects by automatically generating code for querying your GraphQL API and mapping the results to JavaScript objects.

### Features
- Generates TypeScript code for querying GraphQL APIs with Axios.
- Supports the `@first`, `@firstOrFail`, and `@nonNullable` directives.

### Usage
To use graphql-codegen-axios, you need to have Node.js installed on your system.

Installation
You can install graphql-codegen-axios using npm:

```sh
npm install @devticon-os/graphql-codegen-axios --save-dev
yarn add @devticon-os/graphql-codegen-axios -D
pnpm add @devticon-os/graphql-codegen-axios -D
```
### Configuration
In your project's codegen.yml configuration file, add the following configuration:

```yml
schema: https://your-graphql-api.com/graphql
documents: src/**/*.graphql
generates:
    src/generated/graphql.ts:
        plugins:
        - typescript
        - typescript-operations
        - @devticon-os/graphql-codegen-axios
```
You can customize the output file path and other settings as per your requirements.

### Directives
graphql-codegen-axios supports the following directives:

- `@first`: Returns only the first object from a collection.
- `@firstOrFail`: Returns the first object from a collection or throws an error if the collection is empty.
- `@nonNullable`: Throws an error if the query returns null.
To use a directive, add it to your GraphQL query like this:

```graphql
query GetFirstUser {
    users(first: 1) @first {
      id
      name
    }
}
```
```graphql
query GetFirstUser {
    users(first: 1) @firstOrFail {
      id
      name
    }
}
```
```graphql
query GetFirstUser {
    user(id: "1") @nonNullable {
      id
      name
    }
}
```
### Field Selection
If your query selects only one field, it will be returned directly instead of being wrapped in an object. For example, the following query:

```graphql
query getCats {
  cats {
    id
  }
}
```
Will generate code that directly returns the name field:

```typescript
export const getSdk = (client: AxiosInstance) => ({
  getCats: (variables: GetCatsQueryVariables, config?: AxiosRequestConfig) =>
    client
      .post<GraphqlResponse<GetCatsQuery>>('', { variables, query: getCatsRawQuery }, config)
      .then(handleResponse) // returns data from axios response
      .then(unpackSingleResults('cats')) // returns "cats" from GetCatsQuery object,
});

```

### Generating Code
You can generate the Axios SDK by running the following command:

```sh
npx graphql-codegen
```
This will generate the TypeScript code in the specified output file path.

### Contributing
Contributions are welcome! Please see the contributing guidelines for more information.

### License
This project is licensed under the MIT License. See the LICENSE file for details.