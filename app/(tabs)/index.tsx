import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import MapContainer from "@/components/MapContainer";
import {
  COD_MACHINES,
  CodMachine,
  formatDistance,
  getNearestMachines,
} from "@/constants/machines";
import {
  getDirections,
  getManeuverIcon,
  LatLng,
  RouteInfo,
  RouteStep,
} from "@/utils/directions";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PANEL_MIN = 90;
const PANEL_MAX = SCREEN_HEIGHT * 0.52;

interface MachineWithDist extends CodMachine {
  distance: number;
  eta: string;
}

type ActiveView = "machines" | "route";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();

  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [nearestMachines, setNearestMachines] = useState<MachineWithDist[]>([]);
  const [nearestMachine, setNearestMachine] = useState<MachineWithDist | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filteredMachines, setFilteredMachines] = useState(COD_MACHINES);
  const [locating, setLocating] = useState(false);
  const [panelIsOpen, setPanelIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("machines");

  // Route state
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const panelHeight = useRef(new Animated.Value(PANEL_MIN)).current;
  const lastY = useRef(PANEL_MIN);

  const openPanel = useCallback(
    (toMax = true) => {
      const target = toMax ? PANEL_MAX : PANEL_MIN;
      setPanelIsOpen(toMax);
      lastY.current = target;
      Animated.spring(panelHeight, {
        toValue: target,
        useNativeDriver: false,
        friction: 8,
      }).start();
    },
    [panelHeight]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panelHeight.stopAnimation((val) => {
          lastY.current = val;
        });
      },
      onPanResponderMove: (_, gs) => {
        const newH = Math.min(
          PANEL_MAX,
          Math.max(PANEL_MIN, lastY.current - gs.dy)
        );
        panelHeight.setValue(newH);
      },
      onPanResponderRelease: (_, gs) => {
        const newH = lastY.current - gs.dy;
        const target =
          newH > (PANEL_MIN + PANEL_MAX) / 2 ? PANEL_MAX : PANEL_MIN;
        setPanelIsOpen(target === PANEL_MAX);
        lastY.current = target;
        Animated.spring(panelHeight, {
          toValue: target,
          useNativeDriver: false,
          friction: 8,
        }).start();
      },
    })
  ).current;

  const requestLocation = useCallback(async () => {
    setLocating(true);
    try {
      if (Platform.OS === "web") {
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLocation({ latitude, longitude });
            setLocationError(false);
            const nearest = getNearestMachines(latitude, longitude, 10);
            setNearestMachines(nearest);
            setNearestMachine(nearest[0] ?? null);
            setLocating(false);
          },
          () => {
            setLocationError(true);
            setLocating(false);
          }
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(true);
        Alert.alert(
          "Location Required",
          "Please enable location access in Settings to find nearby COD machines.",
          [{ text: "OK" }]
        );
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });
      setLocationError(false);
      const nearest = getNearestMachines(latitude, longitude, 10);
      setNearestMachines(nearest);
      setNearestMachine(nearest[0] ?? null);
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        800
      );
    } catch {
      setLocationError(true);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!settings.gpsAutoRefresh || !userLocation || Platform.OS === "web")
      return;
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        const nearest = getNearestMachines(latitude, longitude, 10);
        setNearestMachines(nearest);
        setNearestMachine(nearest[0] ?? null);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [settings.gpsAutoRefresh, userLocation]);

  useEffect(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) {
      setFilteredMachines(COD_MACHINES);
      return;
    }
    setFilteredMachines(
      COD_MACHINES.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.id.toString().includes(q) ||
          `${m.latitude},${m.longitude}`.includes(q)
      )
    );
  }, [searchText]);

  const drawRouteTo = useCallback(
    async (machine: CodMachine) => {
      if (!userLocation) {
        Alert.alert("Location needed", "Enable GPS first to draw a route.");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRouteLoading(true);
      setActiveView("route");
      openPanel(true);

      const info = await getDirections(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        { latitude: machine.latitude, longitude: machine.longitude }
      );

      setRouteLoading(false);
      if (!info) {
        Alert.alert(
          "Route Error",
          "Could not fetch route. Check your internet connection."
        );
        setActiveView("machines");
        return;
      }

      setRouteInfo(info);
      setRouteCoords(info.polylineCoords);
      setActiveStep(0);

      if (mapRef.current && info.polylineCoords.length > 1) {
        mapRef.current.fitToCoordinates(info.polylineCoords, {
          edgePadding: {
            top: 120,
            right: 40,
            bottom: PANEL_MAX + 20,
            left: 40,
          },
          animated: true,
        });
      }
    },
    [userLocation, openPanel]
  );

  const clearRoute = useCallback(() => {
    Haptics.selectionAsync();
    setRouteCoords([]);
    setRouteInfo(null);
    setActiveView("machines");
    setActiveStep(0);
    openPanel(false);
  }, [openPanel]);

  const findNearest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!userLocation) {
      requestLocation();
      return;
    }
    if (!nearestMachine) return;
    setSelectedId(nearestMachine.id);
    mapRef.current?.animateToRegion(
      {
        latitude: nearestMachine.latitude,
        longitude: nearestMachine.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      900
    );
    openPanel(true);
  }, [userLocation, nearestMachine, requestLocation, openPanel]);

  const centerOnUser = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocating(true);
    try {
      if (Platform.OS === "web") {
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLocation({ latitude, longitude });
            setLocationError(false);
            const nearest = getNearestMachines(latitude, longitude, 10);
            setNearestMachines(nearest);
            setNearestMachine(nearest[0] ?? null);
            mapRef.current?.animateToRegion(
              { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
              600
            );
            setLocating(false);
          },
          () => { setLocationError(true); setLocating(false); }
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(true);
        setLocating(false);
        return;
      }
      // High-accuracy fresh fix every time the button is pressed
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });
      setLocationError(false);
      const nearest = getNearestMachines(latitude, longitude, 10);
      setNearestMachines(nearest);
      setNearestMachine(nearest[0] ?? null);
      // Zoom into street level (≈ 500 m visible)
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        700
      );
    } catch {
      setLocationError(true);
      Alert.alert("GPS Error", "Could not get your current location. Make sure location is enabled.");
    } finally {
      setLocating(false);
    }
  }, []);

  const openNavPicker = useCallback((lat: number, lng: number, title?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const wazeAppUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
    const wazeWebUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const appleMapsUrl = `maps://app?daddr=${lat},${lng}`;

    const openWaze = () => {
      if (Platform.OS === "web") {
        Linking.openURL(wazeWebUrl);
        return;
      }
      Linking.canOpenURL(wazeAppUrl).then((installed) =>
        Linking.openURL(installed ? wazeAppUrl : wazeWebUrl)
      );
    };

    const buttons: any[] = [];

    if (Platform.OS === "ios") {
      buttons.push({ text: "🍎 Apple Maps", onPress: () => Linking.openURL(appleMapsUrl) });
    }
    buttons.push({ text: "🗺 Google Maps", onPress: () => Linking.openURL(googleUrl) });
    buttons.push({ text: "🔵 Waze", onPress: openWaze });
    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert(
      "Navigate to " + (title ?? "COD Machine"),
      "Choose your navigation app:",
      buttons
    );
  }, []);

  const navigateToNearest = useCallback(() => {
    const target = nearestMachine ?? (nearestMachines[0] || null);
    if (!target) {
      Alert.alert("No machine found", "Enable GPS to find nearby machines.");
      return;
    }
    openNavPicker(target.latitude, target.longitude, target.title);
  }, [nearestMachine, nearestMachines, openNavPicker]);

  const navigateTo = useCallback((m: CodMachine) => {
    openNavPicker(m.latitude, m.longitude, m.title);
  }, [openNavPicker]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Layout from bottom:
  //  [panel PANEL_MIN] → [stats bar ~56px] → [FAB row: Find Nearest (center) + GPS/Nav (right)]
  const STATS_H = 56;
  const statsBottom = bottomPad + PANEL_MIN + 8;
  const fabRowBottom = statsBottom + STATS_H + 10;

  return (
    <View style={styles.container}>
      <MapContainer
        mapRef={mapRef}
        filteredMachines={filteredMachines}
        selectedId={selectedId}
        userLocation={userLocation}
        trafficEnabled={settings.trafficEnabled}
        satelliteEnabled={settings.satelliteEnabled}
        routeCoords={routeCoords}
        onMarkerPress={(id) => {
          setSelectedId(id);
          Haptics.selectionAsync();
        }}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View
          style={[
            styles.headerBar,
            { backgroundColor: colors.card, shadowColor: colors.shadow },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[styles.headerIcon, { backgroundColor: colors.primary }]}
            >
              <Feather name="map-pin" size={16} color="#fff" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Talabat COD Finder
            </Text>
          </View>
          {routeInfo && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: "#FFF0E8" }]}
              onPress={clearRoute}
            >
              <Feather name="x" size={15} color={colors.primary} />
              <Text style={[styles.clearBtnText, { color: colors.primary }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Route info banner / Search bar */}
        {routeInfo ? (
          <View
            style={[styles.routeBanner, { backgroundColor: colors.primary }]}
          >
            <View style={styles.routeBannerLeft}>
              <Feather name="navigation" size={16} color="#fff" />
              <View>
                <Text style={styles.routeBannerTitle}>
                  {routeInfo.durationText}
                </Text>
                <Text style={styles.routeBannerSub}>
                  {routeInfo.distanceText} · {routeInfo.steps.length} turns
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.routeExternalBtn}
              onPress={() => {
                const m = COD_MACHINES.find((x) => x.id === selectedId);
                if (m) navigateTo(m);
              }}
            >
              <Feather name="external-link" size={14} color="#fff" />
              <Text style={styles.routeExternalText}>Maps</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  fontFamily: "Poppins_400Regular",
                },
              ]}
              placeholder="Search by machine # or coordinates..."
              placeholderTextColor={colors.mutedForeground}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Stats card — pinned right above the panel, full width ── */}
      {!panelIsOpen && !routeInfo && (
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadow,
              bottom: statsBottom,
              left: 16,
              right: 16,
            },
          ]}
        >
          <StatItem
            label="Total"
            value={COD_MACHINES.length.toString()}
            icon="database"
            colors={colors}
          />
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <StatItem
            label="Nearest"
            value={
              nearestMachine ? formatDistance(nearestMachine.distance) : "—"
            }
            icon="navigation"
            colors={colors}
          />
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <StatItem
            label="GPS"
            value={userLocation ? "Active" : "Off"}
            icon="radio"
            colors={colors}
            valueColor={userLocation ? colors.success : colors.destructive}
          />
        </View>
      )}

      {/* ── Find Nearest FAB (centre, same row as GPS/Nav) ── */}
      {!routeInfo && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: fabRowBottom,
              alignSelf: "center",
            },
          ]}
          onPress={findNearest}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={17} color="#fff" />
          <Text style={styles.fabText}>Find Nearest Machine</Text>
        </TouchableOpacity>
      )}

      {/* ── Right-side FAB stack (same row as Find Nearest) ── */}
      <View
        style={[
          styles.fabStack,
          { bottom: fabRowBottom, right: 16 },
        ]}
      >
        {/* GPS / center-on-user */}
        <TouchableOpacity
          style={[
            styles.fabRound,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadow,
              borderColor: locationError ? colors.destructive : colors.primary,
            },
          ]}
          onPress={centerOnUser}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather
              name="crosshair"
              size={20}
              color={locationError ? colors.destructive : colors.primary}
            />
          )}
        </TouchableOpacity>

        {/* Navigate to nearest */}
        <TouchableOpacity
          style={[
            styles.fabRound,
            {
              backgroundColor: colors.primary,
              shadowColor: "#FF5A00",
            },
          ]}
          onPress={navigateToNearest}
          activeOpacity={0.8}
        >
          <Feather name="navigation" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Panel ── */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: panelHeight,
            backgroundColor: colors.card,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.panelHandle}>
          <View
            style={[styles.handleBar, { backgroundColor: colors.border }]}
          />

          {routeInfo ? (
            <View style={styles.panelTabRow}>
              <TouchableOpacity
                style={[
                  styles.panelTab,
                  activeView === "machines" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveView("machines")}
              >
                <Text
                  style={[
                    styles.panelTabText,
                    {
                      color:
                        activeView === "machines"
                          ? colors.primary
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  Machines
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.panelTab,
                  activeView === "route" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveView("route")}
              >
                <Feather
                  name="navigation"
                  size={13}
                  color={
                    activeView === "route"
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.panelTabText,
                    {
                      color:
                        activeView === "route"
                          ? colors.primary
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  Directions
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                Nearest Machines
              </Text>
              {nearestMachine && userLocation && (
                <Text
                  style={[styles.panelSub, { color: colors.mutedForeground }]}
                >
                  Closest: {formatDistance(nearestMachine.distance)} ·{" "}
                  {nearestMachine.eta}
                </Text>
              )}
            </>
          )}
        </View>

        {routeLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Fetching route...
            </Text>
          </View>
        )}

        {!routeLoading && activeView === "machines" && (
          <FlatList
            data={nearestMachines}
            keyExtractor={(m) => m.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.panelList}
            scrollEnabled={!!nearestMachines.length}
            renderItem={({ item, index }) => (
              <MachineCard
                item={item}
                index={index}
                selected={selectedId === item.id}
                colors={colors}
                onPress={() => {
                  setSelectedId(item.id);
                  Haptics.selectionAsync();
                  mapRef.current?.animateToRegion(
                    {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    },
                    600
                  );
                }}
                onNavigate={() => navigateTo(item)}
                onRoute={() => {
                  setSelectedId(item.id);
                  drawRouteTo(item);
                }}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather
                  name="map-pin"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Enable location to see nearby machines
                </Text>
              </View>
            }
          />
        )}

        {!routeLoading && activeView === "route" && routeInfo && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.panelList}
          >
            {routeInfo.steps.map((step, i) => (
              <DirectionStep
                key={i}
                step={step}
                index={i}
                isActive={i === activeStep}
                colors={colors}
                onPress={() => {
                  setActiveStep(i);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: step.startLocation.latitude,
                      longitude: step.startLocation.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    },
                    500
                  );
                }}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  icon,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  icon: string;
  colors: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon as any} size={14} color={colors.primary} />
      <Text style={[styles.statValue, { color: valueColor ?? colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function MachineCard({
  item,
  index,
  selected,
  colors,
  onPress,
  onNavigate,
  onRoute,
}: {
  item: MachineWithDist;
  index: number;
  selected: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onNavigate: () => void;
  onRoute: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.machineCard,
        {
          backgroundColor: selected ? colors.accent : colors.muted,
          borderColor: selected ? colors.primary : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.machineRank,
          {
            backgroundColor:
              index === 0 ? colors.primary : colors.secondary,
          },
        ]}
      >
        <Text style={styles.machineRankText}>{index + 1}</Text>
      </View>
      <View style={styles.machineInfo}>
        <Text style={[styles.machineName, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.machineDesc, { color: colors.mutedForeground }]}>
          {formatDistance(item.distance)} · {item.eta}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: colors.accent, borderColor: colors.primary },
        ]}
        onPress={onRoute}
      >
        <Feather name="navigation" size={13} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        onPress={onNavigate}
      >
        <Feather name="external-link" size={13} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function DirectionStep({
  step,
  index,
  isActive,
  colors,
  onPress,
}: {
  step: RouteStep;
  index: number;
  isActive: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.stepCard,
        {
          backgroundColor: isActive ? colors.accent : colors.muted,
          borderColor: isActive ? colors.primary : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.stepIconWrap,
          { backgroundColor: isActive ? colors.primary : colors.border },
        ]}
      >
        <Feather
          name={getManeuverIcon(step.maneuver) as any}
          size={14}
          color={isActive ? "#fff" : colors.mutedForeground}
        />
      </View>
      <View style={styles.stepInfo}>
        <Text
          style={[styles.stepInstruction, { color: colors.text }]}
          numberOfLines={2}
        >
          {step.instruction}
        </Text>
        <Text style={[styles.stepMeta, { color: colors.mutedForeground }]}>
          {step.distanceText} · {step.durationText}
        </Text>
      </View>
      <View
        style={[
          styles.stepNum,
          { backgroundColor: isActive ? colors.primary : "transparent" },
        ]}
      >
        <Text
          style={[
            styles.stepNumText,
            { color: isActive ? "#fff" : colors.mutedForeground },
          ]}
        >
          {index + 1}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 10,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  routeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  routeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeBannerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  routeBannerSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  routeExternalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  routeExternalText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, height: 22 },

  statsCard: {
    position: "absolute",
    flexDirection: "row",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 5,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Poppins_700Bold", fontSize: 15 },
  statLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, marginVertical: 4 },

  fab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 50,
    zIndex: 10,
    shadowColor: "#FF5A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },

  fabStack: {
    position: "absolute",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  fabRound: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },

  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
    zIndex: 20,
  },
  panelHandle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  handleBar: { width: 36, height: 4, borderRadius: 2, marginBottom: 10 },
  panelTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  panelSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  panelTabRow: { flexDirection: "row", width: "100%", marginBottom: 2 },
  panelTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
  },
  panelTabText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: { fontFamily: "Poppins_400Regular", fontSize: 13 },

  panelList: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },

  machineCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1.5,
  },
  machineRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  machineRankText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#fff" },
  machineInfo: { flex: 1 },
  machineName: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  machineDesc: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },

  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1.5,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInfo: { flex: 1 },
  stepInstruction: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  stepMeta: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: "Poppins_700Bold", fontSize: 11 },

  emptyState: { alignItems: "center", paddingVertical: 20, gap: 10 },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
