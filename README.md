# Node Auth API

API REST em Node.js e TypeScript para cadastro e autenticacao de usuarios, com
sessao baseada em tokens e acesso protegido a uma lista paginada de produtos.
O projeto demonstra uma separacao clara entre rotas, servicos e repositorios,
com persistencia no DynamoDB.

## Destaques tecnicos

- Access tokens JWT para autenticar requisicoes protegidas.
- Refresh tokens opacos: somente seus hashes sao persistidos e cada renovacao
  rotaciona o token anterior.
- Logout com revogacao do access token pelo `jti` e do refresh token associado.
- DynamoDB como armazenamento de usuarios, tokens revogados, refresh tokens e
  produtos.
- `GET /products` protegido e paginado por cursor opaco.
- Rate limiting por IP, em memoria e por janela fixa, com `Retry-After` em
  respostas `429`. Por ser mantido no processo, esse limite vale apenas para
  uma unica instancia da API; um ambiente distribuido exige armazenamento
  compartilhado.
- Documentacao Swagger/OpenAPI em `/docs`.
- Ambiente Docker com DynamoDB Local e testes automatizados.

## Pré-requisitos

Para executar o projeto pelo fluxo recomendado, instale:

- [Docker Engine](https://docs.docker.com/engine/install/) e o
  [Docker Compose](https://docs.docker.com/compose/install/); ou
- [Docker Desktop](https://docs.docker.com/desktop/), que já inclui o Docker
  Engine e o Docker Compose;
- [Git](https://git-scm.com/downloads), para clonar o repositório.

Node.js e npm não são necessários para executar a aplicação com Docker. Eles são
necessários apenas para desenvolvimento local, execução direta dos testes ou
execução direta do build.

## Configuração

Copie o arquivo de ambiente de exemplo:

```bash
cp .env.example .env
```

No PowerShell, use:

```powershell
Copy-Item .env.example .env
```

O arquivo `.env` não deve ser commitado. Em ambientes reais, substitua o valor
de `JWT_SECRET` por um segredo seguro.

### Limite de requisicoes de produtos

Somente `GET /products` possui limite de requisicoes: por padrao, cada IP pode
fazer 100 requisicoes por janela fixa de 60 segundos. As variaveis abaixo
permitem ajustar esse comportamento:

| Variavel | Padrao | Descricao |
| --- | --- | --- |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Numero maximo de requisicoes por IP na janela. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Duracao da janela fixa, em segundos. |
| `TRUST_PROXY_HOPS` | `0` | Saltos de proxy confiaveis para determinar o IP do cliente. |

`TRUST_PROXY_HOPS=0` e o padrao seguro: headers como `X-Forwarded-For` nao sao
confiados. Configure um valor maior que zero somente quando a API estiver atras
de uma quantidade conhecida de proxies controlados. Ao exceder o limite, a API
retorna `429 Too Many Requests` e o header `Retry-After` com os segundos ate o
fim da janela. Esse controle e mantido em memoria e, portanto, se aplica apenas
a uma unica instancia da API; para varias instancias, use um armazenamento
compartilhado para o contador.

## Executando com Docker

Construa as imagens e suba os serviços:

```bash
docker compose up --build
```

O Compose inicia:

- a API Node.js na porta `3000`;
- o DynamoDB Local na porta `8000`;
- a criação das tabelas;
- sem executar o seed automaticamente.

O seed é uma operação explícita, executada separadamente:

```bash
docker compose run --rm api node dist/scripts/seed.js
```

Esse comando insere o usuário local e os produtos de exemplo. Pode ser
executado novamente em desenvolvimento; os itens usam chaves determinísticas
e serão substituídos, não duplicados.

Verifique os containers:

```bash
docker compose ps
```

Para encerrar os serviços:

```bash
docker compose down
```

Para remover também os dados persistidos do DynamoDB Local:

```bash
docker compose down -v
```

## Endpoints

| Método | Rota | Descrição | Autenticação |
| --- | --- | --- | --- |
| GET | `/health` | Verifica a saúde da API | Não |
| GET | `/docs` | Abre a documentação Swagger | Não |
| POST | `/auth/register` | Cria um usuário | Não |
| POST | `/auth/login` | Autentica um usuário | Não |
| POST | `/auth/refresh` | Renova a sessão | Não |
| POST | `/auth/logout` | Encerra a sessão | Access token |
| GET | `/products` | Lista produtos paginados | Access token |

A API estará disponível em:

```text
http://localhost:3000
```

A documentação estará disponível em:

```text
http://localhost:3000/docs
```

## Usuário local

O seed cria o usuário:

```text
E-mail: demo@example.com
Senha: Password123!
```

Essas credenciais existem apenas para facilitar o desenvolvimento local.

## Fluxo de autenticação

1. Execute o seed ou crie um usuário em `POST /auth/register`.
2. Faça login em `POST /auth/login`.
3. Use o `accessToken` no header `Authorization`.
4. Acesse `GET /products`.
5. Use `POST /auth/refresh` para rotacionar a sessão.
6. Use `POST /auth/logout` para invalidar os tokens.

## Fluxo principal

```mermaid
sequenceDiagram
    actor Cliente
    participant API
    participant AuthService
    participant Users as UsersRepository
    participant DynamoDB
    participant Tokens as Token Services

    Cliente->>API: POST /auth/login
    API->>AuthService: login(email, password)
    AuthService->>Users: findByEmail(email)
    Users->>DynamoDB: GetItem por email
    DynamoDB-->>Users: Usuário + passwordHash
    Users-->>AuthService: Usuário
    AuthService->>Tokens: comparar senha e gerar tokens
    AuthService->>DynamoDB: salvar hash do refresh token
    AuthService-->>API: accessToken + refreshToken
    API-->>Cliente: 200 OK

    Cliente->>API: POST /auth/refresh com refreshToken
    API->>AuthService: refresh(refreshToken)
    AuthService->>DynamoDB: GetItem refresh_tokens pelo tokenHash
    DynamoDB-->>AuthService: Registro válido
    AuthService->>DynamoDB: revogar refresh token antigo
    AuthService->>DynamoDB: salvar hash do novo refresh token
    AuthService->>Tokens: gerar novo access token
    AuthService-->>API: novos tokens
    API-->>Cliente: 200 OK

    Cliente->>API: GET /products com Bearer token
    API->>Tokens: validar JWT
    API->>DynamoDB: consultar jti em revoked_tokens
    DynamoDB-->>API: Token não revogado
    API->>DynamoDB: Query ProductListIndex
    DynamoDB-->>API: Produtos + LastEvaluatedKey
    API-->>Cliente: 200 OK + items + nextCursor

    Cliente->>API: POST /auth/logout com os dois tokens
    API->>AuthService: logout(accessToken, refreshToken)
    AuthService->>Tokens: validar access token e extrair jti
    AuthService->>DynamoDB: salvar jti em revoked_tokens
    AuthService->>DynamoDB: buscar refresh token pelo hash
    AuthService->>DynamoDB: revogar refresh token
    API-->>Cliente: 204 No Content
```

Exemplo de header protegido:

```text
Authorization: Bearer <accessToken>
```

## Desenvolvimento local com Node.js

Como alternativa ao Docker, usando Node.js 22 ou superior:

```bash
npm install
npm run db:create-tables
npm run db:seed
npm run dev
```

Para verificar o projeto:

```bash
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run build
```

### Teste manual do limite

Com a API em execucao e um access token valido, envie mais requisicoes que o
valor de `RATE_LIMIT_MAX_REQUESTS` dentro de uma janela. A ultima resposta deve
ser `429` e incluir `Retry-After`:

```bash
for i in $(seq 1 101); do
  curl -i -H "Authorization: Bearer <accessToken>" http://localhost:3000/products
done
```

Em PowerShell:

```powershell
1..101 | ForEach-Object {
  Invoke-WebRequest http://localhost:3000/products -Headers @{ Authorization = "Bearer <accessToken>" }
}
```

## Documentação da estrutura

Consulte [`docs/structure.md`](docs/structure.md) para entender a organização
das pastas e a responsabilidade de cada camada.

Consulte [`docs/dependencies.md`](docs/dependencies.md) para ver as dependências
do projeto e o motivo de cada uma.

## Decisões arquiteturais

As decisões relevantes estão documentadas em [`docs/adr/README.md`](docs/adr/README.md).
