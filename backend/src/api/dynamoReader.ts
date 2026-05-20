import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot } from '../../../shared/types';

const dynamo = new DynamoDBClient({});

export async function readSnapshot(): Promise<Snapshot | null> {
  const response = await dynamo.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { pk: { S: 'snapshot' }, sk: { S: 'latest' } },
  }));
  if (!response.Item) return null;
  const { pk: _pk, sk: _sk, ...snapshot } = unmarshall(response.Item);
  return snapshot as Snapshot;
}
