import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { fetchFeed } from './atClient';
import {
  buildTripDelayMap,
  parseVehicles,
  parseAlerts,
  aggregateScorecard,
  aggregateLeagueTable,
  buildDailyStats,
  buildHourlyStats,
} from './aggregator';
import { writeSnapshot, readDailyStats, writeDailyStats, readHourlyStats, writeHourlyStats } from './dynamoWriter';
import { getNzDateAndHour } from '../lib/time';
import type { Snapshot } from '../../../shared/types';

const ssm = new SSMClient({});
let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const response = await ssm.send(new GetParameterCommand({
    Name: process.env.SSM_PARAM_NAME!,
    WithDecryption: true,
  }));
  cachedApiKey = response.Parameter!.Value!;
  return cachedApiKey;
}

export const handler = async (): Promise<void> => {
  const apiKey = await getApiKey();
  const feed = await fetchFeed(apiKey);
  const entities = feed.response.entity;

  const tripDelayMap = buildTripDelayMap(entities);
  const vehicles = parseVehicles(entities, tripDelayMap);
  const alerts = parseAlerts(entities);
  const scorecard = aggregateScorecard(vehicles);
  const worstRoutes = aggregateLeagueTable(entities);

  const snapshot: Snapshot = {
    updatedAt: new Date().toISOString(),
    scorecard,
    worstRoutes,
    alerts,
    vehicles,
  };

  const today = new Date().toISOString().slice(0, 10);
  const { date: nzDate, hour: nzHour } = getNzDateAndHour(new Date());

  const [, existingDailyStats, existingHourlyStats] = await Promise.all([
    writeSnapshot(snapshot),
    readDailyStats(today),
    readHourlyStats(nzDate, nzHour),
  ]);

  const updatedDailyStats = buildDailyStats(scorecard, tripDelayMap, worstRoutes, existingDailyStats, today);
  const updatedHourlyStats = buildHourlyStats(scorecard, existingHourlyStats, nzHour);

  await Promise.all([
    writeDailyStats(updatedDailyStats),
    writeHourlyStats(nzDate, updatedHourlyStats),
  ]);

  console.log(`Snapshot written: ${vehicles.length} vehicles, ${worstRoutes.length} delayed routes, ${alerts.length} alerts`);
};
