import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      labelStyle={{ selected: { color: colors.accent } }}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Entrenar</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="dumbbell" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>Rutina</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="clipboard-list-outline" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="schedule">
        <Label>Agenda</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="calendar-week" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
