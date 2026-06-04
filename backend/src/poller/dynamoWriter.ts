import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot, DailyStats } from '../../../shared/types';

const dynamo = new DynamoDBClient({});

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'snapshot', sk: 'latest', ...snapshot }),
  }));
}

export async function readDailyStats(date: string): Promise<DailyStats | null> {
  const response = await dynamo.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { pk: { S: 'daily-stats' }, sk: { S: date } },
  }));
  if (!response.Item) return null;
  const { pk: _pk, sk, ttl: _ttl, ...rest } = unmarshall(response.Item);
  return { date: sk as string, ...rest } as DailyStats;
}

export async function writeDailyStats(stats: DailyStats): Promise<void> {
  const dateMs = new Date(stats.date).getTime();
  const ttl = Math.floor(dateMs / 1000) + 8 * 24 * 60 * 60;
  const { date, ...rest } = stats;
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'daily-stats', sk: date, ttl, ...rest }),
  }));
}
