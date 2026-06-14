import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Snapshot, DailyStats, HourlyStats } from '../../../shared/types';

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

export async function readHourlyStats(date: string, hour: number): Promise<HourlyStats | null> {
  const sk = `${date}#${String(hour).padStart(2, '0')}`;
  const response = await dynamo.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { pk: { S: 'hourly-stats' }, sk: { S: sk } },
  }));
  if (!response.Item) return null;
  const { pk: _pk, sk: _sk, ttl: _ttl, ...rest } = unmarshall(response.Item);
  return rest as HourlyStats;
}

export async function writeHourlyStats(date: string, stats: HourlyStats): Promise<void> {
  const sk = `${date}#${String(stats.hour).padStart(2, '0')}`;
  const dateMs = new Date(`${date}T00:00:00Z`).getTime();
  const ttl = Math.floor(dateMs / 1000) + 2 * 24 * 60 * 60;
  await dynamo.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall({ pk: 'hourly-stats', sk, ttl, ...stats }),
  }));
}
