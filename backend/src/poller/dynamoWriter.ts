import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot } from '../../../shared/types';

const dynamo = new DynamoDBClient({});

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'snapshot', sk: 'latest', ...snapshot }),
  }));
}
