import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Routine } from '@/types/workout';
import { serializeRoutineToJson } from '@/utils/routine-share';

export type ShareRoutineResult = 'shared' | 'downloaded' | 'unavailable';

/** Extensión y MIME propios para asociar el archivo con la app al abrirlo. */
export const ROUTINE_FILE_EXTENSION = '.rutinapp';
export const ROUTINE_FILE_MIME = 'application/x-rutinapp';

function safeFileName(name: string): string {
  const sanitized = name.replace(/[^a-z0-9áéíóúñü\- ]/gi, '').trim().slice(0, 60) || 'rutina';
  return `rutinapp-${sanitized.replace(/\s+/g, '-')}${ROUTINE_FILE_EXTENSION}`;
}

function downloadOnWeb(content: string, name: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Exports a routine to a file and opens the native share sheet (or downloads on web). */
export async function shareRoutineFile(routine: Routine): Promise<ShareRoutineResult> {
  const content = serializeRoutineToJson(routine);
  const name = safeFileName(routine.name);

  if (Platform.OS === 'web') {
    downloadOnWeb(content, name);
    return 'downloaded';
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) return 'unavailable';

  const directory = new Directory(Paths.cache, 'rutinapp-share');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, name);
  file.create({ overwrite: true });
  file.write(content);

  // Nota: no se borra el archivo al salir. En Android `shareAsync` resuelve al
  // abrirse el chooser, antes de que la app receptora (p. ej. WhatsApp) lea el
  // archivo; borrarlo ahí provoca archivos vacíos o sin opción de descarga.
  await Sharing.shareAsync(file.uri, {
    mimeType: ROUTINE_FILE_MIME,
    dialogTitle: 'Compartir rutina',
    UTI: 'public.json',
  });
  return 'shared';
}
