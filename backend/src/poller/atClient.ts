import type { AtFeedResponse } from './atTypes';

const AT_REALTIME_URL = 'https://api.at.govt.nz/realtime/legacy';

export async function fetchFeed(apiKey: string): Promise<AtFeedResponse> {
  const response = await fetch(AT_REALTIME_URL, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AT API responded with ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AtFeedResponse;

  if (data.status !== 'OK') {
    throw new Error(`AT API returned non-OK status: ${data.status}`);
  }

  return data;
}
