import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import { env } from "../../config/env.js";
import { dynamoDbDocumentClient } from "../../infra/dynamodb/client.js";

export interface UserRecord {
  userId: string;
  email: string;
  [key: string]: unknown;
}

export class UsersRepository {
  async create(user: UserRecord): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: env.tables.users,
        Item: user,
        ConditionExpression: "attribute_not_exists(email)",
      }),
    );
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const response = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: env.tables.users,
        Key: {
          email,
        },
      }),
    );

    const item = response.Item;

    return item ? (item as UserRecord) : null;
  }
}

export const usersRepository = new UsersRepository();
