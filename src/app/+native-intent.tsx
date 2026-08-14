/**
 * Intercepta las URLs con las que se abre la app y evita que expo-router
 * intente navegar a rutas que no existen (p. ej. la `content://` de un
 * archivo `.rutinapp` descargado o un enlace `rutinapp://import`). Al
 * devolver `/` la app arranca en la pantalla principal y la importación la
 * resuelve `RoutineImportLink` desde el layout raíz.
 */
export function redirectSystemPath({ path }: { path: string }): string {
  if (
    path.startsWith('content:') ||
    path.startsWith('file:') ||
    path.startsWith('rutinapp:')
  ) {
    return '/';
  }
  return path;
}
