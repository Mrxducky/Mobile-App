import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { COD_MACHINES, formatDistance } from "@/constants/machines";

const STORAGE_KEY = "shift_logs";

export interface VisitLog {
  id: string;
  machineId: number;
  machineTitle: string;
  timestamp: number;
  amount?: number;
  note?: string;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function groupByDate(logs: VisitLog[]) {
  const map = new Map<string, VisitLog[]>();
  for (const log of logs) {
    const key = formatDate(log.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([date, entries]) => ({
    date,
    entries,
  }));
}

export default function ShiftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<number>(1);
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState<number | null>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setLogs(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const saveLogs = useCallback((updated: VisitLog[]) => {
    setLogs(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const startShift = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShiftActive(true);
    setShiftStart(Date.now());
  }, []);

  const endShift = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("End Shift", "Are you sure you want to end this shift?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift",
        style: "destructive",
        onPress: () => {
          setShiftActive(false);
          setShiftStart(null);
        },
      },
    ]);
  }, []);

  const logVisit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const machine = COD_MACHINES.find((m) => m.id === selectedMachineId);
    if (!machine) return;
    const entry: VisitLog = {
      id: `${Date.now()}-${Math.random()}`,
      machineId: machine.id,
      machineTitle: machine.title,
      timestamp: Date.now(),
    };
    saveLogs([entry, ...logs]);
  }, [selectedMachineId, logs, saveLogs]);

  const deleteLog = useCallback(
    (id: string) => {
      Alert.alert("Delete Entry", "Remove this visit log?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => saveLogs(logs.filter((l) => l.id !== id)),
        },
      ]);
    },
    [logs, saveLogs]
  );

  const clearAll = useCallback(() => {
    Alert.alert("Clear All Logs", "This will delete all shift history. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => saveLogs([]),
      },
    ]);
  }, [saveLogs]);

  const todayLogs = logs.filter(
    (l) => formatDate(l.timestamp) === formatDate(Date.now())
  );
  const grouped = groupByDate(logs);

  // Shift duration display
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    if (!shiftActive || !shiftStart) return;
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - shiftStart) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [shiftActive, shiftStart]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Shift Summary
          </Text>
          {logs.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={[styles.clearText, { color: colors.destructive }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Shift status card */}
        <View
          style={[
            styles.shiftCard,
            {
              backgroundColor: shiftActive ? colors.primary : colors.card,
              shadowColor: shiftActive ? "#FF5A00" : colors.shadow,
            },
          ]}
        >
          <View style={styles.shiftCardTop}>
            <View>
              <Text
                style={[
                  styles.shiftStatus,
                  { color: shiftActive ? "#fff" : colors.mutedForeground },
                ]}
              >
                {shiftActive ? "Shift in Progress" : "No Active Shift"}
              </Text>
              {shiftActive && (
                <Text style={styles.shiftElapsed}>{elapsed}</Text>
              )}
              {!shiftActive && (
                <Text
                  style={[
                    styles.shiftIdleText,
                    { color: shiftActive ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                  ]}
                >
                  {todayLogs.length} visits today
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.shiftBtn,
                {
                  backgroundColor: shiftActive
                    ? "rgba(255,255,255,0.2)"
                    : colors.primary,
                },
              ]}
              onPress={shiftActive ? endShift : startShift}
            >
              <Feather
                name={shiftActive ? "square" : "play"}
                size={16}
                color="#fff"
              />
              <Text style={styles.shiftBtnText}>
                {shiftActive ? "End" : "Start Shift"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Today stats row */}
          {shiftActive && (
            <View style={styles.shiftStats}>
              <View style={styles.shiftStat}>
                <Text style={styles.shiftStatVal}>{todayLogs.length}</Text>
                <Text style={styles.shiftStatLabel}>Visits</Text>
              </View>
              <View style={[styles.shiftStatDiv]} />
              <View style={styles.shiftStat}>
                <Text style={styles.shiftStatVal}>
                  {new Set(todayLogs.map((l) => l.machineId)).size}
                </Text>
                <Text style={styles.shiftStatLabel}>Machines</Text>
              </View>
              <View style={styles.shiftStatDiv} />
              <View style={styles.shiftStat}>
                <Text style={styles.shiftStatVal}>
                  {shiftStart
                    ? `${Math.floor(
                        (Date.now() - shiftStart) / 60000
                      )} min`
                    : "—"}
                </Text>
                <Text style={styles.shiftStatLabel}>Duration</Text>
              </View>
            </View>
          )}
        </View>

        {/* Log visit section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Log a Visit
          </Text>
          <View
            style={[
              styles.logCard,
              { backgroundColor: colors.card, shadowColor: colors.shadow },
            ]}
          >
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>
              Select Machine
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.machineChips}
            >
              {COD_MACHINES.slice(0, 20).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedMachineId === m.id
                          ? colors.primary
                          : colors.muted,
                      borderColor:
                        selectedMachineId === m.id
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedMachineId(m.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          selectedMachineId === m.id
                            ? "#fff"
                            : colors.text,
                      },
                    ]}
                  >
                    #{m.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.logBtn,
                {
                  backgroundColor: shiftActive ? colors.primary : colors.muted,
                  opacity: shiftActive ? 1 : 0.6,
                },
              ]}
              onPress={shiftActive ? logVisit : undefined}
            >
              <Feather
                name="check-circle"
                size={17}
                color={shiftActive ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.logBtnText,
                  { color: shiftActive ? "#fff" : colors.mutedForeground },
                ]}
              >
                {shiftActive ? "Log Visit" : "Start shift to log"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* History */}
        {grouped.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Visit History
            </Text>
            {grouped.map(({ date, entries }) => (
              <View key={date}>
                <View style={styles.dateHeader}>
                  <Feather
                    name="calendar"
                    size={13}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.dateText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {date}
                  </Text>
                  <Text
                    style={[
                      styles.dateBadge,
                      { backgroundColor: colors.accent, color: colors.primary },
                    ]}
                  >
                    {entries.length} visit{entries.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                {entries.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    colors={colors}
                    onDelete={() => deleteLog(log.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {logs.length === 0 && (
          <View style={styles.empty}>
            <Feather name="clipboard" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No visits logged
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start a shift and tap "Log Visit" after each COD deposit.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function LogRow({
  log,
  colors,
  onDelete,
}: {
  log: VisitLog;
  colors: ReturnType<typeof useColors>;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.logRow,
        { backgroundColor: colors.card, shadowColor: colors.shadow },
      ]}
    >
      <View style={[styles.logDot, { backgroundColor: colors.primary }]} />
      <View style={styles.logInfo}>
        <Text style={[styles.logMachine, { color: colors.text }]}>
          {log.machineTitle}
        </Text>
        <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
          {formatTime(log.timestamp)}
        </Text>
      </View>
      <View
        style={[
          styles.logBadge,
          { backgroundColor: colors.accent },
        ]}
      >
        <Feather name="check" size={11} color={colors.success} />
        <Text style={[styles.logBadgeText, { color: colors.success }]}>
          Deposited
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 26 },
  clearText: { fontFamily: "Poppins_500Medium", fontSize: 13 },

  scroll: { padding: 16, gap: 8 },

  shiftCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  shiftCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftStatus: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  shiftElapsed: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    color: "#fff",
    letterSpacing: 1,
    marginTop: 2,
  },
  shiftIdleText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  shiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shiftBtnText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  shiftStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  shiftStat: { flex: 1, alignItems: "center" },
  shiftStatVal: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#fff",
  },
  shiftStatLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  shiftStatDiv: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },

  section: { gap: 10, marginTop: 8 },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },

  logCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  pickerLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  machineChips: { gap: 8, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logBtnText: { fontFamily: "Poppins_700Bold", fontSize: 15 },

  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 12,
  },
  dateText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, flex: 1 },
  dateBadge: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  logRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logInfo: { flex: 1 },
  logMachine: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  logTime: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 1 },
  logBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  deleteBtn: { padding: 4 },

  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: { fontFamily: "Poppins_700Bold", fontSize: 18 },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
