import { isRunningInExpoGo } from 'expo';

// expo-notifications warns on module import when running inside Expo Go
// because push tokens are not supported there since SDK 53. We only use
// local notifications, which DO work in Expo Go, so the warning is noise.
// This module must be imported before expo-notifications to filter it.
if (__DEV__ && isRunningInExpoGo()) {
  const suppressed = (message: string) =>
    message.includes('expo-notifications: Android Push notifications');

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && suppressed(args[0])) return;
    originalError(...args);
  };

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && suppressed(args[0])) return;
    originalWarn(...args);
  };
}
