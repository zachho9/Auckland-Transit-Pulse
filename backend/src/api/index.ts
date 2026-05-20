import type { APIGatewayProxyHandler } from 'aws-lambda';
import { readSnapshot } from './dynamoReader';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const snapshot = await readSnapshot();
    if (!snapshot) {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(snapshot),
    };
  } catch (err) {
    console.error('Failed to read snapshot:', err);
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Service temporarily unavailable' }),
    };
  }
};
