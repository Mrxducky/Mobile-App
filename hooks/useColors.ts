import { useApp } from "@/context/AppContext";
import colors from "@/constants/colors";

export function useColors() {
  const { isDark } = useApp();
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
