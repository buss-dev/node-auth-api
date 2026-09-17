# 0006. Garantir atomicidade no cadastro e na rotacao de tokens

Data: 2026-09-16

## Status

Aceito

## Contexto

O cadastro de usuarios verificava a existencia de um e-mail por meio de uma
consulta ao indice `EmailIndex` antes de gravar o usuario. Essa sequencia de
leitura seguida de escrita nao garantia unicidade: duas requisicoes
simultaneas poderiam nao encontrar registros e criar usuarios distintos com o
mesmo e-mail.

A renovacao de sessao tambem era composta por operacoes independentes: ler o
refresh token, revogar o token usado e gravar seu substituto. Assim, duas
requisicoes simultaneas com o mesmo token ainda valido poderiam ambas concluir
a verificacao antes de qualquer revogacao e emitir duas sessoes validas.

O sistema deve garantir que um e-mail identifique no maximo um usuario e que
cada refresh token possa originar no maximo uma nova sessao.

## Decisao

A tabela `users` passara a usar `email` normalizado como Partition Key. O
atributo `userId` continuara armazenado como identificador opaco do usuario,
mas nao sera a chave primaria da tabela. O cadastro usara uma escrita
condicional com `attribute_not_exists(email)`. Uma falha de condicao sera
traduzida para o erro de dominio `E-mail ja cadastrado`.

O indice `EmailIndex` deixa de ser necessario e sera removido da definicao da
tabela. A consulta de usuario por e-mail passara a usar `GetItem`, que tambem
possui consistencia forte por padrao.

A rotacao de refresh token sera feita por uma transacao do DynamoDB. A
transacao devera:

1. atualizar o refresh token atual somente se `revokedAt` ainda nao existir e
   `expiresAt` for maior que o instante da operacao;
2. criar o novo refresh token somente se seu `tokenHash` ainda nao existir.

Se qualquer condicao falhar, o DynamoDB cancelara toda a transacao. A API nao
emitira nem retornara uma nova sessao e respondera que o refresh token e
invalido.

## Consequencias

### Vantagens

- Duas tentativas concorrentes de cadastro para o mesmo e-mail resultam em no
  maximo um usuario criado.
- Um refresh token so pode ser consumido uma vez, mesmo sob requisicoes
  simultaneas ou em instancias diferentes da API.
- A rotacao nao deixa estados parciais, como um token antigo revogado sem que
  o novo registro tenha sido criado.
- A busca de usuario por e-mail deixa de depender de um GSI de consistencia
  eventual.

### Trade-offs

- A chave primaria da tabela `users` muda; ambientes existentes devem recriar
  ou migrar a tabela antes da implantacao da nova versao.
- Transacoes do DynamoDB consomem mais capacidade e possuem maior latencia que
  escritas isoladas.
- A conversao de falhas condicionais e de cancelamentos de transacao para erros
  de dominio passa a ser responsabilidade explicita da camada de repositorio.
