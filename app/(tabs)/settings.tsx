import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, isDark, updateSettings } = useApp();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 100, paddingTop: 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SectionHeader label="Appearance" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <SettingRow
            icon="moon"
            label="Dark Mode"
            colors={colors}
            control={
              <Switch
                value={
                  settings.darkModeOverride === "dark" ||
                  (settings.darkModeOverride === "auto" && isDark)
                }
                onValueChange={(v) =>
                  updateSettings({ darkModeOverride: v ? "dark" : "light" })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider colors={colors} />
          <SettingRow
            icon="sun"
            label="Auto (follow system)"
            colors={colors}
            control={
              <Switch
                value={settings.darkModeOverride === "auto"}
                onValueChange={(v) =>
                  updateSettings({ darkModeOverride: v ? "auto" : isDark ? "dark" : "light" })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Map */}
        <SectionHeader label="Map" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <SettingRow
            icon="activity"
            label="Traffic Layer"
            colors={colors}
            control={
              <Switch
                value={settings.trafficEnabled}
                onValueChange={(v) => updateSettings({ trafficEnabled: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider colors={colors} />
          <SettingRow
            icon="globe"
            label="Satellite View"
            colors={colors}
            control={
              <Switch
                value={settings.satelliteEnabled}
                onValueChange={(v) => updateSettings({ satelliteEnabled: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider colors={colors} />
          <SettingRow
            icon="radio"
            label="GPS Auto-Refresh (3s)"
            colors={colors}
            control={
              <Switch
                value={settings.gpsAutoRefresh}
                onValueChange={(v) => updateSettings({ gpsAutoRefresh: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* About */}
        <SectionHeader label="Info" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/about")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
                <Feather name="info" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>About App</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  label,
  colors,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
      {label}
    </Text>
  );
}

function SettingRow({
  icon,
  label,
  control,
  colors,
}: {
  icon: string;
  label: string;
  control: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
          <Feather name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {control}
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
});
