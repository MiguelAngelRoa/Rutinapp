import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { useState } from "react";
import { Pressable, useColorScheme } from "react-native";

import { ModeMenu } from "@/components/mode-menu";
import { Colors } from "@/constants/theme";
import { useMode } from "@/context/mode-context";

function tabIcon(name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) {
  return function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  };
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { mode } = useMode();
  const isRunner = mode === "runner";
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Modos",
            tabBarIcon: tabIcon("menu"),
            tabBarButton: ({ children, style, ref: navigationRef, ...rest }) => {
              void navigationRef;
              return (
                <Pressable
                  {...rest}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar modo"
                  onPress={openMenu}
                  onLongPress={openMenu}
                  style={style}
                >
                  {children}
                </Pressable>
              );
            },
          }}
        />
        <Tabs.Screen
          name="routine"
          options={
            isRunner
              ? { href: null }
              : { title: "Rutina", tabBarIcon: tabIcon("clipboard-list-outline") }
          }
        />
        <Tabs.Screen
          name="program"
          options={
            isRunner
              ? { href: null }
              : { title: "Programa", tabBarIcon: tabIcon("format-list-numbered") }
          }
        />
        <Tabs.Screen
          name="runner"
          options={
            isRunner
              ? { title: "Runner", tabBarIcon: tabIcon("run") }
              : { href: null }
          }
        />
        <Tabs.Screen
          name="schedule"
          options={{ title: "Agenda", tabBarIcon: tabIcon("calendar-week") }}
        />
      </Tabs>

      <ModeMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}