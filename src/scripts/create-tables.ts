import {
  CreateTableCommand,
  ResourceInUseException,
  type CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

import { env } from "../config/env.js";
import { dynamoDbClient } from "../infra/dynamodb/client.js";

async function createTable(input: CreateTableCommandInput): Promise<void> {
  try {
    await dynamoDbClient.send(new CreateTableCommand(input));

    console.log(`Tabela criada: ${input.TableName}`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`Tabela já existe: ${input.TableName}`);
      return;
    }

    throw error;
  }
}

async function main(): Promise<void> {
  await createTable({
    TableName: env.tables.users,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "email",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "email",
        KeyType: "HASH",
      },
    ],
  });

  await createTable({
    TableName: env.tables.products,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "productId",
        AttributeType: "S",
      },
      {
        AttributeName: "listKey",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "productId",
        KeyType: "HASH",
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ProductListIndex",
        KeySchema: [
          {
            AttributeName: "listKey",
            KeyType: "HASH",
          },
          {
            AttributeName: "productId",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });

  await createTable({
    TableName: env.tables.revokedTokens,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "jti",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "jti",
        KeyType: "HASH",
      },
    ],
  });

  await createTable({
    TableName: env.tables.refreshTokens,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "tokenHash",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "tokenHash",
        KeyType: "HASH",
      },
    ],
  });
}

main().catch((error: unknown) => {
  console.error("Erro ao criar tabelas:", error);
  process.exitCode = 1;
});
