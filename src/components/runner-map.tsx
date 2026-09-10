import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import type {
  ExpressionSpecification,
  FilterSpecification,
} from '@maplibre/maplibre-gl-style-spec';

import type { RunRoutePoint } from '@/services/run-storage';
import { haversineMeters } from '@/services/run-storage';
import {
  emptyPoiCollection,
  loadPoisForRegion,
  type ViewportBounds,
} from '@/services/poi-tiles';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const CAMERA_ZOOM = 15;
const POI_REFRESH_DEBOUNCE_MS = 600;
const ROUTE_SIMPLIFY_TOLERANCE_M = 5;

const POI_NAME_FIELD: ExpressionSpecification = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
];

const TRANSIT_CLASS: ExpressionSpecification = [
  'match',
  ['get', 'class'],
  ['airport', 'bus', 'rail'],
  true,
  false,
];

const NOT_TRANSIT: ExpressionSpecification = ['!', TRANSIT_CLASS];

const POI_RANK_1: FilterSpecification = [
  'all',
  NOT_TRANSIT,
  ['>=', ['get', 'rank'], 1],
  ['<', ['get', 'rank'], 7],
];
const POI_RANK_7: FilterSpecification = [
  'all',
  NOT_TRANSIT,
  ['>=', ['get', 'rank'], 7],
  ['<', ['get', 'rank'], 20],
];
const POI_RANK_20: FilterSpecification = ['all', NOT_TRANSIT, ['>=', ['get', 'rank'], 20]];
const POI_TRANSIT: FilterSpecification = TRANSIT_CLASS as FilterSpecification;

const POI_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'class'],
  [
    'restaurant',
    'cafe',
    'fast_food',
    'bar',
    'pub',
    'beer',
    'biergarten',
    'bakery',
    'ice_cream',
    'sushi',
    'food_court',
  ],
  '#FBC02D',
  ['attraction', 'museum', 'cinema', 'theatre', 'theater', 'monument', 'castle', 'zoo', 'aquarium', 'art_gallery', 'gallery', 'viewpoint', 'memorial'],
  '#F97316',
  ['hospital', 'pharmacy', 'dentist', 'doctors', 'clinic', 'veterinary', 'blood_bank', 'nursing_home'],
  '#EF4444',
  ['shop', 'supermarket', 'grocery', 'mall', 'department_store', 'clothes', 'florist', 'furniture', 'electronics', 'books', 'alcohol_shop', 'general_goods', 'hardware', 'jewelry', 'laundry', 'optician', 'tobacco'],
  '#3B82F6',
  ['fuel', 'charging_station', 'parking', 'parking_garage', 'bus', 'rail', 'airport', 'ferry_terminal', 'bicycle_rental', 'car_rental', 'taxi'],
  '#8B5CF6',
  ['hotel', 'hostel', 'motel', 'bed_and_breakfast', 'guest_house', 'lodging'],
  '#F472B6',
  ['school', 'college', 'library', 'university', 'kindergarten', 'training'],
  '#0EA5E9',
  ['stadium', 'pitch', 'sports_centre', 'fitness_centre', 'fitness_center', 'gym', 'soccer', 'tennis', 'swimming_pool', 'basketball', 'baseball', 'american_football', 'skatepark'],
  '#EC4899',
  ['park', 'playground', 'garden', 'campsite', 'picnic_site', 'dog_park', 'nature_reserve'],
  '#22D3EE',
  '#FBC02D',
];

type RunnerMapProps = {
  route: RunRoutePoint[];
  currentLocation: { latitude: number; longitude: number } | null;
  paused: boolean;
  showPois: boolean;
};

type PoiTierProps = {
  id: string;
  minzoom: number;
  filter: FilterSpecification;
};

function PoiLayerTier({ id, minzoom, filter }: PoiTierProps) {
  return (
    <>
      <Layer
        id={`poi-${id}-dot`}
        type="circle"
        source="poi"
        minzoom={minzoom}
        filter={filter}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            5,
            17,
            11,
          ],
          'circle-color': POI_COLOR,
          'circle-opacity': 0.95,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.9,
        }}
      />
      <Layer
        id={`poi-${id}-icon`}
        type="symbol"
        source="poi"
        minzoom={minzoom}
        filter={filter}
        layout={{
          'icon-image': 'circle_11_black',
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.1,
            0.6,
            17,
            0.7,
          ],
          'icon-anchor': 'center',
        }}
      />
      <Layer
        id={`poi-${id}-label`}
        type="symbol"
        source="poi"
        minzoom={minzoom}
        filter={filter}
        layout={{
          'text-field': POI_NAME_FIELD,
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.1,
            12,
            17,
            13,
          ],
          'text-anchor': 'left',
          'text-offset': [1.1, 0],
          'text-max-width': 8,
        }}
        paint={{
          'text-color': '#E8EAED',
          'text-halo-color': '#000000',
          'text-halo-width': 1.2,
          'text-halo-blur': 0.5,
        }}
      />
    </>
  );
}

type Region = {
  zoom: number;
  bounds: ViewportBounds;
};

/** Perpendicular distance (in meters) from `c` to the line segment `a`-`b`. */
function pointToSegmentMeters(
  a: { latitude: number; longitude: number },
  c: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
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
  if (lengthSq === 0) return haversineMeters(a.latitude, a.longitude, c.latitude, c.longitude);
  const t = Math.max(0, Math.min(1, ((cx - points[0].x) * dx + (cy - points[0].y) * dy) / lengthSq));
  const projX = points[0].x + t * dx;
  const projY = points[0].y + t * dy;
  return haversineMeters(c.latitude, c.longitude, projY, projX);
}

/** Ramer-Douglas-Peucker simplification with a metric tolerance. */
function simplifyRoute(
  points: RunRoutePoint[],
  toleranceM: number,
): RunRoutePoint[] {
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

export default function RunnerMap({
  route,
  currentLocation,
  paused,
  showPois,
}: RunnerMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const centeredRef = useRef(false);
  const mapRef = useRef<MapRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const [poiData, setPoiData] = useState(emptyPoiCollection);

  useEffect(() => {
    if (paused || !currentLocation) return;
    const center: [number, number] = [
      currentLocation.longitude,
      currentLocation.latitude,
    ];
    if (centeredRef.current) {
      cameraRef.current?.easeTo({ center, zoom: CAMERA_ZOOM, duration: 250 });
    } else {
      cameraRef.current?.jumpTo({ center, zoom: CAMERA_ZOOM });
      centeredRef.current = true;
    }
  }, [currentLocation, paused]);

  const fetchRegionPois = useCallback(
    async (region: Region) => {
      if (!showPois || !mapRef.current) return;
      const generation = ++generationRef.current;
      try {
        const data = await loadPoisForRegion(region.bounds, region.zoom);
        if (generation === generationRef.current && data !== null) {
          setPoiData(data);
        }
      } catch {
        // Network failures keep the last successfully loaded POIs on screen.
      }
    },
    [showPois],
  );

  const schedulePoiRefresh = useCallback(
    (region: Region) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetchRegionPois(region);
      }, POI_REFRESH_DEBOUNCE_MS);
    },
    [fetchRegionPois],
  );

  const refreshFromMap = useCallback(() => {
    mapRef.current?.getViewState().then(
      (viewState) => schedulePoiRefresh(viewState),
      () => {
        // Best-effort: POIs appear once the viewport settles.
      },
    );
  }, [schedulePoiRefresh]);

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (showPois) schedulePoiRefresh(event.nativeEvent);
  };

  useEffect(() => {
    if (showPois) {
      const timeout = setTimeout(refreshFromMap, 250);
      return () => clearTimeout(timeout);
    }
    setPoiData(emptyPoiCollection());
  }, [showPois, refreshFromMap]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const routeData: GeoJSON.FeatureCollection | null =
    route.length > 1
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: simplifyRoute(route, ROUTE_SIMPLIFY_TOLERANCE_M).map(
                  (point) => [point.longitude, point.latitude] as [number, number],
                ),
              },
            },
          ],
        }
      : null;

  const locationData: GeoJSON.FeatureCollection | null = currentLocation
    ? {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [currentLocation.longitude, currentLocation.latitude],
            },
          },
        ],
      }
    : null;

  return (
    <Map
      ref={mapRef}
      style={styles.map}
      mapStyle={MAP_STYLE_URL}
      logo={false}
      attribution={false}
      onRegionDidChange={handleRegionDidChange}
      onDidFinishLoadingMap={refreshFromMap}
    >
      <Camera
        ref={cameraRef}
        initialViewState={
          currentLocation
            ? {
                center: [currentLocation.longitude, currentLocation.latitude],
                zoom: CAMERA_ZOOM,
              }
            : undefined
        }
      />

      {showPois && (
        <GeoJSONSource id="poi" data={poiData}>
          <PoiLayerTier id="transit" minzoom={12} filter={POI_TRANSIT} />
          <PoiLayerTier id="r1" minzoom={15} filter={POI_RANK_1} />
          <PoiLayerTier id="r7" minzoom={16} filter={POI_RANK_7} />
          <PoiLayerTier id="r20" minzoom={17} filter={POI_RANK_20} />
        </GeoJSONSource>
      )}

      {routeData && (
        <GeoJSONSource id="route" data={routeData}>
          <Layer
            id="route-line"
            type="line"
            source="route"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#A3E635', 'line-width': 5 }}
          />
        </GeoJSONSource>
      )}

      {locationData && (
        <GeoJSONSource id="location" data={locationData}>
          <Layer
            id="location-halo"
            type="circle"
            source="location"
            paint={{ 'circle-radius': 8, 'circle-color': '#FFFFFF' }}
          />
          <Layer
            id="location-core"
            type="circle"
            source="location"
            paint={{ 'circle-radius': 5, 'circle-color': '#A3E635' }}
          />
        </GeoJSONSource>
      )}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});