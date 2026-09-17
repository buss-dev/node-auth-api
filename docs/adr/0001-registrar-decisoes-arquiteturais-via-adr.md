# 0001. Registrar decisões arquiteturais via ADR

Data: 2026-09-04

## Status

Aceito

## Contexto

Este projeto envolve múltiplas decisões técnicas relevantes (escolha de banco
de dados, estratégia de autenticação, mecanismo de rate-limit, ferramenta de
infraestrutura como código, entre outras) tomadas ao longo do desenvolvimento
da API.

Sem um registro formal, o _porquê_ dessas escolhas fica implícito no código ou
na memória de quem o escreveu, dificultando a revisão futura das próprias
decisões. Tornar esse raciocínio visível e revisável apoia a manutenção e a
evolução consistente da API.

## Decisão

Adotar Architecture Decision Records (ADRs) para documentar decisões
arquiteturais significativas deste projeto, seguindo o formato proposto por
Michael Nygard.

Cada ADR é um arquivo Markdown numerado sequencialmente em `docs/adr/`,
contendo: contexto, decisão tomada e consequências (vantagens e trade-offs
assumidos). Um `README.md` na mesma pasta mantém um índice com título e status
de cada registro.

ADRs não são reescritos após aceitos. Se uma decisão muda, um novo ADR é
criado e o antigo tem seu status atualizado para "Substituído por 000X",
preservando o histórico de raciocínio.

Decisões táticas de menor escopo (ex: qual biblioteca específica resolve um
problema pontual, como validação de schema ou hash de senha) não geram ADR
próprio, ficam registradas em `docs/dependencies.md`, mantendo os ADRs
focados em decisões de maior impacto e vida mais longa.

## Consequências

**Vantagens:**

- O raciocínio por trás de escolhas como banco de dados e estratégia de
  autenticação fica explícito e revisável, sem depender de arqueologia no
  código ou no histórico de commits.
- Decisões futuras (ou de outros desenvolvedores que eventualmente toquem o
  projeto) têm contexto histórico disponível antes de propor mudanças.
- Reforça a rastreabilidade entre requisitos da API e escolhas técnicas.

**Trade-offs:**

- Exige disciplina para manter os ADRs atualizados conforme decisões evoluem;
  um ADR desatualizado é pior do que nenhum ADR.
- Overhead de tempo adicional em um projeto de escopo pequeno.
