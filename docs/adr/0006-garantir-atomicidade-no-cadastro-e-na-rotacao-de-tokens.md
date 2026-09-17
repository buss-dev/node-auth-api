# 0006. Garantir atomicidade no cadastro e na rotação de tokens

Data: 2026-09-16

## Status

Aceito

## Contexto

O cadastro de usuários verificava a existência de um e-mail por meio de uma
consulta ao índice `EmailIndex` antes de gravar o usuário. Essa sequência de
leitura seguida de escrita não garantia unicidade: duas requisições
simultâneas poderiam não encontrar registros e criar usuários distintos com o
mesmo e-mail.

A renovação de sessão também era composta por operações independentes: ler o
refresh token, revogar o token usado e gravar seu substituto. Assim, duas
requisições simultâneas com o mesmo token ainda válido poderiam ambas concluir
a verificação antes de qualquer revogação e emitir duas sessões válidas.

O sistema deve garantir que um e-mail identifique no máximo um usuário e que
cada refresh token possa originar no máximo uma nova sessão.

## Decisão

A tabela `users` passará a usar `email` normalizado como Partition Key. O
atributo `userId` continuará armazenado como identificador opaco do usuário,
mas não será a chave primária da tabela. O cadastro usará uma escrita
condicional com `attribute_not_exists(email)`. Uma falha de condição será
traduzida para o erro de domínio `E-mail já cadastrado`.

O índice `EmailIndex` deixa de ser necessário e será removido da definição da
tabela. A consulta de usuário por e-mail passará a usar `GetItem`, que também
possui consistência forte por padrão.

A rotação de refresh token será feita por uma transação do DynamoDB. A
transação deverá:

1. atualizar o refresh token atual somente se `revokedAt` ainda não existir e
   `expiresAt` for maior que o instante da operação;
2. criar o novo refresh token somente se seu `tokenHash` ainda não existir.

Se qualquer condição falhar, o DynamoDB cancelará toda a transação. A API não
emitirá nem retornará uma nova sessão e responderá que o refresh token é
inválido.

## Consequências

### Vantagens

- Duas tentativas concorrentes de cadastro para o mesmo e-mail resultam em no
  máximo um usuário criado.
- Um refresh token só pode ser consumido uma vez, mesmo sob requisições
  simultâneas ou em instâncias diferentes da API.
- A rotação não deixa estados parciais, como um token antigo revogado sem que
  o novo registro tenha sido criado.
- A busca de usuário por e-mail deixa de depender de um GSI de consistência
  eventual.

### Trade-offs

- A chave primária da tabela `users` muda; ambientes existentes devem recriar
  ou migrar a tabela antes da implantação da nova versão.
- Transações do DynamoDB consomem mais capacidade e possuem maior latência que
  escritas isoladas.
- A conversão de falhas condicionais e de cancelamentos de transação para erros
  de domínio passa a ser responsabilidade explícita da camada de repositório.
