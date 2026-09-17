# 0002. Usar DynamoDB como banco de dados

Data: 2026-09-06

## Status

Aceito

## Contexto

A API exige uma rota protegida para listagem paginada de produtos, além da
autenticação de usuários.

Os principais padrões de acesso conhecidos são:

- buscar usuário por e-mail durante o login;
- listar produtos de forma paginada.

Esses acessos são previsíveis e não exigem joins ou consultas relacionais
complexas, tornando o DynamoDB adequado ao escopo atual da API.

## Decisão

Usar DynamoDB por meio de `@aws-sdk/client-dynamodb` e
`@aws-sdk/lib-dynamodb`.

Em desenvolvimento será utilizado DynamoDB Local via Docker Compose..

### Tabela `users`

Chave primária:

- `userId` — Partition Key.

Índice secundário:

- `EmailIndex`
  - Partition Key: `email`.

O login utiliza `Query` sobre `EmailIndex`, evitando `Scan`.

O GSI não garante unicidade de e-mail; essa restrição deverá ser tratada
explicitamente pela aplicação/modelagem caso seja necessária uma garantia
atômica.

### Tabela `products`

Chave primária:

- `productId` — Partition Key.

A chave principal representa a identidade estável do produto e permite
operações diretas por ID sem depender do padrão utilizado para listagem.

Para atender à listagem paginada será criado o GSI `ProductListIndex`:

- `listKey` — Partition Key do índice, com valor `"PRODUCT"`;
- `productId` — Sort Key do índice.

Exemplo:

| productId  | name    | price | listKey   |
| ---------- | ------- | ----: | --------- |
| `uuid-001` | Teclado |   200 | `PRODUCT` |
| `uuid-002` | Mouse   |   100 | `PRODUCT` |
| `uuid-003` | Monitor |  1200 | `PRODUCT` |

A listagem executa:

`Query ProductListIndex WHERE listKey = "PRODUCT"`

A paginação utiliza `LastEvaluatedKey` retornado pelo DynamoDB como
`ExclusiveStartKey` da próxima consulta.

A API deve expor esse estado como um cursor opaco, sem depender de números
de página.

## Consequências

### Vantagens

- `productId` permanece como identificador natural e estável do produto.
- O padrão de listagem fica isolado em um índice criado especificamente
  para essa consulta.
- A listagem usa `Query` e a paginação nativa do DynamoDB.
- Novos padrões de acesso podem ser adicionados por meio de novos índices,
  quando justificados pelos requisitos.

### Trade-offs

- O `ProductListIndex` adiciona custo de armazenamento e escrita.
- GSIs possuem consistência eventual.
- `listKey = "PRODUCT"` possui baixa cardinalidade e concentra o padrão de
  listagem em uma única chave lógica. Isso é aceitável para o volume do
  volume inicialmente esperado, mas não deve ser tratado como uma estratégia geral para
  catálogos de grande escala.
- Caso o volume cresça significativamente, o índice deverá ser remodelado,
  por exemplo com sharding da chave ou outro atributo de negócio compatível
  com os novos padrões de acesso.
