import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot, DailyStats } from '../../../shared/types';

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

export async function readHistory(): Promise<DailyStats[]> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const response = await dynamo.send(new QueryCommand({
    TableName: process.env.TABLE_NAME!,
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk':    { S: 'daily-stats' },
      ':start': { S: weekAgo },
      ':end':   { S: today },
    },
  }));

  return (response.Items ?? []).map(item => {
    const { pk: _pk, sk, ttl: _ttl, ...rest } = unmarshall(item);
    return { date: sk as string, ...rest } as DailyStats;
  });
}
