import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { RouteShape } from '../../shared/types';

const BUCKET_NAME = process.env.SHAPES_BUCKET_NAME;
if (!BUCKET_NAME) throw new Error('SHAPES_BUCKET_NAME env var required');

const EPSILON = 0.0001; // ~11 metres — Douglas-Peucker tolerance in degrees

const s3 = new S3Client({ region: 'ap-southeast-2' });

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });
}

function perpendicularDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): number {
  const [x0, y0] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const num = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
  return den === 0 ? 0 : num / den;
}

function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

async function main() {
  const gtfsDir = path.join(__dirname, '../../data/gtfs');

  console.log('Reading trips.txt...');
  let trips: Record<string, string>[];
  try {
    trips = parseCsv(fs.readFileSync(path.join(gtfsDir, 'trips.txt'), 'utf-8'));
  } catch {
    throw new Error(`Could not read trips.txt from ${gtfsDir}. Run this script from the repo root.`);
  }

  // route_id → { directionId → shape_id } (first trip wins per direction)
  const routeDirectionShapeMap = new Map<string, Map<number, string>>();
  for (const trip of trips) {
    const { route_id, direction_id, shape_id } = trip;
    if (!route_id || !shape_id) continue;
    const dirId = parseInt(direction_id ?? '0', 10);
    if (!routeDirectionShapeMap.has(route_id)) {
      routeDirectionShapeMap.set(route_id, new Map());
    }
    const dirMap = routeDirectionShapeMap.get(route_id)!;
    if (!dirMap.has(dirId)) dirMap.set(dirId, shape_id);
  }

  // shape_id → ordered [lat, lng] points
  console.log('Reading shapes.txt (565k rows — may take a moment)...');
  let shapesRaw: string;
  try {
    shapesRaw = fs.readFileSync(path.join(gtfsDir, 'shapes.txt'), 'utf-8');
  } catch {
    throw new Error(`Could not read shapes.txt from ${gtfsDir}. Run this script from the repo root.`);
  }
  const shapeMap = new Map<string, Array<{ seq: number; lat: number; lng: number }>>();
  const shapeLines = shapesRaw.trim().split('\n');
  const shapeHeaders = shapeLines[0].split(',').map(h => h.trim().replace(/^﻿/, ''));
  const idxShapeId  = shapeHeaders.indexOf('shape_id');
  const idxLat      = shapeHeaders.indexOf('shape_pt_lat');
  const idxLng      = shapeHeaders.indexOf('shape_pt_lon');
  const idxSeq      = shapeHeaders.indexOf('shape_pt_sequence');
  if (idxShapeId < 0 || idxLat < 0 || idxLng < 0 || idxSeq < 0) {
    throw new Error(`Missing required columns in shapes.txt. Found: ${shapeHeaders.join(', ')}`);
  }
  for (let i = 1; i < shapeLines.length; i++) {
    const cols = shapeLines[i].split(',');
    const shapeId = cols[idxShapeId]?.trim();
    if (!shapeId) continue;
    if (!shapeMap.has(shapeId)) shapeMap.set(shapeId, []);
    shapeMap.get(shapeId)!.push({
      seq: parseInt(cols[idxSeq] ?? '0', 10),
      lat: parseFloat(cols[idxLat] ?? '0'),
      lng: parseFloat(cols[idxLng] ?? '0'),
    });
  }

  const routeIds = Array.from(routeDirectionShapeMap.keys());
  console.log(`Uploading ${routeIds.length} route shape files to S3...`);

  let uploaded = 0;
  for (const routeId of routeIds) {
    const dirMap = routeDirectionShapeMap.get(routeId)!;
    const directions: RouteShape['directions'] = [];

    for (const [directionId, shapeId] of dirMap.entries()) {
      const rawPoints = shapeMap.get(shapeId);
      if (!rawPoints || rawPoints.length === 0) continue;
      rawPoints.sort((a, b) => a.seq - b.seq);
      const coords: [number, number][] = rawPoints.map(p => [p.lat, p.lng]);
      const simplified = douglasPeucker(coords, EPSILON);
      directions.push({ directionId, points: simplified });
    }

    if (directions.length === 0) continue;

    const shape: RouteShape = { routeId, directions };
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `shapes/${routeId}.json`,
        Body: JSON.stringify(shape),
        ContentType: 'application/json',
      }));
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  ${uploaded}/${routeIds.length} uploaded`);
    } catch (err) {
      console.error(`  Failed to upload shapes/${routeId}.json:`, err);
    }
  }

  console.log(`Done. ${uploaded} shape files uploaded to s3://${BUCKET_NAME}/shapes/`);
}

main().catch(err => { console.error(err); process.exit(1); });
