import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { readSnapshot, readHistory, readHourlyHistory } from './dynamoReader';
import { readShape } from './s3Reader';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function ok(body: unknown): APIGatewayProxyResult {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function err(statusCode: number, message: string): APIGatewayProxyResult {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

async function handleSnapshot(): Promise<APIGatewayProxyResult> {
  const snapshot = await readSnapshot();
  if (!snapshot) return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  return ok(snapshot);
}

async function handleHistory(): Promise<APIGatewayProxyResult> {
  const history = await readHistory();
  return ok(history);
}

async function handleHourlyHistory(): Promise<APIGatewayProxyResult> {
  const hourly = await readHourlyHistory();
  return ok(hourly);
}

async function handleShape(routeId: string): Promise<APIGatewayProxyResult> {
  const shape = await readShape(routeId);
  if (!shape) return err(404, 'Shape not found');
  return ok(shape);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const resource = event.resource ?? '';

    if (resource === '/snapshot') return handleSnapshot();
    if (resource === '/history')  return handleHistory();
    if (resource === '/hourly')   return handleHourlyHistory();
    if (resource === '/shapes/{routeId}') {
      const routeId = event.pathParameters?.routeId;
      if (!routeId) return err(400, 'Missing routeId');
      return handleShape(routeId);
    }

    return err(404, 'Not found');
  } catch (e) {
    console.error('API error:', e);
    return err(503, 'Service temporarily unavailable');
  }
};
