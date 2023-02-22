### graphql-codegen-axios
A code generation tool that generates an Axios SDK based on your GraphQL queries. This tool makes it easy to consume GraphQL APIs in your Axios projects by automatically generating code for querying your GraphQL API and mapping the results to JavaScript objects.

### Features
- Generates TypeScript code for querying GraphQL APIs with Axios.
- Supports the @first, @firstOrFail, and @nonNullable directives.

### Usage
To use graphql-codegen-axios, you need to have Node.js installed on your system.

Installation
You can install graphql-codegen-axios using npm:

```sh
npm install graphql-codegen-axios --save-dev
yarn add graphql-codegen-axios -D
pnpm add graphql-codegen-axios -D
```
### Configuration
In your project's codegen.yml configuration file, add the following configuration:

```yml
overwrite: true
schema: https://your-graphql-api.com/graphql
documents: src/**/*.graphql
generates:
src/generated/graphql.ts:
plugins:
- typescript
- typescript-operations
- graphql-codegen-axios
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