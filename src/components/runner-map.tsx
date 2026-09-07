import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
} from '@maplibre/maplibre-react-native';

import type { RunRoutePoint } from '@/services/run-storage';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const CAMERA_ZOOM = 15;

type RunnerMapProps = {
  route: RunRoutePoint[];
  currentLocation: { latitude: number; longitude: number } | null;
  paused: boolean;
};

export default function RunnerMap({
  route,
  currentLocation,
  paused,
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