import { GetCommand, PutCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { jest } from "@jest/globals";

import { dynamoDbDocumentClient } from "../../../infra/dynamodb/client.js";
import { RefreshTokenRepository } from "../../../modules/auth/refresh-token.repository.js";

describe("RefreshTokenRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("busca um refresh token pelo hash", async () => {
    const record = {
      tokenHash: "hashed-token",
      userId: "user-1",
      createdAt: 1_700_000_000,
      expiresAt: 1_700_604_800,
    };

    const send = jest
      .spyOn(dynamoDbDocumentClient, "send")
      .mockResolvedValueOnce({ Item: record } as never);

    const repository = new RefreshTokenRepository();

    const result = await repository.findByHash("hashed-token");

    expect(send).toHaveBeenCalledWith(expect.any(GetCommand));

    const command = send.mock.calls[0]?.[0];

    expect(command).toMatchObject({
      input: {
        TableName: "refresh_tokens",
        Key: {
          tokenHash: "hashed-token",
        },
      },
    });

    expect(result).toEqual(record);
  });

  it("salva apenas os dados persistíveis do refresh token", async () => {
    const send = jest
      .spyOn(dynamoDbDocumentClient, "send")
      .mockResolvedValueOnce({} as never);

    const repository = new RefreshTokenRepository();

    await repository.save({
      tokenHash: "hashed-token",
      userId: "user-1",
      createdAt: 1_700_000_000,
      expiresAt: 1_700_604_800,
    });

    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));

    const command = send.mock.calls[0]?.[0];

    expect(command).toMatchObject({
      input: {
        TableName: "refresh_tokens",
        Item: {
          tokenHash: "hashed-token",
          userId: "user-1",
          createdAt: 1_700_000_000,
          expiresAt: 1_700_604_800,
        },
      },
    });
  });

  it("marca um refresh token como revogado", async () => {
    const send = jest
      .spyOn(dynamoDbDocumentClient, "send")
      .mockResolvedValueOnce({} as never);

    const repository = new RefreshTokenRepository();

    await repository.revoke("hashed-token", 1_700_000_100, "replacement-hash");

    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand));

    const command = send.mock.calls[0]?.[0];

    expect(command).toMatchObject({
      input: {
        TableName: "refresh_tokens",
        Key: {
          tokenHash: "hashed-token",
        },
        ExpressionAttributeValues: {
          ":revokedAt": 1_700_000_100,
          ":replacedByTokenHash": "replacement-hash",
        },
      },
    });
  });

  it("rotaciona o token em uma transacao condicional", async () => {
    const send = jest.spyOn(dynamoDbDocumentClient, "send").mockResolvedValueOnce({} as never);
    const repository = new RefreshTokenRepository();

    await repository.rotate({ tokenHash: "old", userId: "user-1", createdAt: 1, expiresAt: 10 }, { tokenHash: "new", userId: "user-1", createdAt: 2, expiresAt: 20 }, 2);

    expect(send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: { TransactItems: [
        { Update: { ConditionExpression: "attribute_not_exists(revokedAt) AND expiresAt > :now" } },
        { Put: { ConditionExpression: "attribute_not_exists(tokenHash)" } },
      ] },
    });
  });
});
