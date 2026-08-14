import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Routine } from '@/types/workout';
import {
  parseRoutineFromJson,
  ROUTINE_SHARE_MAX_BYTES,
} from '@/utils/routine-share';

export type PickRoutineResult =
  | { status: 'canceled' }
  | { status: 'invalid' }
  | { status: 'ok'; routine: Routine };

async function readText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('read failed');
    return response.text();
  }
  const file = new File(uri);
  return file.text();
}

/** Lets the user pick a routine file and validates its content. */
export async function pickRoutineFromDocumentPicker(): Promise<PickRoutineResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) return { status: 'canceled' };

    const asset = result.assets[0];
    if (asset.size != null && asset.size > ROUTINE_SHARE_MAX_BYTES) {
      return { status: 'invalid' };
    }

    const text = await readText(asset.uri);
    const routine = parseRoutineFromJson(text);
    if (routine == null) return { status: 'invalid' };
    return { status: 'ok', routine };
  } catch {
    return { status: 'invalid' };
  }
}
