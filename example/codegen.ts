overwrite: true
schema: schema.graphql
generates:
  ./generated.ts:
    documents: "graphql/*.graphql"
    plugins:
      - "typescript"
      - "typescript-operations"
      - "@devticon-os/graphql-codegen-axios"
    hooks:
      afterAllFileWrite: "prettier --write"
