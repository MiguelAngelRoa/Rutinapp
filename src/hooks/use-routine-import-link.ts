'use client';

import * as Linking from 'expo-linking';
import { File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useWorkout } from '@/context/workout-context';
import { decodeRoutineFromLink, parseRoutineFromJson } from '@/utils/routine-share';

async function readText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('read failed');
    return response.text();
  }
  if (uri.startsWith('content:')) {
    // Ni la API nueva (SAFDocumentFile) ni la legacy leen `content://` de
    // proveedores arbitrarios (WhatsApp): se copia a cache y se lee ahí.
    const target = new File(
      Paths.cache,
      `incoming-${Date.now()}-${Math.random().toString(36).slice(2)}.rutinapp`
    );
    try {
      await copyAsync({ from: uri, to: target.uri });
      return await target.text();
    } finally {
      if (target.exists) {
        target.delete();
      }
    }
  }
  return new File(uri).text();
}

/**
 * Handles `rutinapp://import?d=<encodeURIComponent(json)>` deep links so an
 * incoming routine is shown in the import confirmation dialog. Also handles
 * `content://`/`file://` URIs when the app is opened from a shared `.rutinapp`
 * file (Android intent filter), importing its content the same way.
 *
 * Navigation to those URLs is prevented by `+native-intent.tsx`
 * (`redirectSystemPath` returns `/`), so expo-router always starts at the home
 * tab and only this hook reacts to the incoming URL.
 */
export function useRoutineImportLink() {
  const { setPendingImport } = useWorkout();
  const url = Linking.useLinkingURL();

  useEffect(() => {
    if (!url) return;

    if (url.startsWith('content:') || url.startsWith('file:')) {
      let cancelled = false;
      (async () => {
        try {
          const text = await readText(url);
          if (cancelled) return;
          const routine = parseRoutineFromJson(text);
          if (routine != null) setPendingImport(routine);
        } catch {
          // Archivo no legible o sin una rutina válida: se ignora.
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const parsed = Linking.parse(url);
    if (parsed.scheme !== 'rutinapp') return;
    const path = parsed.path ?? '';
    const isImport =
      parsed.hostname === 'import' || path === '/import' || path === 'import';
    if (!isImport) return;

    const raw = parsed.queryParams?.d;
    if (raw == null) return;
    const encoded = Array.isArray(raw) ? raw[0] : raw;
    const routine = decodeRoutineFromLink(encoded);
    if (routine != null) setPendingImport(routine);
  }, [url, setPendingImport]);
}
