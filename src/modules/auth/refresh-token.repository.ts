import { GetCommand, PutCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { env } from "../../config/env.js";
import { dynamoDbDocumentClient } from "../../infra/dynamodb/client.js";

export interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
  replacedByTokenHash?: string;
}

export class RefreshTokenRepository {
  async save(record: RefreshTokenRecord): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: env.tables.refreshTokens,
        Item: record,
      }),
    );
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const response = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: env.tables.refreshTokens,
        Key: {
          tokenHash,
        },
      }),
    );

    return (response.Item as RefreshTokenRecord | undefined) ?? null;
  }

  async revoke(
    tokenHash: string,
    revokedAt: number,
    replacedByTokenHash?: string,
  ): Promise<void> {
    let updateExpression = "SET revokedAt = :revokedAt";

    const expressionAttributeValues: Record<string, string | number> = {
      ":revokedAt": revokedAt,
    };

    if (replacedByTokenHash !== undefined) {
      updateExpression += ", replacedByTokenHash = :replacedByTokenHash";

      expressionAttributeValues[":replacedByTokenHash"] = replacedByTokenHash;
    }

    await dynamoDbDocumentClient.send(
      new UpdateCommand({
        TableName: env.tables.refreshTokens,
        Key: {
          tokenHash,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
  }

  async rotate(
    currentToken: RefreshTokenRecord,
    newToken: RefreshTokenRecord,
    revokedAt: number,
  ): Promise<void> {
    await dynamoDbDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: env.tables.refreshTokens,
              Key: { tokenHash: currentToken.tokenHash },
              UpdateExpression:
                "SET revokedAt = :revokedAt, replacedByTokenHash = :replacedByTokenHash",
              ConditionExpression:
                "attribute_not_exists(revokedAt) AND expiresAt > :now",
              ExpressionAttributeValues: {
                ":revokedAt": revokedAt,
                ":replacedByTokenHash": newToken.tokenHash,
                ":now": revokedAt,
              },
            },
          },
          {
            Put: {
              TableName: env.tables.refreshTokens,
              Item: newToken,
              ConditionExpression: "attribute_not_exists(tokenHash)",
            },
          },
        ],
      }),
    );
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
