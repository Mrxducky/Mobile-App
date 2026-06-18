import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";

interface AppSettings {
  darkModeOverride: "auto" | "light" | "dark";
  trafficEnabled: boolean;
  satelliteEnabled: boolean;
  gpsAutoRefresh: boolean;
}

interface AppContextType {
  settings: AppSettings;
  isDark: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkModeOverride: "auto",
  trafficEnabled: false,
  satelliteEnabled: false,
  gpsAutoRefresh: true,
};

const AppContext = createContext<AppContextType>({
  settings: DEFAULT_SETTINGS,
  isDark: false,
  updateSettings: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem("app_settings").then((stored) => {
      if (stored) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        } catch {}
      }
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem("app_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const isDark =
    settings.darkModeOverride === "dark" ||
    (settings.darkModeOverride === "auto" && systemScheme === "dark");

  return (
    <AppContext.Provider value={{ settings, isDark, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
