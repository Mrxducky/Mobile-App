import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CodMachine, formatDistance, haversineDistance } from "@/constants/machines";
import { LatLng } from "@/utils/directions";

export interface MapContainerProps {
  mapRef?: React.RefObject<any>;
  filteredMachines: CodMachine[];
  selectedId: number | null;
  userLocation: { latitude: number; longitude: number } | null;
  trafficEnabled: boolean;
  satelliteEnabled: boolean;
  routeCoords: LatLng[];
  onMarkerPress: (id: number) => void;
}

export default function MapContainer({
  filteredMachines,
  selectedId,
  userLocation,
  onMarkerPress,
}: MapContainerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.webNotice}>
        <Feather name="map" size={48} color="#FF5A00" />
        <Text style={styles.title}>Interactive Map</Text>
        <Text style={styles.subtitle}>
          Google Maps + route drawing available on iOS & Android via Expo Go.
        </Text>
        <Text style={styles.count}>
          {filteredMachines.length} COD machines loaded
        </Text>
      </View>
      <View style={styles.machineList}>
        {filteredMachines.slice(0, 8).map((m) => (
          <View
            key={m.id}
            style={[
              styles.machineRow,
              selectedId === m.id && styles.machineRowSelected,
            ]}
            onTouchEnd={() => onMarkerPress(m.id)}
          >
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.machineName}>{m.title}</Text>
              <Text style={styles.machineCoords}>
                {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                {userLocation
                  ? ` · ${formatDistance(
                      haversineDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        m.latitude,
                        m.longitude
                      )
                    )}`
                  : ""}
              </Text>
            </View>
          </View>
        ))}
        {filteredMachines.length > 8 && (
          <Text style={styles.more}>+{filteredMachines.length - 8} more machines</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F9FB",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  webNotice: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#1F2937",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  count: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FF5A00",
  },
  machineList: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 6,
  },
  machineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  machineRowSelected: {
    borderColor: "#FF5A00",
    backgroundColor: "#FFF0E8",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5A00",
  },
  machineName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1F2937",
  },
  machineCoords: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#6B7280",
  },
  more: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    padding: 8,
  },
});
