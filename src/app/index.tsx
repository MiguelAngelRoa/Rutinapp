import { router } from "expo-router";
import { useEffect } from "react";

import { modeHomeRoute, useMode } from "@/context/mode-context";

export default function ModosEntry() {
  const { mode } = useMode();

  useEffect(() => {
    router.replace(modeHomeRoute(mode));
  }, [mode]);

  return null;
}