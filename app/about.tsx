import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { COD_MACHINES } from "@/constants/machines";

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroIconWrap}>
          <Feather name="map-pin" size={48} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Talabat COD Finder</Text>
        <Text style={styles.heroVersion}>Version 1.0</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.cards}>
        <InfoCard
          icon="info"
          label="Purpose"
          value={`Help Talabat Riders find COD deposit machines quickly and easily across Qatar.`}
          colors={colors}
        />
        <InfoCard
          icon="database"
          label="Total Machines"
          value={`${COD_MACHINES.length} COD deposit points across Qatar`}
          colors={colors}
        />
        <InfoCard
          icon="code"
          label="Developer"
          value="R & L Studio"
          colors={colors}
        />
        <InfoCard
          icon="map"
          label="Map Provider"
          value="Google Maps"
          colors={colors}
        />
        <InfoCard
          icon="wifi-off"
          label="Offline Support"
          value="All machine coordinates are stored locally. Works without internet."
          colors={colors}
        />
      </View>

      {/* Feature list */}
      <View style={[styles.featureCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>Features</Text>
        {[
          "Live GPS tracking",
          "Find nearest COD machine",
          "Google Maps navigation",
          "Traffic & satellite view",
          "Dark mode support",
          "Offline machine data",
          "Real-time distance calculation",
          "Auto GPS refresh every 3s",
        ].map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Built for Talabat Riders in Qatar{"\n"}© 2024 R &amp; L Studio
      </Text>
    </ScrollView>
  );
}

function InfoCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 0 },
  hero: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 36,
    gap: 8,
  },
  heroIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
  },
  heroVersion: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  cards: {
    padding: 16,
    gap: 10,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    marginTop: 2,
  },
  featureCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  featureTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  featureDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  featureText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  footer: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
