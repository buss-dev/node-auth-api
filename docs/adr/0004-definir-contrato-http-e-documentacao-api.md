# 0004. Definir contrato HTTP e documentação OpenAPI

Data: 2026-09-07

## Status

Aceito

## Contexto

A API precisa expor autenticação de usuários, renovação e encerramento
de sessões, além de uma rota protegida para listagem paginada de produtos.

Para facilitar o uso, a validação e a manutenção da API, é necessário
estabelecer e documentar um contrato HTTP consistente.

## Decisão

A API utilizará os seguintes endpoints:

| Método | Rota            | Autenticação |
| ------ | --------------- | ------------ |
| GET    | `/health`       | Não          |
| POST   | `/auth/register` | Não          |
| POST   | `/auth/login`   | Não          |
| POST   | `/auth/refresh` | Não          |
| POST   | `/auth/logout`  | Access token |
| GET    | `/products`     | Access token |
| GET    | `/docs`         | Não          |

### Autenticação

`POST /auth/register` receberá:

```json
{
  "email": "user@example.com",
  "password": "StrongPass1!"
}
```

O e-mail será normalizado com remoção de espaços nas extremidades e conversão
para letras minúsculas.

A senha deverá possuir no mínimo 8 caracteres, incluindo letra maiúscula,
letra minúscula, número e caractere especial.

A resposta de sucesso será `201 Created` e conterá somente os dados públicos:

```json
{
  "userId": "user-001",
  "email": "user@example.com"
}
```

O cadastro não emitirá tokens. O usuário deverá realizar login separadamente.
Essa separação permite adicionar futuramente confirmação de e-mail, ativação
ou aprovação da conta antes da autenticação.

Caso o e-mail já esteja cadastrado, a API retornará `409 Conflict`.

`POST /auth/login` receberá:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

A resposta de sucesso conterá:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "refreshTokenExpiresAt": 1735689600,
  "user": {
    "userId": "user-1",
    "email": "user@example.com"
  }
}
```

`POST /auth/refresh` receberá:

```json
{
  "refreshToken": "opaque-token"
}
```

A resposta de sucesso conterá:

```json
{
  "accessToken": "jwt",
  "refreshToken": "new-opaque-token",
  "refreshTokenExpiresAt": 1735689600
}
```

`POST /auth/logout` exigirá o header:

```text
Authorization: Bearer <accessToken>
```

e receberá:

```json
{
  "refreshToken": "opaque-token"
}
```

O logout invalidará o access token atual e o refresh token associado à sessão.

### Produtos

`GET /products` exigirá o header:

```text
Authorization: Bearer <accessToken>
```

A paginação será feita pelos parâmetros:

```text
GET /products?limit=20&cursor=<cursor>
```

A resposta conterá os produtos e um cursor opcional para a próxima página:

```json
{
  "items": [],
  "nextCursor": null
}
```

### Documentação

A especificação da API será escrita utilizando OpenAPI.

A documentação visual será disponibilizada pelo Swagger UI na rota:

```text
GET /docs
```

A especificação OpenAPI será mantida junto ao código-fonte e atualizada sempre
que o contrato HTTP for alterado.

## Consequências

- Os endpoints terão nomes e responsabilidades explícitos.
- O contrato da API poderá ser revisado antes da implementação.
- A documentação ficará disponível para desenvolvedores e avaliadores.
- Os testes HTTP poderão validar o comportamento descrito na especificação.
- Alterações nas rotas exigirão atualização da documentação OpenAPI.
- A API terá uma camada adicional de documentação para manter.
