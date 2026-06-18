import React from "react";
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";
import { CodMachine, haversineDistance, formatDistance } from "@/constants/machines";
import { LatLng } from "@/utils/directions";

export interface MapContainerProps {
  mapRef: React.RefObject<MapView | null>;
  filteredMachines: CodMachine[];
  selectedId: number | null;
  userLocation: { latitude: number; longitude: number } | null;
  trafficEnabled: boolean;
  satelliteEnabled: boolean;
  routeCoords: LatLng[];
  onMarkerPress: (id: number) => void;
}

export default function MapContainer({
  mapRef,
  filteredMachines,
  selectedId,
  userLocation,
  trafficEnabled,
  satelliteEnabled,
  routeCoords,
  onMarkerPress,
}: MapContainerProps) {
  const mapType = satelliteEnabled ? "satellite" : "standard";

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      mapType={mapType}
      showsUserLocation
      showsCompass
      showsTraffic={trafficEnabled}
      showsMyLocationButton={false}
      rotateEnabled
      pitchEnabled
      initialRegion={{
        latitude: 25.2854,
        longitude: 51.531,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }}
    >
      {filteredMachines.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          pinColor={selectedId === m.id ? "#FF5A00" : "#FF8C42"}
          onPress={() => onMarkerPress(m.id)}
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{m.title}</Text>
              <Text style={styles.calloutDesc}>{m.description}</Text>
              {userLocation && (
                <Text style={styles.calloutDist}>
                  {formatDistance(
                    haversineDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      m.latitude,
                      m.longitude
                    )
                  )}
                </Text>
              )}
            </View>
          </Callout>
        </Marker>
      ))}

      {routeCoords.length > 1 && (
        <>
          <Polyline
            coordinates={routeCoords}
            strokeColor="#FF5A00"
            strokeWidth={5}
            lineDashPattern={undefined}
            lineJoin="round"
            lineCap="round"
          />
          <Polyline
            coordinates={routeCoords}
            strokeColor="rgba(255,90,0,0.18)"
            strokeWidth={14}
            lineJoin="round"
            lineCap="round"
          />
        </>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  callout: { minWidth: 150, padding: 8 },
  calloutTitle: { fontWeight: "700", fontSize: 13, color: "#1F2937", marginBottom: 2 },
  calloutDesc: { fontSize: 11, color: "#6B7280" },
  calloutDist: { fontSize: 11, color: "#FF5A00", fontWeight: "600", marginTop: 4 },
});
