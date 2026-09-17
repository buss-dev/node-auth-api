# Dependências

Dependências do projeto, agrupadas pela etapa em que foram introduzidas. Ver `docs/adr/` para decisões arquiteturais maiores.

## Runtime

| Dependência                                                                        | Docs                                                                                             | Por quê                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [express](https://expressjs.com)                                                   | [link](https://www.npmjs.com/package/express)                                                    | Framework HTTP minimalista, sem estrutura de projeto imposta |
| [@aws-sdk/client-dynamodb](https://www.npmjs.com/package/@aws-sdk/client-dynamodb) | [link](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/) | Cliente oficial do DynamoDB para o AWS SDK v3                |
| [@aws-sdk/lib-dynamodb](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb)       | [link](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)    | Document Client para trabalhar com tipos JavaScript nativos  |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs)                                 | [link](https://www.npmjs.com/package/bcryptjs)                                                   | Geração e comparação de hashes de senhas                     |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)                         | [link](https://github.com/auth0/node-jsonwebtoken)                                               | Criação e validação de access tokens JWT                     |

## Desenvolvimento

| Dependência                                      | Docs                                                      | Por quê                                                                       |
| ------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [typescript](https://www.typescriptlang.org)     | [link](https://www.npmjs.com/package/typescript)          | Tipagem estática e suporte à manutenção segura                          |
| [tsx](https://github.com/privatenumber/tsx)      | [link](https://www.npmjs.com/package/tsx)                 | Roda `.ts` direto em dev (baseado em esbuild), sem etapa manual de compilação |
| [jest](https://jestjs.io/)                       | [link](https://www.npmjs.com/package/jest)                | Executor de testes automatizados                                              |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | [link](https://www.npmjs.com/package/ts-jest)             | Integra TypeScript ao Jest                                                    |
| [supertest](https://github.com/ladjs/supertest)  | [link](https://www.npmjs.com/package/supertest)           | Testes HTTP da aplicação                                                      |
| @types/node                                      | [link](https://www.npmjs.com/package/@types/node)         | Tipagens dos módulos nativos do Node                                          |
| @types/express                                   | [link](https://www.npmjs.com/package/@types/express)      | Tipagens do Express (escrito em JS puro)                                      |
| @types/jest                                      | [link](https://www.npmjs.com/package/@types/jest)         | Tipagens do Jest para TypeScript                                              |
| @types/supertest                                 | [link](https://www.npmjs.com/package/@types/supertest)    | Tipagens do Supertest para TypeScript                                         |
| @types/jsonwebtoken                              | [link](https://www.npmjs.com/package/@types/jsonwebtoken) | Tipagens do jsonwebtoken para TypeScript                                      |
| @types/swagger-ui-express                        | [link](https://www.npmjs.com/package/@types/swagger-ui-express) | Tipagens do Swagger UI para TypeScript                                      |

## Documentação

| Dependência                                                                        | Docs                                                                                             | Por quê                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)             | [link](https://www.npmjs.com/package/swagger-ui-express)                                          | Disponibiliza a documentação visual OpenAPI em `/docs`       |
