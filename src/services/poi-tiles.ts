import { VectorTile } from '@mapbox/vector-tile';
import type GeoJSON from 'geojson';
import Pbf from 'pbf';

/** Viewport bounds in the [west, south, east, north] order used by the map. */
export type ViewportBounds = [west: number, south: number, east: number, north: number];

/**
 * Result of loading POIs for a viewport.
 * A GeoJSON collection to render, or `null` when there is nothing to update
 * (e.g. the tile budget was exceeded and the previous data should be kept).
 */
export type PoiLoadResult = GeoJSON.FeatureCollection | null;

export function emptyPoiCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

const TILEJSON_URI = 'https://tiles.openfreemap.org/planet';
const POI_LAYER = 'poi';
const MIN_FETCH_ZOOM = 12;
const MAX_TILES = 16;
const NAME_DUPLICATE_DISTANCE_M = 20;
const CLASS_DUPLICATE_DISTANCE_M = 8;

type TemplateInfo = {
  template: string;
  maxzoom: number;
};

type Props = Record<string, number | string | boolean>;

type PoiPoint = {
  longitude: number;
  latitude: number;
  props: Props;
};

let templateInfoPromise: Promise<TemplateInfo> | null = null;

function getTemplateInfo(): Promise<TemplateInfo> {
  if (!templateInfoPromise) {
    templateInfoPromise = (async () => {
      const response = await fetch(TILEJSON_URI);
      if (!response.ok) throw new Error(`TileJSON request failed: ${response.status}`);
      const json = (await response.json()) as { tiles?: string[]; maxzoom?: number };
      const template = json?.tiles?.[0];
      if (!template?.includes('{z}')) {
        throw new Error('TileJSON does not expose a tile template');
      }
      const maxzoom = typeof json.maxzoom === 'number' ? json.maxzoom : 14;
      return { template, maxzoom };
    })().catch((error) => {
      templateInfoPromise = null;
      throw error;
    });
  }
  return templateInfoPromise;
}

function tileRangeForBounds(bounds: ViewportBounds, zoom: number) {
  const n = Math.pow(2, zoom);
  const clampIndex = (value: number) => Math.max(0, Math.min(n - 1, Math.floor(value)));

  const xOf = (lng: number) => ((lng + 180) / 360) * n;
  const yOf = (lat: number) => {
    const radians = (lat * Math.PI) / 180;
    return (
      ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * n
    );
  };

  const [west, south, east, north] = bounds;
  return {
    xMin: clampIndex(xOf(west)),
    xMax: clampIndex(xOf(east)),
    yMin: clampIndex(yOf(north)),
    yMax: clampIndex(yOf(south)),
  };
}

const tileCache = new Map<string, Promise<PoiPoint[]>>();

function fetchTileCached(zoom: number, x: number, y: number): Promise<PoiPoint[]> {
  const key = `${zoom}/${x}/${y}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const promise = decodeTile(zoom, x, y);
  tileCache.set(key, promise);
  if (tileCache.size > 256) {
    const oldest = tileCache.keys().next().value;
    if (oldest != null) tileCache.delete(oldest);
  }
  promise.catch(() => {
    if (tileCache.get(key) === promise) tileCache.delete(key);
  });
  return promise;
}

async function decodeTile(zoom: number, x: number, y: number): Promise<PoiPoint[]> {
  const { template } = await getTemplateInfo();
  const url = template
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);
  const bytes = await response.arrayBuffer();

  const tile = new VectorTile(new Pbf(new Uint8Array(bytes)));
  const layer = tile.layers[POI_LAYER];
  if (!layer) return [];

  const points: PoiPoint[] = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const geometry = feature.toGeoJSON(x, y, zoom).geometry as
      | GeoJSON.Point
      | GeoJSON.MultiPoint;
    if (geometry.type !== 'Point' && geometry.type !== 'MultiPoint') continue;

    const coordinate = centroid(geometry.coordinates);
    if (!Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])) continue;

    const props: Props = {};
    for (const key of Object.keys(feature.properties)) {
      const value = feature.properties[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        props[key] = value;
      }
    }
    points.push({ longitude: coordinate[0], latitude: coordinate[1], props });
  }
  return points;
}

function centroid(coordinates: GeoJSON.Position | GeoJSON.Position[]): GeoJSON.Position {
  if (typeof coordinates[0] === 'number') return coordinates as GeoJSON.Position;
  const positions = coordinates as GeoJSON.Position[];
  let lng = 0;
  let lat = 0;
  for (const [positionLng, positionLat] of positions) {
    lng += positionLng;
    lat += positionLat;
  }
  return [lng / positions.length, lat / positions.length];
}

function normalizedName(value: string | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceBetween(a: PoiPoint, b: PoiPoint): number {
  const earthRadiusM = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const haversine =
    sinLat * sinLat +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * sinLng * sinLng;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(haversine));
}

/** Returns true when `a` is preferred over `b` when both would be kept. */
function preferFirst(a: PoiPoint, b: PoiPoint): boolean {
  const rankOf = (point: PoiPoint) =>
    typeof point.props.rank === 'number' ? point.props.rank : Infinity;
  const rankA = rankOf(a);
  const rankB = rankOf(b);
  if (rankA !== rankB) return rankA < rankB;
  const nameA = normalizedName(a.props.name as string | undefined);
  const nameB = normalizedName(b.props.name as string | undefined);
  if (nameA && !nameB) return true;
  if (nameB && !nameA) return false;
  return false;
}

function dedupePoints(points: PoiPoint[]): PoiPoint[] {
  const kept = new Array<boolean>(points.length).fill(true);

  for (let i = 0; i < points.length; i++) {
    if (!kept[i]) continue;
    const a = points[i];
    const nameA = normalizedName(a.props.name as string | undefined);
    const classA = String(a.props.class ?? '');

    for (let j = i + 1; j < points.length; j++) {
      if (!kept[j]) continue;
      const b = points[j];
      const nameB = normalizedName(b.props.name as string | undefined);
      const classB = String(b.props.class ?? '');
      if (classA !== classB) continue;

      const distance = distanceBetween(a, b);
      const equidistantNames = nameA !== '' && nameA === nameB;
      if (equidistantNames && distance <= NAME_DUPLICATE_DISTANCE_M) {
        if (preferFirst(b, a)) {
          kept[i] = false;
          break;
        }
        kept[j] = false;
      } else if (nameA === '' && nameB === '' && distance <= CLASS_DUPLICATE_DISTANCE_M) {
        if (preferFirst(b, a)) {
          kept[i] = false;
          break;
        }
        kept[j] = false;
      }
    }
  }

  return points.filter((_, index) => kept[index]);
}

function toFeatureCollection(points: PoiPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: { ...point.props },
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

/**
 * Loads and deduplicates the POIs covering the given viewport.
 * `null` means "no update" (the previous viewport data should be kept).
 */
export async function loadPoisForRegion(
  bounds: ViewportBounds,
  cameraZoom: number,
): Promise<PoiLoadResult> {
  const [west, south, east, north] = bounds;
  if (west >= east || south >= north) return null;

  const info = await getTemplateInfo();
  const zoom = Math.min(Math.floor(cameraZoom), info.maxzoom);
  if (zoom < MIN_FETCH_ZOOM) return emptyPoiCollection();

  const range = tileRangeForBounds(bounds, zoom);
  const tileCount = (range.xMax - range.xMin + 1) * (range.yMax - range.yMin + 1);
  if (tileCount <= 0 || tileCount > MAX_TILES) return null;

  const jobs: Promise<PoiPoint[]>[] = [];
  for (let x = range.xMin; x <= range.xMax; x++) {
    for (let y = range.yMin; y <= range.yMax; y++) {
      jobs.push(fetchTileCached(zoom, x, y));
    }
  }

  const tilePoints = await Promise.all(jobs);
  return toFeatureCollection(dedupePoints(tilePoints.flat()));
}