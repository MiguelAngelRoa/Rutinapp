import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  VectorSource,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import type {
  ExpressionSpecification,
  FilterSpecification,
} from '@maplibre/maplibre-gl-style-spec';

import type { RunRoutePoint } from '@/services/run-storage';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const POI_SOURCE_URL = 'https://tiles.openfreemap.org/planet';
const CAMERA_ZOOM = 15;

const POINT_GEOMETRY: ExpressionSpecification = [
  'match',
  ['geometry-type'],
  ['MultiPoint', 'Point'],
  true,
  false,
];

const POI_NAME_FIELD: ExpressionSpecification = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
];

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
  POINT_GEOMETRY,
  NOT_TRANSIT,
  ['>=', ['get', 'rank'], 1],
  ['<', ['get', 'rank'], 7],
];
const POI_RANK_7: FilterSpecification = [
  'all',
  POINT_GEOMETRY,
  NOT_TRANSIT,
  ['>=', ['get', 'rank'], 7],
  ['<', ['get', 'rank'], 20],
];
const POI_RANK_20: FilterSpecification = [
  'all',
  POINT_GEOMETRY,
  NOT_TRANSIT,
  ['>=', ['get', 'rank'], 20],
];
const POI_TRANSIT: FilterSpecification = [
  'all',
  POINT_GEOMETRY,
  TRANSIT_CLASS,
];

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
        source-layer="poi"
        minzoom={minzoom}
        filter={filter}
        paint={{
          'circle-radius': 11,
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
        source-layer="poi"
        minzoom={minzoom}
        filter={filter}
        layout={{
          'icon-image': 'circle_11_black',
          'icon-size': 0.6,
          'icon-anchor': 'center',
        }}
      />
      <Layer
        id={`poi-${id}-label`}
        type="symbol"
        source="poi"
        source-layer="poi"
        minzoom={minzoom}
        filter={filter}
        layout={{
          'text-field': POI_NAME_FIELD,
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
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

type RunnerMapProps = {
  route: RunRoutePoint[];
  currentLocation: { latitude: number; longitude: number } | null;
  paused: boolean;
  showPois: boolean;
};

export default function RunnerMap({
  route,
  currentLocation,
  paused,
  showPois,
}: RunnerMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const centeredRef = useRef(false);

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
                coordinates: route.map(
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
    <Map style={styles.map} mapStyle={MAP_STYLE_URL} logo={false} attribution={false}>
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
        <VectorSource id="poi" url={POI_SOURCE_URL}>
          <PoiLayerTier id="transit" minzoom={12} filter={POI_TRANSIT} />
          <PoiLayerTier id="r1" minzoom={15} filter={POI_RANK_1} />
          <PoiLayerTier id="r7" minzoom={16} filter={POI_RANK_7} />
          <PoiLayerTier id="r20" minzoom={17} filter={POI_RANK_20} />
        </VectorSource>
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