import { haversineMeters } from '@/services/run-storage';

type RoutePoint = { latitude: number; longitude: number };

/** Perpendicular distance (in meters) from `c` to the line segment `a`-`b`. */
export function pointToSegmentMeters(
  a: RoutePoint,
  c: RoutePoint,
  b: RoutePoint,
): number {
  const points = [a, b].map((p) => ({
    x: p.longitude,
    y: p.latitude,
  }));
  const cx = c.longitude;
  const cy = c.latitude;
  const dx = points[1].x - points[0].x;
  const dy = points[1].y - points[0].y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return haversineMeters(a.latitude, a.longitude, c.latitude, c.longitude);
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((cx - points[0].x) * dx + (cy - points[0].y) * dy) / lengthSq,
    ),
  );
  const projX = points[0].x + t * dx;
  const projY = points[0].y + t * dy;
  return haversineMeters(c.latitude, c.longitude, projY, projX);
}

/**
 * Ramer-Douglas-Peucker simplification with a metric tolerance. Keeps the
 * shape of the run while dropping the dense bursts of noisy fixes, so the
 * route renders as a single clean line.
 */
export function simplifyRoute<T extends RoutePoint>(
  points: T[],
  toleranceM: number,
): T[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointToSegmentMeters(first, points[i], last);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > toleranceM && index > 0) {
    const left = simplifyRoute(points.slice(0, index + 1), toleranceM);
    const right = simplifyRoute(points.slice(index), toleranceM);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}