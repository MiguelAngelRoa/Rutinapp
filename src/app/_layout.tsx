import { GestureHandlerRootView } from "react-native-gesture-handler";

import "@/notifications/quiet-expo-go";

import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { AgendaNotifications } from "@/components/agenda-notifications";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { NotificationPermissionBanner } from "@/components/notification-permission-banner";
import { WorkoutProvider } from "@/context/workout-context";

SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#A3E635",
    background: "#000000",
    card: "#000000",
    text: "#FFFFFF",
    border: "#4A4A52",
    notification: "#A3E635",
  },
};

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={AppTheme}>
        <WorkoutProvider>
          <AgendaNotifications />
          <AnimatedSplashOverlay />
          <AppTabs />
          <NotificationPermissionBanner />
        </WorkoutProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
