import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { WorkoutProvider } from '@/context/workout-context';

SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#A3E635',
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#4A4A52',
    notification: '#A3E635',
  },
};

export default function TabLayout() {
  return (
    <ThemeProvider value={AppTheme}>
      <WorkoutProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </WorkoutProvider>
    </ThemeProvider>
  );
}
